const path = require('path')
const fs = require('fs')
const Conf = require('conf')
const config = new Conf({
  encryptionKey: 'short-file'
})

const workspacePath = path.join(path.dirname(fs.realpathSync(__filename)), '../workspace')

if (!config.get('firebase')) {
  config.set('firebase', { 'hosting': { 'public': './', 'ignore': [ 'firebase.json', '**/.*', '**/node_modules/**' ], 'redirects': [] } })
}

if (!config.get('config')) {
  config.set('config', {})
}

const firebaseConfig = config.get('firebase')
const shortFireConfig = config.get('config')
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
  cliTableConfig,
  config
}
