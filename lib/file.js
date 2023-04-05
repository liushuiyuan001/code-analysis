const glob = require('glob')
const path = require('path')
const fs = require('fs')

// 创建目录
exports.mkDir = function(dirName) {
  try {
    fs.mkdirSync(path.join(process.cwd(),`/${dirName}`),0777)
  } catch (error) {
    throw error
  }
}

// 删除文件夹
exports.rmDir = function (dirName) {
  try {
    const dirPath = path.join(process.cwd(),`./${dirName}`)
    if(fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const curPath = path.join(dirPath, file)

        if(fs.statSync(curPath).isDirectory) {
          rmDir(curPath)
        } else {
          fs.unlinkSync(curPath)
        }
      });
      fs.rmdirSync(dirPath)
    }
  } catch (error) {
    throw error
  }
}

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