#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2))
const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')
const randomstring = require('randomstring')
const jsonFormat = require('json-format')
const client = require('firebase-tools')
const chalk = require('chalk')
const box = require('cli-box')
const clipboardy = require('clipboardy')
const CliTable = require('cli-table')
const json = require('format-json')
const figlet = require('figlet')
const qrcode = require('qrcode-terminal')
const config = {
  type: 'space',
  size: 2
}
const header = figlet.textSync('Fire link', {
  font: 'Graceful',
  horizontalLayout: 'default',
  verticalLayout: 'default'
})

var table = new CliTable({
  style: { head: ['green'] },
  head: ['Short URL', 'Full URL']
})

const workspacePath = path.join(path.dirname(fs.realpathSync(__filename)), 'workspace')
const firebaseConfig = require(path.join(path.dirname(fs.realpathSync(__filename)), 'workspace') + '/firebase.json')
const fireLinkConfig = require(path.join(path.dirname(fs.realpathSync(__filename)), 'workspace') + '/config.json')
var redirectList = firebaseConfig.hosting.redirects

var firebaseRcData = {
  'projects': {
    'default': ''
  }
}

const help = `
Usage: firelink [command] <options>

Command:
  init                    Init fire link for create configulation.
  create [url] <slug>     Create shorten URL defind slug is optional.
  list <q>                List all available URL. defind q for searching.
  dump                    Dump Firebase configulation for backup purpose.
  restore <file>          Restore configulation from file.
  delete [slug]           Delete URL by specific slug.

Examples:
  $ firelink http://example.com
  $ firelink http://example.com example
  
`

if (!argv['_'][0] || argv['_'][0] === '--help') {
  console.log(header + '\n')
  console.log(help)
}

if (!fireLinkConfig['project-id'] || !fireLinkConfig['token'] || !fireLinkConfig['domain']) {
  textBox(chalk.red('• Error') + ' Configulation not found. Please run `firelink init`')
  process.exit(0)
}

if (argv['_'][0] === 'init') {
  console.log(header + '\n')
  onInit()
}

if (argv['_'][0] === 'create') {
  console.log(header + '\n')
  onCreate()
}

if (argv['_'][0] === 'list') {
  console.log(header + '\n')
  onList()
}

if (argv['_'][0] === 'dump') {
  console.log(json.diffy(firebaseConfig))
}

if (argv['_'][0] === 'restore') {
  console.log(header + '\n')
  onRestore()
}

if (argv['_'][0] === 'delete') {
  console.log(header + '\n')
  onDelete()
}

async function onDelete () {
  let slug = argv['_'][1]
  if (!slug) {
    textBox(chalk.red.bold('• Error') + ' Please define slug to delete')
    process.exit(0)
  }

  redirectList = redirectList.filter(redirect => {
    if (redirect.source !== '/' + slug) {
      return true
    } else {
      return false
    }
  })

  firebaseConfig.hosting.redirects = redirectList
  await writeFile(workspacePath + '/firebase.json', jsonFormat(firebaseConfig, config))
  textBox(chalk.green.bold('• Completed') + ' Delete /' + slug + ' completed.')
}

async function onRestore () {
  let file = argv['_'][1]
  if (!file) {
    textBox(chalk.red('• Error') + ' Config file is not define.')
    process.exit(1)
  }
  const configContent = require(file)
  await writeFile(workspacePath + '/firebase.json', jsonFormat(configContent, config))
  deploy()
  textBox(chalk.green.bold('• Completed') + ' Restore Data completed.')
}

async function onList () {
  let q = argv['_'][1]

  if (q) {
    redirectList = redirectList.filter(redirect => {
      if (redirect.destination.indexOf(q) !== -1 || redirect.source.indexOf(q) !== -1) {
        return true
      } else {
        return false
      }
    })
  }

  redirectList.map(redirect => {
    table.push([`${fireLinkConfig.domain}${redirect.source}`, redirect.destination])
  })
  console.log(table.toString())
}

async function onInit () {
  var questions = [{
    type: 'input',
    name: 'project-id',
    message: 'What is your Firebase project ID?',
    validate: function (val) {
      return val !== ''
    }
  }, {
    type: 'input',
    name: 'token',
    message: 'What is your Firebase token? (Run `firebase login:ci` for token)',
    validate: function (val) {
      return val !== ''
    }
  }, {
    type: 'input',
    name: 'domain',
    message: 'What is your domain name',
    validate: function (val) {
      return val !== ''
    }
  }]

  let answers = await inquirer.prompt(questions)
  firebaseRcData.projects.default = answers['project-id']
  await writeFile(workspacePath + '/firebaserc', jsonFormat(firebaseRcData, config))
  await writeFile(workspacePath + '/config.json', jsonFormat(answers, config))
}

async function onCreate () {
  let foundSlug = true
  let generatedSlug = null
  let duplicatedLink = false
  let url = argv['_'][1]
  let slug = argv['_'][2]

  // Check URL not null
  if (!url) {
    textBox(chalk.red('• Error') + ' URL is empty please define. \n\n Example usage: firelink [url] <slug>')
    process.exit(1)
  }

  // Check valid URL
  if (!isUrlValid(url)) {
    textBox(chalk.red.bold('• Error') + ' URL is not valid. Please check your link')
    process.exit(1)
  }

  while (foundSlug) {
    if (!slug) {
      generatedSlug = randomstring.generate(7)
    } else {
      generatedSlug = slug
    }
    // Find duplicate link and return current.
    let findExistLink = redirectList.filter(redirect => {
      if (url === redirect.destination) {
        return true
      } else {
        return false
      }
    })

    if (findExistLink.length > 0) {
      foundSlug = false
      duplicatedLink = true
      generatedSlug = findExistLink[0].source.replace('/', '')
      break
    }

    // Find duplicate slug for warning user.
    let findExist = redirectList.filter(redirect => {
      if ('/' + generatedSlug === redirect.source) {
        return true
      } else {
        return false
      }
    })

    if (findExist.length === 0) {
      foundSlug = false
    } else {
      if (slug) {
        textBox(chalk.red.bold('• Error') + ' Slug is duplicated. Please change')
        process.exit(1)
      }
    }
  }

  let redirectObject = {
    'source': '/' + generatedSlug,
    'destination': url,
    'type': 302
  }

  let finalLink = `${fireLinkConfig.domain}/${generatedSlug}`
  // Copy to clipboard.
  clipboardy.writeSync(finalLink)
  firebaseConfig.hosting.redirects.push(redirectObject)
  // Update config file.
  if (!duplicatedLink) {
    await writeFile(workspacePath + '/firebase.json', jsonFormat(firebaseConfig, config))
    // Deploy to firebase hosting.
    console.log(chalk.blue.bold('• Info') + ' Firebase Updating....')
    await deploy()
  }

  textBox(chalk.green.bold('• Completed') + ' Shrot link is ' + chalk.bold(finalLink) + ' (Ctrl + v to Paste)')
  console.log(await genQrcode(finalLink))
}

function writeFile (file, text) {
  return new Promise((reslove, reject) => {
    fs.writeFile(file, text, async (err) => {
      if (err) reject(err)
      reslove(true)
    })
  })
}

function textBox (text) {
  let boxString = box((text.length) + 'x3', {
    text: text,
    stretch: true,
    autoEOL: true,
    vAlign: 'center',
    hAlign: 'middle'
  })
  console.log(boxString)
}

async function genQrcode (url) {
  return new Promise((resolve, reject) => {
    qrcode.generate(url, { small: true }, function (qrcode) {
      resolve(qrcode)
    })
  })
}

async function deploy () {
  return client.deploy({
    project: fireLinkConfig['project-id'],
    token: fireLinkConfig['token'],
    cwd: workspacePath
  })
}

function isUrlValid (userInput) {
  var res = userInput.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
  if (res == null) { return false } else { return true }
}
