module.exports = {
  analysisTarget: 'react',
  scorePlugin: 'default',
  browserApis: ['window','document','history','location'],                // 可选，要分析的BrowserApi，默认为空数组
  scanSource: [{
    name: "test",
    httpRepo: '11',
    path: ['test'],
  }]
}