#!/usr/bin/env node
const program = require('commander');
const path = require('path')
const fs = require('fs')
const chalk = require('chalk');
const { VUETEMPTSDIR } = require('../lib/constant');
const { writeReport, writeDiagnosisReport } = require(path.join(__dirname,'../lib/report'))
const { REPORTDEFAULTDIR, VUETEMPSDIR } = require(path.join(__dirname, '../lib/constant'))
const { mkDir, rmDir } = require(path.join(__dirname, '../lib/file'))
const codeAnalysis = require(path.join(__dirname, '../lib/index'))

program
  .command('analysis')
  .description('analysis code and echo report')
  .action(async() => {
    try {
      const configPath = path.join(process.cwd(), './analysis.config.js');
      const isConfig = fs.existsSync(configPath)
      if(!isConfig) {
        console.log(chalk.red('error: 缺少analysis.config.js配置文件'))
        return
      }
      const config = require(configPath)
      if(!Array.isArray(config.scanSource) || config.scanSource.length <= 0) {
        console.log(chalk.red('error: 缺少scanSource配置'))
        return
      }
      let isParamError = false
      let isCodePathError = false
      let unExisDir = ''
      for(let i = 0; i < config.scanSource[i]; i++) {
        if(!config.scanSource[i].name || !Array.isArray(config.scanSource[i].path) || config.scanSource[i].path.length === 0) {
          isParamError = true
          break
        }
        let innerBreak = false
        const tempPathArr = config.scanSource[i].path

        for(let j = 0; j < tempPathArr.length; j++) {
          const tempPath = path.join(process.cwd(), tempPathArr[j])
          if(!fs.existsSync(tempPath)) {
            isCodePathError = true
            unExisDir = tempPathArr[j]
            innerBreak = true
            break
          }
        }

        if(innerBreak) break
      }
      if(isParamError) {
        console.log(chalk.red('error: scanSource必填参数不能为空'))
        return
      }
      if(isCodePathError) {
        console.log(chalk.red(`error: 配置文件中待分析文件目录${unExisDir}不存在`))
        return
      }
      if(!config.analysisTarget) {
        console.log(chalk.red('error: analysisTarget必填参数不能为空'))
        return
      }

      try {
        // 如果分析报告目录已经存在，则先删除目录
        rmDir(config.reportDir || REPORTDEFAULTDIR)
        // 如果temp目录已经存在 则先删除目录
        // rmDir(VUETEMPSDIR)
        // 如果需要扫码vue文件，创建temp目录
        if(config.isScanVue){
          mkDir(VUETEMPTSDIR)
        }
        // 分析代码
        const { report, diagnosisInfos } = await codeAnalysis(config)
        // 输出分析报告
        writeReport(config.reportDir || 'report', report)
        // 输出诊断报告
        writeDiagnosisReport(config.reportDir || 'report', diagnosisInfos)
        // 删除temp目录
        // rmDir(VUETEMPTSDIR)

        if(config.scorePlugin) {
          console.log(chalk.green('\n' + '代码得分：' + report.scoreMap.score))
          if(report.scoreMap.message.length > 0) {
            console.log(chalk.yellow('\n' + '优化建议：'))
            report.scoreMap.message.forEach((element, index) => {
              console.log(chalk.yellow((index + 1) + '. ' + element))
            })
          }
        }
      } catch (e) {
        // rmDir(VUETEMPSDIR)
        console.log(chalk.red(e.stack))
        process.exit(1)
      }
    } catch (error) {
      console.log(chalk.red(error.stack))
    }
  })

program.parse(process.argv)