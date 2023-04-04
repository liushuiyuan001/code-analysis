const tsCompiler = require('typescript')
const path = require('path');
const processLog = require('single-line-log')
const chalk = require('chalk');
const { methodPlugin } = require(path.resolve(__dirname, '../plugins/methodPlugin'))                                                                          // 美化输出
const { defaultPlugin } = require(path.resolve(__dirname, '../plugins/defaultPlugin'))                                                                          // 美化输出
const { typePlugin } = require(path.resolve(__dirname, '../plugins/typePlugin'))                                                                          // 美化输出
const { browserPlugin } = require(path.resolve(__dirname, '../plugins/browserPlugin'))                                                                          // 美化输出
const { scanFileTs, scanFileVue } = require(path.resolve(__dirname, './file'))
const { parseTs, parseVue } = require(path.resolve(__dirname, 'parse'))
const { CODEFILETYPE } = require(path.resolve(__dirname, './constant'))
module.exports = class CodeAnalysis {

  constructor(options) {
    this._scanSource = options.scanSource;
    this._analysisTarget = options.analysisTarget;
    this._isScanVue = options.isScanVue || false;
    this._browserApis = options.browserApis || [];
    this._analysisPlugins = options.analysisPlugins || [];                             // 代码分析插件配置
    
    this.pluginsQueue = [] //
    this.browerQueue = [] //
    this.importItemMap = {}

    this.diagnosisInfos = [];
  }

  analysis() {
    // 注册插件
    this._installPlugins(this._analysisPlugins)

    if(this._isScanVue) {
      this._scanCode(this._scanSource, CODEFILETYPE.VUE)
    }
    this._scanCode(this._scanSource, CODEFILETYPE.TS)
  }

  _installPlugins(plugins) {
    this.pluginsQueue.push(methodPlugin(this))
    this.pluginsQueue.push(typePlugin(this))
    this.pluginsQueue.push(defaultPlugin(this))
    this.browerQueue.push(browserPlugin(this))
    this._browserApis.push(browserPlugin(this))
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
        try {
          if(type === CODEFILETYPE.VUE) {
            const { ast, checker, baseLine } = parseVue(element)
            const importItems = this._findImportItems(ast, showPath)
            if(Object.keys(importItems).length > 0 || this._browserApis.length > 0) {
              this._dealAST(importItems, ast, checker, showPath, item.name, item.httpRepo, baseLine)
            }
          } else if(type === CODEFILETYPE.TS) {
            const { ast, checker } = parseTs(element)
            const importItems = this._findImportItems(ast, showPath)
            if(Object.keys(importItems).length > 0 || this._browserApis.length > 0) {
              this._dealAST(importItems, ast, checker, showPath, item.name, item.httpRepo)
            }
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
        }
        const progress = eIndex+1/parseFiles.length * 100
        processLog.stdout(chalk.green(`\n${item.name}.${type}分析进度: ${progress}`))
      })
    })
  }

  // 记录诊断日志
  addDiagnosis(info) {
    this.diagnosisInfos.push(info)
  }

  // 分析import引入
  _findImportItems(ast, filePath, baseLine = 0) {
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

      if(!that.importItemMap[temp.name]) {
        that.importItemMap[temp.name] = {}
        that.importItemMap[temp.name].callOrigin = temp.origin
        that.importItemMap[temp.name].callFiles = []
        that.importItemMap[temp.name].callFiles.push(filePath)
      } else {
        that.importItemMap[temp.name].callFiles.push(filePath)
      }
    }

    // 遍历AST寻找import节点
    function walk(node) {
      tsCompiler.forEachChild(node, walk)
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1

      // 分析引入情况
      if(!tsCompiler.isImportDeclaration(node)) {
        return
      }

      if(!node.moduleSpecifier.text) {
        return
      }

      if(node.moduleSpecifier.text !== that._analysisTarget) {
        return
      }

      if(!node.importClause) {
        return
      }

      // default直接引入场景
      if(node.importClause.name) {
        const temp = {
          name: node.importClause.name.escapedText,
          origin: null,
          symbolPos: node.importClause.pos,
          symbolEnd: node.importClause.end,
          identifierPos: node.importClause.name.pos,
          identifierEnd: node.importClause.name.end,
          line
        }
        dealImports(temp)
      }
      if(node.importClause.namedBindings) {
        // 扩展引入场景，包含as情况
        if(tsCompiler.isNamedImports(node.importClause.namedBindings)) {
          if(node.importClause.namedBindings.elements && node.importClause.namedBindings.elements.length > 0) {
            const tempArr = node.importClause.namedBindings.elements
            tempArr.forEach(element => {
              if(tsCompiler.isImportSpecifier(element)) {
                let temp = {
                  name: element.name.escapedText,
                  origin: element.propertyName ? element.propertyName.escapedText : null,
                  symbolPos: element.pos,
                  symbolEnd: element.end,
                  identifierPos: element.name.pos,
                  identifierEnd: element.name.end,
                  line: line
                }
                dealImports(temp)
              }
            })
          }
        }
        // 全量引入as场景
        if(tsCompiler.isNamedImports(node.importClause.namedBindings) && node.importClause.namedBindings.name){
          let temp = {
            name: node.importClause.namedBindings.name.escapedText,
            origin: '*',
            symbolPos: node.importClause.namedBindings.pos,
            symbolEnd: node.importClause.namedBindings.end,
            identifierPos: node.importClause.namedBindings.name.pos,
            identifierEnd: node.importClause.namedBindings.name.end,
            line: line
          }
          dealImports(temp)
        }
      }
    }

    walk(ast)

    return importItems
  }

  // 链式调用检查，找出链路顶点node
  _checkPropertyAccess(node, index = 0, apiName = "") {
    if(index > 0) {
      apiName = apiName + "." + node.name.escapedText
    } else {
      apiName = apiName + node.escapedText
    }

    if(tsCompiler.isPropertyAccessExpression(node.parent)) {
      index++
      return this._checkPropertyAccess(node.parent, index, apiName)
    } else {
      return {
        baseNode: node,
        depth: index,
        apiName: apiName,
      }
    }
  }

  // AST分析
  _dealAST(importItems, ast, checker, filePath, projectName, httpRepo, baseLine = 0) {
    const that = this;
    const importItemNames = Object.keys(importItems)
    // 遍历ast
    function walk(node) {
      tsCompiler.forEachChild(node, walk)
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;
      // target analysis
      if(tsCompiler.isIdentifier(node) && node.escapedText && importItemNames.length > 0 && importItemNames.includes(node.escapedText)) {
        const matchImportItem = importItems[node.escapedText]
        // 排除importItem Node自身
        if(node.pos !== matchImportItem.identifierPos && node.end !== matchImportItem.identifierEnd) {
          const symbol = checker.getSymbolAtLocation(node)
          // 存在上下文声明
          if(symbol && symbol.declarations && symbol.declarations.length > 0) {
            const nodeSymbol = symbol.declarations[0]
            // 排除局部同名函数的干扰
            if(matchImportItem.symbolPos === nodeSymbol.pos && matchImportItem.symbolEnd === nodeSymbol.end) {
              if(node.parent) {
                const { baseNode, depth, apiName } = that._checkPropertyAccess(node)
                that._runAnalysisPlugins(tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line)
              } else {
                // Identifier节点如果没有parent属性，说明AST节点语义异常，不存在分析意义
              }
            } else {
              // 上下文非importItem API
            }
          }

        }
      }

      // browser analysis
      if(tsCompiler.isIdentifier(node) && node.escapedText && that._browserApis.length > 0 && that._browserApis.includes(node.escapedText)) {
        const symbol = checker.getSymbolAtLocation(node)

        if(symbol && symbol.declarations) {
          // 在AST找不到上下文声明 证明是Bom，Dom对象
          if(symbol.declarations.length > 1 || (symbol.declarations.length == 1 && symbol.declarations[0].pos > ast.end)) {
            const { baseNode, depth, apiNmae } = that._checkPropertyAccess(node)
            if(!(depth > 0 && node.parent.name && node.parent.name.pos === node.pos && node.parent.name.end === node.end)) {
              // 排除作为属性的场景
              that._runBrowserPlugins(tsCompiler, baseNode, depth, apiNmae, filePath, projectName, httpRepo, line)
            }
          }
        }
      }
    }

    walk(ast)
    // this._runAnalysisPluginsHook(importItems, ast, checker, filePath, projectName, httpRepo, baseLine)
  }

  _runAnalysisPlugins(tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line) {
    if(this.pluginsQueue.length > 0) {
      for (let i = 0; i < this.pluginsQueue.length; i++){
        const checkFun = this.pluginsQueue[i].checkFun;
        if(checkFun(this, tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line)) {
          break
        }
      }
    }
  }

  _runBrowserPlugins(tsCompiler, baseNode, depth, apiNmae, filePath, projectName, httpRepo, line) {
    for(let i = 0; i < this.browerQueue.length; i++) {
      const checkFun = this.browerQueue[i].checkFun;
      if(checkFun(this, tsCompiler, baseNode, depth, apiNmae, filePath, projectName, httpRepo, line)) {
        break
      }
    }
  }
}