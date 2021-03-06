const qrcode = require('qrcode-terminal')
const client = require('firebase-tools')
const fs = require('fs')
const path = require('path')
const box = require('cli-box')
const jsonFormat = require('json-format')
var { shortFireConfig, workspacePath, config, jsonFormatConfig } = require('./config')

const isUrlValid = (userInput) => {
  /* eslint-disable no-useless-escape */
  var res = userInput.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
  /* eslint-enable no-useless-escape */
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

const deploy = async (argv) => {
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

const readFile = (file) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(file), async (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}

const printToscreen = (content) => {
  console.log(content)
}

const commitToFile = async () => {
  await writeFile(
    workspacePath + '/firebase.json',
    jsonFormat(config.get('firebase'), jsonFormatConfig)
  )

  await writeFile(
    workspacePath + '/firebaserc',
    jsonFormat(config.get('firebaserc'), jsonFormatConfig)
  )

  await writeFile(
    workspacePath + '/config.json',
    jsonFormat(config.get('config'), jsonFormatConfig)
  )

  await writeFile(
    workspacePath + '/service-account.json',
    jsonFormat(config.get('service-account'), jsonFormatConfig)
  )
}

module.exports = {
  printToscreen,
  readFile,
  writeFile,
  deploy,
  isUrlValid,
  genQrcode,
  textBox,
  commitToFile
}
