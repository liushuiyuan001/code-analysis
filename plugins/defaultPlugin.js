exports.defaultPlugin = function (analysisContext) {
  const mapName = 'apiMap'
  // 在分析实例上下文挂载副作用
  analysisContext[mapName] = {}

  function isApiCheck (context, tsCompiler, node, depth, apiName, matchImportItem, filePath, projectName, httpRepo, lineNumber) {
    try {
      if(!context[mapName][apiName]) {
        context[mapName][apiName] = {}
        context[mapName][apiName].callNum = 1;
        context[mapName][apiName].callOrigin = matchImportItem.origin;
        context[mapName][apiName].callFiles = {}
        context[mapName][apiName].callFiles[filePath] = {}
        context[mapName][apiName].callFiles[filePath].projectName = projectName;
        context[mapName][apiName].callFiles[filePath].httpRepo = httpRepo;
        context[mapName][apiName].callFiles[filePath].lines = []
        context[mapName][apiName].callFiles[filePath].lines.push(line);
      } else {
        context[mapName][apiName].callNum++;
        if (!Object.keys(context[mapName][apiName].callFiles).includes(filePath)) {
          context[mapName][apiName].callFiles[filePath] = {}
          context[mapName][apiName].callFiles[filePath].projectName = projectName;
          context[mapName][apiName].callFiles[filePath].httpRepo = httpRepo;
          context[mapName][apiName].callFiles[filePath].lines = []
          context[mapName][apiName].callFiles[filePath].lines.push(line);
        } else {
          context[mapName][apiName].callFiles[filePath].lines.push(line);
        }
      }
      return true; // 命中规则，终止执行后续插件
    } catch (error) {
      const info = {
        projectName: projectName,
        matchImportItem: matchImportItem,
        apiName: apiName,
        httpRepo: httpRepo + filePath.split('&')[1] + '#L' + line,
        file: filePath.split('&')[1],
        line: line,
        stack: error.stack
      }
      context.addDiagnosisInfo(info);
      return false; // 插件执行报错，继续执行后续插件
    }

  }

  // 返回分析Node节点的函数
  return {
    mapName: mapName,
    checkFun: isApiCheck,
    afterHook: null,
  }
}