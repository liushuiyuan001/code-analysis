const path = require('path');
const { parse } = require("@babel/parser");
const _traverse = require("@babel/traverse");
const traverse = _traverse.default;
const processLog = require('single-line-log')
const chalk = require('chalk');
const { methodPlugin } = require(path.resolve(__dirname, '../plugins/methodPlugin'))                                                                          // 美化输出
const { defaultPlugin } = require(path.resolve(__dirname, '../plugins/defaultPlugin'))                                                                          // 美化输出
const { typePlugin } = require(path.resolve(__dirname, '../plugins/typePlugin'))                                                                          // 美化输出
const { browserPlugin } = require(path.resolve(__dirname, '../plugins/browserPlugin'))
const { defaultScorePlugin } = require(path.resolve(__dirname, '../plugins/scorePlugin'))                                                                      // 美化输出
const { scanFileTs, scanFileVue, getCode } = require(path.resolve(__dirname, './file'))
const { CODEFILETYPE } = require(path.resolve(__dirname, './constant'))

module.exports = class CodeAnalysis {

  constructor(options) {
    this._scanSource = options.scanSource;
    this._analysisTarget = options.analysisTarget;
    this._isScanVue = options.isScanVue || false;
    this._browserApis = options.browserApis || [];
    this._scorePlugin = options.scorePlugin || null
    this._analysisPlugins = options.analysisPlugins || [];                             // 代码分析插件配置
    this._blackList = options.blackList || []
    this.pluginsQueue = [] //
    this.browserQueue = [] //
    this.importItemMap = {}
    this.scoreMap = {} // 评分及建议Map
    this.parseErrorInfos = []
    this.diagnosisInfos = [];
  }

  analysis() {
    // 注册插件
    this._installPlugins(this._analysisPlugins)

    if(this._isScanVue) {
      this._scanCode(this._scanSource, CODEFILETYPE.VUE)
    }
    this._scanCode(this._scanSource, CODEFILETYPE.TS)

    this._blackTag(this.pluginsQueue)
    this._blackTag(this.browserQueue)

    // 代码评分
    if(this._scorePlugin) {
      if(typeof this._scorePlugin === 'function') {
        this.scoreMap = this._scorePlugin(this)
      }
      if(this._scorePlugin === 'default') {
        this.scoreMap = defaultScorePlugin(this)
      }
    } else {
      this.scoreMap = null
    }
  }

  _installPlugins(plugins) {
    plugins.forEach(item => {
      this.pluginsQueue.push(item(this))
    })
    this.pluginsQueue.push(methodPlugin(this))
    this.pluginsQueue.push(typePlugin(this))
    this.pluginsQueue.push(defaultPlugin(this))
    if(this._browserApis.length > 0) {
      this.browserQueue.push(browserPlugin(this))
    }
  }

  // API黑名单标记
  _blackTag(queue = []) {
    queue.forEach(item => {
      Object.keys(this[item.mapName]).forEach( apiName => {
        if(this._blackList.includes(apiName)) {
          this[item.mapName][apiName].isBlack = true
        }
      })
    })
  }
  // 扫描文件
  _scanFiles(scanSource, type) {
    let entrys = []
    scanSource.forEach(item => {
      const entryObj = {
        name: item.name,
        httpRepo: item.httpRepo
      }
      let parse = [];
      let show = [];
      const scanPath = item.path;
      scanPath.forEach(sitem => {
        let tempEntry = []
        if(type === CODEFILETYPE.VUE) {
          tempEntry = scanFileVue(sitem)
        } else if(type === CODEFILETYPE.TS) {
          tempEntry = scanFileTs(sitem)
        }
        const relativePath = tempEntry.map((titem)=>{
          // 截取文件相对路径
          if(item.format && typeof(item.format) ==='function'){
            return item.format(titem.substring(titem.indexOf(sitem)));
          }else{
            return titem.substring(titem.indexOf(sitem));
          }
        })
        parse = parse.concat(tempEntry)
        show = show.concat(relativePath)
      })
      entryObj.parse = parse
      entryObj.show = show
      entrys.push(entryObj)
    })
    return entrys
  }

  // 扫描文件 分析代码
  _scanCode(scanSource, type) {
    let entrys = this._scanFiles(scanSource, type)
    entrys.forEach(item => {
      const parseFiles = item.parse
      parseFiles.forEach((element, eIndex) => {
        const showPath = item.name + '&' + item.show[eIndex];
        const code = getCode(element)
        try {
          if(type === CODEFILETYPE.VUE) {

          } else if(type === CODEFILETYPE.TS) {
            const ast = parse(code, {
              sourceType: 'module',
              plugins: [
                'jsx',
                'typescript'
              ]
            })
            this._findImportItems(ast, showPath, item.name)
          }
        } catch (e) {
          console.log('e', e)
          const info = {
            projectName: item.name,
            httpRepo: item.httpRepo + item.show[eIndex],
            file: item.show[eIndex],
            stack: e.stack
          }
          this.addDiagnosis(info)
          this.parseErrorInfos(info)
        }
        const progress = (eIndex+1/parseFiles.length) * 100 + '%'
        processLog.stdout(chalk.green(`\n${item.name}.${type}分析进度: ${progress}\n`))
      })
    })
  }

  // 记录诊断日志
  addDiagnosis(info) {
    this.diagnosisInfos.push(info)
  }

  // 分析import引入
  _findImportItems(ast, filePath, projectName, httpRepo, line) {
    let importItems = {}
    let that = this

    // 处理imports相关map
    function dealImports(temp) {
      importItems[temp.name] = {}
      importItems[temp.name].origin = temp.origin
      importItems[temp.name].symbolPos = temp.symbolPos
      importItems[temp.name].symbolEnd = temp.symbolEnd
      importItems[temp.name].identifierPos = temp.identifierPos
      importItems[temp.name].identifierEnd = temp.identifierEnd
      importItems[temp.name].line = temp.line
      
      if(!that.importItemMap[temp.name]) {
        that.importItemMap[temp.name] = {}
        that.importItemMap[temp.name].callOrigin = temp.origin
        that.importItemMap[temp.name].callFiles = []
        that.importItemMap[temp.name].callFiles.push(filePath)
      } else {
        that.importItemMap[temp.name].callFiles.push(filePath)
      }
    }

    traverse(ast, {
      ImportDeclaration: function (child) {
        child?.node?.specifiers?.forEach(element => {
          if(element.type === 'ImportSpecifier') {
            let temp = {
              name: element.local.name,
              origin: element.imported.name,
              symbolPos: element.local.loc.start.index,
              symbolEnd: element.local.loc.end.index,
              identifierPos: element.local.loc.start.column,
              identifierEnd: element.local.loc.end.column,
              line: element.local.loc.start.line,
            }
            dealImports(temp)
          }
          if(element.type === 'ImportDefaultSpecifier') {
            let temp = {
              name: element.local.name,
              origin: null,
              symbolPos: element.local.loc.start.index,
              symbolEnd: element.local.loc.end.index,
              identifierPos: element.local.loc.start.column,
              identifierEnd: element.local.loc.end.column,
              line: element.local.loc.start.line,
            }
            dealImports(temp)
          }
          if(element.type === 'ImportNamespaceSpecifier') {
            let temp = {
              name: element.local.name,
              origin: '*',
              symbolPos: element.local.loc.start.index,
              symbolEnd: element.local.loc.end.index,
              identifierPos: element.local.loc.start.column,
              identifierEnd: element.local.loc.end.column,
              line: element.local.loc.start.line,
            }
            dealImports(temp)
          }
        })
      },
      CallExpression: function (nodePath) {
        const node = nodePath.node
        const { baseNode, depth, apiName, baseApiName } = that._getCallInfo(node)

        if(that._browserApis.length > 0 && that._browserApis.includes(baseApiName)) { 
          that._runBrowserPlugins(baseNode, depth, apiName, filePath, projectName, httpRepo, node?.loc?.start?.line)
        }else{
          that._runAnalysisPlugins(baseNode, depth, apiName, importItems, filePath, projectName, httpRepo, node?.loc?.start?.line)
        }
      }
    })

    return importItems
  }

  // 
  _getCallInfo(node, index = 0) {
    // 直接调用
    if(node?.callee?.type === 'Identifier') {
      return {
        baseNode: node,
        depth: 0,
        baseApiName: node.callee.name,
        apiName: node.callee.name
      }
    }
    // 链式调用
    if(node?.callee?.type === 'MemberExpression') {
      return this._checkPropertyAccess(node, index)
    }
  }

  // 链式调用检查，找出链路顶点node
  _checkPropertyAccess(node, index = 0, apiName = "") {
    
    const objName = node?.callee?.object?.name
    
    return {
      baseNode: node,
      depth: 1,
      baseApiName: objName,
      apiName: objName + '.' + node?.callee?.property?.name,
    }
  }

  _runAnalysisPlugins(baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line) {
    if(this.pluginsQueue.length > 0) {
      for (let i = 0; i < this.pluginsQueue.length; i++){
        const checkFun = this.pluginsQueue[i].checkFun;
        if(checkFun(this,baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line)) {
          break
        }
      }
    }
  }

  _runBrowserPlugins(baseNode, depth, apiNmae, filePath, projectName, httpRepo, line) {
    for(let i = 0; i < this.browserQueue.length; i++) {
      const checkFun = this.browserQueue[i].checkFun;
      if(checkFun(this, baseNode, depth, apiNmae, filePath, projectName, httpRepo, line)) {
        break
      }
    }
  }

  _runAnalysisPluginsHook(importItems, ast, checker, filePath, projectName, httpRepo, line) {
    this.pluginsQueue.forEach((plugin) => {
      if(plugin.afterHook && typeof plugin.afterHook === 'function') {
        plugin.afterHook(this, plugin.mapName, importItems, ast, checker, filePath, projectName, httpRepo, line)
      }
    })
  }
}