import shell from "shelljs";
import { getNowDate } from "./utils.js"
import chalk from "chalk";
import inquirer from "inquirer";

/**
 * 检查当前目录是否在一个 Git 仓库中
 * @returns {boolean} 是否在 Git 仓库中
 */
function isInGitRepository() {
    return shell.test('-d', '.git');
}
// 检查是否有未暂存的更改
function hasUnstagedChanges(output) {
    return output.includes('??') || output.includes(' M') || output.includes(' M ');
}

/**
 * 检查是否有已暂存但未提交的文件
 * @returns {boolean} 如果存在已暂存但未提交的文件，则返回 true，否则返回 false
 */
function hasStagedChanges(statusOutput) {
    // 执行 git status --porcelain 命令并获取输出

    // 如果输出为空，则表示没有已暂存的更改
    if (!statusOutput) {
        return false;
    }

    // 解析输出，检查是否有已暂存的更改
    // 每一行的第一个字符表示文件状态，'M' 表示修改，'A' 表示新增，等等
    // 如果第一个字符是 'M' 或 'A' 或其他表示已暂存的字符，则存在已暂存但未提交的文件
    const lines = statusOutput.split('\n');
    for (let line of lines) {
        if (line.trim() && (line[0] === 'M' || line[0] === 'A')) {
            return true;
        }
    }

    // 如果没有找到任何已暂存的更改，则返回 false
    return false;
}

// 检查当前分支是否已经推送
function isPushed(output) {
    return !output.includes('[ahead');
}
/**
 * 获取 Git 状态信息
 * @returns {object} 包含各种状态信息的对象
 */
function getGitStatus() {
    const status = {
        isClean: true, // 是否干净
        hasStagedChanges: false, // 是否有暂存的更改，但未提交的
        hasUnstagedChanges: false, // 是否有未暂存的更改
        // hasUncommittedChanges: false, // 是否有未提交的更改
        isAhead: false, // 是否领先于远程
        isBehind: false, // 是否落后于远程
        hasMergeConflicts: false, // 是否有合并冲突
    };

    if (!isInGitRepository()) {
        console.log('当前目录不是一个 Git 仓库。');
        return status;
    }

    // 获取简要状态
    const statusOutput = shell.exec('git status --porcelain', { silent: true }).stdout;
    console.log(statusOutput, "status")

    if (statusOutput) {
        status.isClean = false;

        // 检查是否有暂存或未暂存的更改
        const stagedLines = statusOutput.match(/^\s*[AM]\s+/m) || [];
        const unstagedLines = statusOutput.match(/^\s*[MARC]\s+/m) || [];
        const untrackedLines = statusOutput.match(/^\??\s+/m) || [];

        status.hasStagedChanges =  hasStagedChanges(statusOutput) // stagedLines.length > 0;
        status.hasUnstagedChanges = hasUnstagedChanges(statusOutput) // unstagedLines.length > 0 || untrackedLines.length > 0;
        // status.hasUncommittedChanges = status.hasStagedChanges || status.hasUnstagedChanges;
        // 是否有已暂存的更改

    }

    // 检查是否有合并冲突
    const mergeConflicts = shell.exec('git diff --name-only --diff-filter=U', { silent: true }).stdout;
    status.hasMergeConflicts = mergeConflicts.trim().length > 0;

    // 检查本地是否领先或落后于远程
    const branchName = shell.exec('git symbolic-ref --short HEAD', { silent: true }).stdout.trim();
    if (branchName) {
        const aheadBehind = shell.exec(`git rev-list --left-right --count origin/${branchName}...`, { silent: true }).stdout.trim();
        if (aheadBehind) {
            const [behind, ahead] = aheadBehind.split(/\s+/).map(Number);
            status.isAhead = ahead > 0;
            status.isBehind = behind > 0;
        }
    }
    console.log(`- isClean-是否干净: ${status.isClean}`);
    console.log(`- hasStagedChanges-是否有暂存的更改: ${status.hasStagedChanges}`);
    console.log(`- hasUnstagedChanges-是否有未暂存的更改: ${status.hasUnstagedChanges}`);
    // console.log(`- hasUncommittedChanges-是否有未提交的更改，包括未暂存和未提交的: ${status.hasUncommittedChanges}`);
    console.log(`- isAhead-是否领先于远程: ${status.isAhead}`);
    console.log(`- isBehind-是否落后于远程: ${status.isBehind}`);
    console.log(`- hasMergeConflicts-是否有合并冲突: ${status.hasMergeConflicts}`);

    return status;
}

export const gitHandle = async (name, options) => {
    const username = shell.exec('git config user.name', { silent: true }).stdout.trim();
    let { message, add, push } = options;
    let commitMessage = message || '';
    if (commitMessage.length < 10) {
        commitMessage = commitMessage.padEnd(10, '*');
    }
    const timestamp = getNowDate();
    const fullMessage = `@${username}@${commitMessage}@${timestamp}`;


    let gitStatus = getGitStatus(); // 获取工作区状态

    if (add && gitStatus.hasUnstagedChanges) {
        shell.exec('git add .', { silent: true });
        console.log(chalk.greenBright('暂存成功！'));
    }else {
        console.log(chalk.greenBright('无需暂存'));
    }

    if (gitStatus.hasStagedChanges) {
        // 如果有已暂存，未提交的，就提交以下
        const commitResult = shell.exec(`git commit -m "${fullMessage}"`, { silent: true });
        if (commitResult.code !== 0) {
            console.log(chalk.red('提交失败，请检查是否有未暂存的更改。'));
            return;
        }else {
            console.log(chalk.greenBright('提交成功！'));
        }
    }

    if (!push) {
        // 如果不需要提交，直接退出
        return;
    }


    if (gitStatus.isBehind) {
        // 询问是否要拉取代码
        let answers = await inquirer.prompt([
            {
                type: "confirm",
                name: "isPullAndMerge",
                message: "落后远端，是否尝试拉取代码并自动提交？",
                default: false
            }
        ]).catch(e => {
            console.log(chalk.red(e))
            return false;
        })

        if (!answers || !answers.isPullAndMerge) {
            return;
        }
        if (!answers.isPullAndMerge) {
            return;
        }
        const pullResult = shell.exec(`git pull `, { silent: true })
        if (pullResult.code !== 0) {
            console.log(chalk.red('拉取新代码失败'))
            return;
        }else {
            onsole.log(chalk.greenBright('更新成功'))
        }
        gitStatus = getGitStatus();
        if (gitStatus.hasMergeConflicts) {
            console.log(chalk.red('存在合并冲突，请先解决冲突后再提交。'))
            return;
        }
        // 没有冲突，提交了
        const pushResult = shell.exec('git push', { silent: true });
        if (pushResult.code !== 0) {
            console.log(chalk.red('推送至远端失败，请检查网络或权限。或手动提交'));
            return;
        }

    }
    // 没有冲突，提交了
    const pushResult = shell.exec('git push', { silent: true });
    if (pushResult.code !== 0) {
        console.log(chalk.red('推送至远端失败，请检查网络或权限。或手动提交'));
        return;
    }else {
        console.log(chalk.greenBright('推送至远端成功！'));
    }

}
