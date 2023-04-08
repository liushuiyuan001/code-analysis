const path = require('path');
const ora = require('ora');
const chalk = require('chalk');
const dayjs = require('dayjs');
const CodeAnalysis = require(path.join(__dirname, "./analysis"))

const codeAnalysis = function (options) {
  return new Promise((resolve, reject) => {
    const spinner = ora(chalk.green('analysis start')).start();
    try {
      // 新建分析实例
      const coderTask = new CodeAnalysis(options)
      // 执行代码分析
      coderTask.analysis()
      // 生成报告内容
      const mapNames = coderTask.pluginsQueue.map(item => item.mapName).concat(coderTask.browserQueue.map(item => item.mapName))
      const report = {
        scoreMap: coderTask.scoreMap,
        reportTitle: options.reportTitle || '检测报告',
        analysisTime: dayjs().format('YYYY-MM-DD hh-mm:ss'),
        importItemMap: coderTask.importItemMap,
        mapNames: mapNames
      }
      mapNames.forEach(item => {
        report[item] = coderTask[item]
      });
      const result = {
        report,
        diagnosisInfos: coderTask.diagnosisInfos,
      }
      resolve(result)
      console.log({result})
      spinner.succeed(chalk.green('analysis success'))
    } catch (e) {
      reject(e);
      spinner.fail(chalk.red("analysis fail"))
    }
  })
}

module.exports = codeAnalysis;