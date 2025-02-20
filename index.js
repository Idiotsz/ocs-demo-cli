#! /usr/bin/env node
import ora from "ora";
import chalk from "chalk";
import figlet from "figlet";
import { clone } from "./clone.js";
import { program } from "commander";
import { templates } from "./constants.js";
import { table } from 'table';

import fs from "fs-extra";
import {createApp} from "./createApp.js";
import shell from "shelljs"
import {gitHandle} from "./gitAction.js"


const pkg = fs.readJSONSync("./package.json");





// clone('direct:https://gitee.com/idiots/lemon-im.git#main', 'test/tmp', {clone: true})


program.version(pkg.version, '-v, --version')
program
	.name('ocs-cli')
	.description('A CLI tool for ocs')
	.on('--help', () => {
		console.log("\r\n" + chalk.greenBright.bold(figlet.textSync("ocs-cli", {
			font: "Standard",
			horizontalLayout: "default",
			verticalLayout: "default",
			width: 80,
			whitespaceBreak: true,
		})))
	})

program
	.command('list')
	.description('list all templates')
	.action(() => {
		console.log(table([...templates.map(v => {
			return [v.name, v.value, v.desc]
		})]))
	})


program
	.command('create <app-name>')
	.description('create a new project from a template')
	.option('-t, --template <template>', '输入模板名称创建项目')
	.action(async function (name, option) {
		createApp(name, option);
	})


// 自动提交
program
	.command('commit [message]')
	.option('-m, --message [message]', '提交信息')
	.option('-a, --add [add]', '是否暂存所有文件')
	.option('-p, --push [push]', '是否暂存所有文件')

	.action(async function (message, options) {
		console.log(options)
		if(!shell.which("git")) {
			shell.echo('Sorry, this script requires git');
			shell.exit(1);
			return;
		}
		gitHandle(message, options)
		
	})
program.parse(process.argv);