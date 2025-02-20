import download from 'download-git-repo'
import ora from 'ora';
import chalk from 'chalk';
export const clone = (url, path, options) => {
    console.log(`${chalk.blue('downloading template from ' + url)}`)
    const spinner = ora(`${chalk.green('downloading template from ' + url)}`).start();
    return new Promise((resolve, reject) => {
        download(url, path, options, (err) => {
            if (err) {
                reject(err)
                spinner.fail(chalk.red(`download failed: ${err}`))
            } else {
                resolve()
                spinner.succeed(chalk.green(`download success`))
            }
        })
    })

}