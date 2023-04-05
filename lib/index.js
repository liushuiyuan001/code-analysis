const path = require('path');
const CodeAnalysis = require(path.join(__dirname, "./analysis"))

const coderTask = new CodeAnalysis({
  analysisTarget: 'react',
  browserApis: ['window','document','history','location'],                // 可选，要分析的BrowserApi，默认为空数组
  scanSource: [{
    name: "test",
    httpRepo: '11',
    path: ['test'],
  }]
})
coderTask.analysis()