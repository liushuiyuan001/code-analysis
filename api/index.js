const path = require('path');
const fs = require('fs');
const codeAnalysis = require(path.join(__dirname, '../lib/index'))

const analysis = async function(options) {
  if(options) {
    if(!Array.isArray(options.scanSource) || options.scanSource.length === 0) {
      Promise.reject(new Error('error: scanSource参数不能为空'))
      return
    }
    let isParamsError = false;
    let isCodePathError = false;
    let unExisDir = ''
    for(let i = 0; i < options.scanSource.length; i++) {
      if(!options.scanSource[i].name || !Array.isArray(options.scanSource[i].path) || options.scanSource[i].path === 0) {
        isParamsError = true;
        break
      }
      let innerBreak = false
      const tempPath = options.scanSource[i].path
      for(let j = 0; j < tempPath.length; j++) {
        const p = path.join(process.cwd(), tempPath[i])
        if(!fs.existsSync(p)) {
          isCodePathError = true
          unExisDir = tempPath[i]
          innerBreak = true
          break
        }
      }
      if(innerBreak) break
    }
    if(isParamsError) {
      Promise.reject(new Error('error: scanSource参数必填属性不能为空'))
      return
    }
    if(isCodePathError) {
      Promise.reject(new Error(`error: ${unExisDir}路径错误`))
      return
    }
    if(!options.analysisTarget) {
      Promise.reject(new Error('error: analysisTarget参数不能为空'))
      return
    }
  } else {
    Promise.reject(new Error('error: 缺少options'))
    return
  }

  try {
    const { report, diagnosisInfos } = await codeAnalysis(options)
    return Promise.resolve({
      report,
      diagnosisInfos
    })
  } catch (error) {
    return Promise.reject(error.stack)
  }
}

const config = {
  analysisTarget: 'react',
  scorePlugin: 'default',
  browserApis: ['window','document','history','location'],                // 可选，要分析的BrowserApi，默认为空数组
  scanSource: [{
    name: "test",
    httpRepo: '11',
    path: ['test'],
  }]
}
analysis(config)

module.exports = analysis;