const glob = require('glob')
const path = require('path')
const fs = require('fs')

// 输出内容到JSON文件
exports.writeJsonFile = function (content, fileName) {
  try {
    fs.writeFileSync(path.join(process.cwd(), `${fileName}.json`), JSON.stringify(content), 'utf-8');
  } catch (error) {
    throw error
  }
}
// 输出内容到JS文件
exports.writeJsFile = function (pre, content, fileName) {
  try {
    fs.writeFileSync(path.join(process.cwd(), `${fileName}.js`), pre + JSON.stringify(content), 'utf-8');
  } catch (error) {
    throw error
  }
}
// 输出内容到TS文件
exports.writeTsFile = function (content, fileName) {
  try {
    fs.writeFileSync(path.join(process.cwd(), `${fileName}.ts`), JSON.stringify(content), 'utf-8');
  } catch (error) {
    throw e
  }
}
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

        if(fs.statSync(curPath).isDirectory()) {
          console.log('000', curPath)
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
// 获取Json内容
exports.getJsonContent = function(fileName) {
  try {
    const content = JSON.parse(fs.readFileSync(`${path.join(process.cwd(), fileName)}`, 'utf-8'));
    return content;
  } catch (error) {
    console.log(error)
  }
}