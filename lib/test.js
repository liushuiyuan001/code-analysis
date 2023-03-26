const tsCompiler = require('typescript');

const tsCode = `import { app } from 'framework';                    

const dataLen = 3;
let name = 'iceman';

if(app){
    console.log(name);
}

function getInfos (info: string) {
    const result = app.get(info);
    return result;
}
`

const ast = tsCompiler.createSourceFile('111111', tsCode, tsCompiler.ScriptTarget.Latest, true);
// console.log(ast)

const apiMap = {}

function walk(node) {
  tsCompiler.forEachChild(node,walk)
  const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + 1
  // console.log('line', line)
  if(line !== 1 && tsCompiler.isIdentifier(node) && node.escapedText === 'app') {
    console.log(node)
    if(apiMap[node.escapedText]) {
      apiMap[node.escapedText].cakkNum++;
      apiMap[node.escapedText].callLines.push(line)

    }else{
      apiMap[node.escapedText] = {}
      apiMap[node.escapedText].cakkNum = 1;
      apiMap[node.escapedText].callLines = [];
      apiMap[node.escapedText].callLines.push(line);
    }
  }
  // console.log(node)
  console.log('================================================================')
}

walk(ast)
console.log(apiMap)