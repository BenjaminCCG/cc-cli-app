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
