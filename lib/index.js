const path = require('path');
const CodeAnalysis = require(path.join(__dirname, "./analysis"))

const coderTask = new CodeAnalysis({
  analysisTarget: 'react',
  scanSource: [{
    name: "test",
    httpRepo: '11',
    path: ['test'],
  }]
})
coderTask.analysis()