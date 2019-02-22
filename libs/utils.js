const qrcode = require('qrcode-terminal')
const argv = require('minimist')(process.argv.slice(2))
const client = require('firebase-tools')
const fs = require('fs')
const box = require('cli-box')
var { shortFireConfig, workspacePath } = require('./config')

const isUrlValid = (userInput) => {
  var res = userInput.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
  if (res == null) { return false } else { return true }
}

const genQrcode = (url) => {
  return new Promise((resolve, reject) => {
    qrcode.generate(url, { small: true }, function (qrcode) {
      resolve(qrcode)
    })
  })
}

const textBox = (text) => {
  let boxString = box((text.length) + 'x3', {
    text: text,
    stretch: true,
    autoEOL: true,
    vAlign: 'center',
    hAlign: 'middle'
  })
  printToscreen(boxString)
}

const deploy = async () => {
  // Add dry-run for testiung purpose
  if (!argv['dry-run']) {
    return client.deploy({
      project: shortFireConfig['project-id'],
      token: shortFireConfig['token'],
      cwd: workspacePath
    })
  }
}

const writeFile = (file, text) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, text, async (err) => {
      if (err) reject(err)
      resolve(true)
    })
  })
}

const printToscreen = (content) => {
  console.log(content)
}

module.exports = {
  printToscreen,
  writeFile,
  deploy,
  isUrlValid,
  genQrcode,
  textBox
}
