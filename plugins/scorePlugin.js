// 默认评分插件
exports.defaultScorePlugin = function (analysisContext) {
  let score = 100;
  let message = []

  const { pluginsQueue, browserQueue, importItemMap, parseErrorInfos } = analysisContext;
  const mapNames = pluginsQueue.map(item => item.mapName).concat(browserQueue.map(item => item.mapName))
  // 黑名单API扣分处理
  mapNames.forEach(item => {
    Object.keys(analysisContext[item]).forEach(sitem => {
      if(analysisContext[item][sitem].isBlack) {
        score -= 5
        message.push(sitem + ' 属于黑名单api，请勿使用')
      }
    })
  });
  // ImportItem扣分处理
  Object.keys(importItemMap).forEach(item => {
    if(importItemMap[item].callOrigin === '*') {
      score -= 2;
      message.push('import * as ' + item + ' 属于非建议导入方式，建议修改')
    }
  })
  // BrowerAPI扣分处理
  Object.keys(analysisContext['browserMap']).forEach(item => {
    let keyName = ''
    if(item.split('.').length > 0) {
      keyName = item.split(".")[0]
    }else{
      keyName = item
    }
    if(keyName === 'window') {
      score -= 2
      message.push(item + ' 属于全局类型api，建议评估影响谨慎使用')
    }
    if(keyName === 'document') {
      score -= 2
      message.push(item + ' 属于Dom类型操作api，建议评估影响谨慎使用')
    }
    if(keyName === 'location' || keyName === 'history') {
      score -= 2
      message.push(item + ' 属于路由类操作，建议评估影响谨慎使用')
    }
  })
  // 解析AST失败或执行分析出发异常的扣分处理
  if(parseErrorInfos.length > 0) {
    score -= 3*parseErrorInfos.length
    message.push(parseErrorInfos.length + ' 个文件解析&分析AST时发生错误，请修复')
  }

  return {
    score,
    message
  }
}