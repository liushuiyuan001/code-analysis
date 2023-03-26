const tsCompiler = require('typescript')

exports.parseTs = function(filename) {
  const ast  = program.getSourceFile(filename)
  const program = tsCompiler.createProgram([filename],{})
  const checker = program.getTypeChecker()

  return {
    ast,
    checker
  }
}