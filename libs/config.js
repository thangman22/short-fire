const path = require('path')
const fs = require('fs')

const FirebaseConfigPath = path.join(path.dirname(fs.realpathSync(__filename)), '../workspace') + '/firebase.json'
const workspacePath = path.join(path.dirname(fs.realpathSync(__filename)), '../workspace')

if (!fs.existsSync(path)) {
  fs.writeFileSync(FirebaseConfigPath, '{ "hosting": { "public": "./", "ignore": [ "firebase.json", "**/.*", "**/node_modules/**" ], "redirects": [] } }')
}

const firebaseConfig = require(FirebaseConfigPath)
const shortFireConfig = require(path.join(path.dirname(fs.realpathSync(__filename)), '../workspace') + '/config.json')
const redirectList = firebaseConfig.hosting.redirects
var firebaseRcData = {
  'projects': {
    'default': ''
  }
}
const jsonFormatConfig = {
  type: 'space',
  size: 2
}

const cliTableConfig = {
  style: { head: ['green'] },
  head: ['Short URL', 'Full URL']
}

module.exports = {
  workspacePath,
  firebaseConfig,
  shortFireConfig,
  redirectList,
  jsonFormatConfig,
  firebaseRcData,
  cliTableConfig
}
