import { templates } from "./constants.js";
import fs from "fs-extra";
import { clone } from "./clone.js";
// await clone("yingside/webpack-template", "test/vue-cli-temp");
import ora from "ora"
import chalk from "chalk";
import shell from "shelljs"
import { getCurrentPath, getDemoPkgInfo, rewriterPackageJson } from "./utils.js"
import inquirer from 'inquirer';


export const createApp = async (name, options) => {
    console.log(name, options);
    let {template} = options;
    if (!shell.which("git")) { 
        console.log(chalk.redBright("对不起,运行脚本必须先安装git"));
        shell.exit(1);
        return;
    }
    // 判断当前文件目录是否存在，如果
    let existsSameDir = fs.existsSync(getCurrentPath(name));
    let forceRemove = false;

    if(existsSameDir) {
        // 存在目录，询问是否强制覆盖
        let answers = await inquirer.prompt([
            {
                type: "confirm",
                name: "isForce",
                message: "当前目录已存在，是否强制覆盖？",
                default: false
            }
        ]).catch(e => {
            console.log(chalk.red(e))
            return false;
        })

        if(!answers || !answers.isForce) {
            return;
        }
        forceRemove = answers.isForce;
    }
    let active = null;
    if(template) {
        active = templates.find(item => item.name === template);
    }else {
        let answers = await inquirer.prompt([{
            message: '请选择一种模板:',
            name: 'template',
            type: 'list',
            choices: templates
        }]).catch(e => {
            console.log(e)
            return false;
        })
        if(!answers) {
            return;
        }
        active = templates.find(v => v.value === answers.template)
        console.log(answers, "-----")
    }
    if(!active) {
        console.log(chalk.red(`${template} 【template】 is not exist.`));
        return;
    }
    let info = await getDemoPkgInfo(); // 获取用户输入的package.json中的一些信息，用来后面重写package.json
    try {
        await clone(active.value, name)
        // 下载成功之后，重写项目package.json中的一些name，version等信息
        rewriterPackageJson(name, info)
    }catch(e) {
        console.log(chalk.red(`clone ${active.value} error.`), e)
    }

};