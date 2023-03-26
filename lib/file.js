const glob = require('glob')
const path = require('path')

exports.scanFileTs = function(scanPath) {
  const tsFiles = glob.sync(path.join(process.cwd(),`${scanPath}/**/*.ts`))
  const tsxFiles = glob.sync(path.join(process.cwd(),`${scanPath}/**/*.tsx`))
  return tsFiles.concat(tsxFiles)
}