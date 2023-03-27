const glob = require('glob')
const path = require('path')
const fs = require('fs')

exports.scanFileVue = function(scanPath) {
  const entryFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.vue`))

  return entryFiles
}

exports.scanFileTs = function(scanPath) {
  const tsFiles = glob.sync(path.join(process.cwd(),`${scanPath}/**/*.ts`))
  const tsxFiles = glob.sync(path.join(process.cwd(),`${scanPath}/**/*.tsx`))
  return tsFiles.concat(tsxFiles)
}

exports.getCode = function(filename) {
  try {
    const code = fs.readFileSync(filename, 'utf8')
    return code
  } catch (error) {
    throw error
  }
}