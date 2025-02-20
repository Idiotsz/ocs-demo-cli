import fs from "fs-extra"
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
export const appDir = () => fs.realpathSync(process.cwd()); // 命令行真实路径
export const getCurrentPath = (...dir) => {
    return path.resolve(appDir(), ...dir);
}

// 获取用户输入packageInfo
export const getDemoPkgInfo = async () => {
    let answers = await inquirer.prompt([
        {
            name: 'version',
            type: 'prompt',
            message: '请输入版本号:',
            default: '1.0.0'
        },
        {
            name: 'description',
            type: 'prompt',
            message: '请输入描述:',
            default: ''
        },
        {
            name: 'author',
            type: 'prompt',
            message: '请输入作者:',
            default: ''
        }
    ]).catch(e=> {
        console.log(chalk.red(e));
        return false;
    })
    if(!answers) {
        return false;
    }
    return answers;
}

export const rewriterPackageJson =  async (name, info) => {
    let spinner = ora("正在重写package.json...").start();
    try {
        let pkg = await fs.readJson(getCurrentPath(name) + "/package.json");
        pkg.name = name;
        for (let key in info) {
            pkg[key] = info[key];
        }
        await fs.writeJson(getCurrentPath(name) + "/package.json", pkg, {spaces: 2});
        spinner.succeed('package.json重写成功');

    } catch (error) {
        console.log(error);
        spinner.fail(chalk.redBright("重写package.json失败"), error);
    }
}

export const  getNowDate = (timestamp) => {
    let date = new Date();
    if(timestamp) {
        date = new Date(timestamp);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }