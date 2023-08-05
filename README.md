---
theme: juejin
---

日常开发中，你们是怎么样来统一自己的前端基础架构的呢？目前我们公司还是在 gitlab 上建一个基础的模板仓库，然后再 clone 到本地进行开发，这样的话仓库可能要关联多个 git 远程，万一操作失误可就难办了，而且也没有办法做一些定制化的设定。

接下来，几分钟让你掌握打造一个类似于 vue-cli、create-react-app 的脚手架工具，每次开发新项目直接 init 一下就好啦!

## 1. 项目初始化

首先，创建文件夹，包名自定义，这里我新建文件夹 cc-cli-app

```js
cd cc-cli-app
pnpm init
```

init 后根目录创建包 bin，新建文件 index.js

修改 package.json 文件，添加

```js
{
    ...,
    "type": "module",
    "bin":{
        //这里的cc-cli可以换成任何你自己想设定的npm命令 注意别和其他冲突即可
        "cc-cli": "./bin/index.js"
    }
}
```

## 2. 安装相关插件

这里我们直接一次性安装所有需要的包

```js
pnpm add command-line-args command-line-usage chalk prompts ora download-git-repo
```

## 3. 编写脚本

首先，我们先定义执行环境，以及 npm link 下方便调试

在 bin 下的 index.js 输入如下

```js
#! /usr/bin/env node

console.log("hello cli");
```

终端执行

```js
npm link
```

之后我们在终端输入 cc-cli，会发现 hello cli 输出出来了

(这里的 cc-cli 是你在 package.json 中定义的指令，后续不再重复)

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/036761af77a742dbb6f8a83bc362255a~tplv-k3u1fbpfcp-watermark.image?)

在 bin/index.js 引入之前安装的包

```js
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import chalk from "chalk";
import prompts from "prompts";
import ora from "ora";
import download from "download-git-repo";
import fs from "fs";
```

接下来，一个个告诉你这些作用都是什么

### commandLineArgs

通过预设一些参数，让我们能正常的接收到期望得到的数据进行后续处理

```js
const argOptions = [
  { name: "version", alias: "v", type: Boolean },
  { name: "name", type: String },
  { name: "age", type: Number },
];

console.log(commandLineArgs(argOptions));
```

这时，执行的命令后面加上 --[name] 参数

若在预设的 options 内，则会正确打印，否则抛出错误
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0a145e8d9ebd46d297f859326f482d49~tplv-k3u1fbpfcp-watermark.image?)

### commandLineUsage

commandLineUsage 可以添加帮助说明，让其他不熟悉我们脚手架的小伙伴尽快上手。
这里我们继续修改 bin/index.js

```js
const argOptions = [
  { name: "help", alias: "h", type: Boolean },
  { name: "version", alias: "v", type: Boolean },
  { name: "name", type: String },
  { name: "age", type: Number },
];

const helpSections = [
  {
    header: "cc-cli",
    content: "一个快速生成开发环境的脚手架",
  },
  {
    header: "Options",
    optionList: [
      {
        name: "version",
        typeLabel: "{underline boolean}",
        description: "版本号",
      },
      {
        name: "name",
        typeLabel: "{underline string}",
        description: "姓名",
      },
      {
        name: "age",
        typeLabel: "{underline number}",
        description: "年龄",
      },
    ],
  },
];

const options = commandLineArgs(argOptions);

if (options.help) {
  console.log(commandLineUsage(helpSections));
}
```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b3cc7c96320e4b3399e5166511d6044f~tplv-k3u1fbpfcp-watermark.image?)

### 关键内容

剩下的几个插件这里简单介绍下，接下来在代码中会更好地体现
chalk：自定义终端输出文本的颜色，比如 log 的内容包上 chalk.green(xxx)，输出的则是绿色的文本啦
prompts：可以对我们脚手架做一些自定义的设置，类似 vue-cli 初始化时设置是否需要 ts、router 这样
download-git-repo: 下载远程 git 仓库到本地
ora：在下载时提供 loading 展示

这里，我们首先配置下在初始化项目时需要进行哪些设定

```js
// 更多type设置可去prompts文档查看
const promptsOptions = [
  {
    type: "text", // 输入
    name: "name",
    message: "项目名称",
    validate(val) {
      if (!val) return "模板名称不能为空！";
      if (fs.existsSync(val)) return "项目名已存在";
      if (val.match(/[^A-Za-z0-9\u4e00-\u9fa5_-]/g))
        return "模板名称包含非法字符，请重新输入";
      return true;
    },
  },

  {
    type: "select", // 单选
    name: "template",
    message: "选择来源",
    choices: [
      { title: "gitee", value: 1 },
      { title: "github", value: 2 },
    ],
  },
];

const getInputInfo = async () => {
  const res = await prompts(promptsOptions);
  console.log(res);
};

getInputInfo();
```

打印输入的结果返回

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9238dcd0a1ca4e0194c1ebb8b89ded9f~tplv-k3u1fbpfcp-watermark.image?)

那么接下来，我们可以根据返回的结果做一些自定义的处理
比如说下载远程仓库

首先编写 gitClone 函数

```js
const gitClone = (remote, name, option) => {
  // 这里通过ora开启loading状态
  const downSpinner = ora("正在下载模板...").start();
  return new Promise((resolve, reject) => {
    download(remote, name, option, (err) => {
      if (err) {
        downSpinner.fail();
        console.log("err", chalk.red(err));
        reject(err);
        return;
      }
      // 下载完成后关闭loading，chalk改变提示文本颜色
      downSpinner.succeed(chalk.green("模板下载成功！"));
      console.log(`Done. Now run:\r\n`);
      console.log(chalk.green(`cd ${name}`));
      console.log(chalk.blue("npm install"));
      console.log("npm run dev\r\n");
      resolve();
    });
  });
};
```

设置远程仓库地址以及分支

```js
const remoteList = {
  1: "https://gitee.com/theGreatWallCCG/vue3-template-cli.git",
  2: "https://github.com/BenjaminCCG/vue3-template-cli.git",
};
const branch = "main";
```

修改 getInputInfo 函数

```js
const getInputInfo = async () => {
  const res = await prompts(promptsOptions);
  if (!res.name || !res.template) return;
  gitClone(`direct:${remoteList[res.template]}#${branch}`, res.name, {
    clone: true,
  });
};
```

此时新建个目录，终端执行 cc-cli

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/28082ced0aa34056a9dfe8998cc299ed~tplv-k3u1fbpfcp-watermark.image?)

大功告成！！！

### 发布 npm

接下来终端执行 `npm login` 输入自己的 npm 账号密码，没有的自行注册

然后执行 `npm publish` 进行发布

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/704d6ada757a432e9ae0d5fc77dbbf05~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/71257a71a2714f3281a9054a0324db4a~tplv-k3u1fbpfcp-watermark.image?)

这样你的小伙伴就可以执行 `npm i cc-cli-app -g` 去使用你开发的脚手架啦

## 完整代码

```js
#! /usr/bin/env node
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import chalk from "chalk";
import prompts from "prompts";
import ora from "ora";
import download from "download-git-repo";
import fs from "fs";

const argOptions = [
  { name: "help", alias: "h", type: Boolean },
  { name: "version", alias: "v", type: Boolean },
  { name: "init", type: Boolean },
];

const helpSections = [
  {
    header: "cc-cli",
    content: "一个快速生成开发环境的脚手架",
  },
  {
    header: "Options",
    optionList: [
      {
        name: "version",
        typeLabel: "{underline boolean}",
        description: "版本号",
      },
      {
        name: "init",
        typeLabel: "{underline boolean}",
        description: "初始化",
      },
    ],
  },
];

const options = commandLineArgs(argOptions);

if (options.help) {
  console.log(commandLineUsage(helpSections));
}

const promptsOptions = [
  {
    type: "text", // 输入
    name: "name",
    message: "项目名称",
    validate(val) {
      if (!val) return "模板名称不能为空！";
      if (fs.existsSync(val)) return "项目名已存在";
      if (val.match(/[^A-Za-z0-9\u4e00-\u9fa5_-]/g))
        return "模板名称包含非法字符，请重新输入";
      return true;
    },
  },

  {
    type: "select", // 单选
    name: "template",
    message: "选择来源",
    choices: [
      { title: "gitee", value: 1 },
      { title: "github", value: 2 },
    ],
  },
];

const gitClone = (remote, name, option) => {
  const downSpinner = ora("正在下载模板...").start();
  return new Promise((resolve, reject) => {
    download(remote, name, option, (err) => {
      if (err) {
        downSpinner.fail();
        console.log("err", chalk.red(err));
        reject(err);
        return;
      }
      downSpinner.succeed(chalk.green("模板下载成功！"));
      console.log(`Done. Now run:\r\n`);
      console.log(chalk.green(`cd ${name}`));
      console.log(chalk.blue("npm install"));
      console.log("npm run dev\r\n");
      resolve();
    });
  });
};

const remoteList = {
  1: "https://gitee.com/theGreatWallCCG/vue3-template-cli.git",
  2: "https://github.com/BenjaminCCG/vue3-template-cli.git",
};
const branch = "main";

const getInputInfo = async () => {
  const res = await prompts(promptsOptions);
  if (!res.name || !res.template) return;
  gitClone(`direct:${remoteList[res.template]}#${branch}`, res.name, {
    clone: true,
  });
};

getInputInfo();
```
