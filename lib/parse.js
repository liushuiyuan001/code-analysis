const tsCompiler = require('typescript')

exports.parseVue = function(filename) {

}

exports.parseTs = function(filename) {
  const program = tsCompiler.createProgram([filename],{})
  const ast  = program.getSourceFile(filename)
  const checker = program.getTypeChecker()

  return {
    ast,
    checker
  }
}