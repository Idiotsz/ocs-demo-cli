import shell from "shelljs";
import {getNowDate} from "./utils.js"
import chalk from "chalk";
import inquirer from "inquirer";

/**
 * 检查当前目录是否在一个 Git 仓库中
 * @returns {boolean} 是否在 Git 仓库中
 */
function isInGitRepository() {
    return shell.test('-d', '.git');
}

/**
 * 获取 Git 状态信息
 * @returns {object} 包含各种状态信息的对象
 */
function getGitStatus() {
    const status = {
        isClean: true, // 是否干净
        hasStagedChanges: false, // 是否有暂存的更改
        hasUnstagedChanges: false, // 是否有未暂存的更改
        hasUncommittedChanges: false, // 是否有未提交的更改
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

    if (statusOutput) {
        status.isClean = false;

        // 检查是否有暂存或未暂存的更改
        const stagedLines = statusOutput.match(/^\s*[AM]\s+/m) || [];
        const unstagedLines = statusOutput.match(/^\s*[MARC]\s+/m) || [];
        const untrackedLines = statusOutput.match(/^\??\s+/m) || [];

        status.hasStagedChanges = stagedLines.length > 0;
        status.hasUnstagedChanges = unstagedLines.length > 0 || untrackedLines.length > 0;
        status.hasUncommittedChanges = status.hasStagedChanges || status.hasUnstagedChanges;
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

    if(add) {
        shell.exec('git add .', { silent: true });
    }
    let gitStatus = getGitStatus(); // 获取工作区状态

    if(gitStatus.hasUnstagedChanges) {
        // 如果有未暂存的提交，就提交以下
        const commitResult = shell.exec(`git commit -m "${fullMessage}"`, { silent: true });
        if (commitResult.code !== 0) {
            console.log(chalk.red('提交失败，请检查是否有未暂存的更改。'));
            return;
        }
    }

    if(!push) {
        // 如果不需要提交，直接退出
        return;
    }

    console.log('Git 工作区状态:', fullMessage);
    console.log(`- 是否干净: ${gitStatus.isClean}`);
    console.log(`- 是否有暂存的更改: ${gitStatus.hasStagedChanges}`);
    console.log(`- 是否有未暂存的更改: ${gitStatus.hasUnstagedChanges}`);
    console.log(`- 是否有未提交的更改: ${gitStatus.hasUncommittedChanges}`);
    console.log(`- 是否领先于远程: ${gitStatus.isAhead}`);
    console.log(`- 是否落后于远程: ${gitStatus.isBehind}`);
    console.log(`- 是否有合并冲突: ${gitStatus.hasMergeConflicts}`);
    if(gitStatus.isBehind) {
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

        if(!answers || !answers.isPullAndMerge) {
            return;
        }
        if(!answers.isPullAndMerge) {
            return;
        }
        const pullResult = shell.exec(`git pull `, {silent: true})
        if(pullResult.code !== 0) {
            console.log(chalk.red('拉取新代码失败'))
            return;
        }
        gitStatus = getGitStatus();
        if(gitStatus.hasMergeConflicts) {
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

}