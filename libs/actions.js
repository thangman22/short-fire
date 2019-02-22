const randomstring = require('randomstring')
const clipboardy = require('clipboardy')
const chalk = require('chalk')
const jsonFormat = require('json-format')
const CliTable = require('cli-table')
const inquirer = require('inquirer')

const { isUrlValid, genQrcode, textBox, deploy, writeFile, printToscreen } = require('./utils')
var { redirectList, shortFireConfig, firebaseConfig, workspacePath, jsonFormatConfig, firebaseRcData, cliTableConfig } = require('./config')

var table = new CliTable(cliTableConfig)

const onCreate = async (argv) => {
  let foundSlug = true
  let generatedSlug = null
  let duplicatedLink = false

  const url = argv['_'][1]
  const slug = argv['_'][2]

  const newOption = argv['new'] || argv['n']

  // Check URL not null
  if (!url) {
    textBox(chalk.red('• Error') + ' URL is empty please define. \n\n Example usage: `short-fire [url] <slug>`')
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

    // Have existing link and do not have slug and do not have new option.
    if (findExistLink.length > 0 && !slug && !newOption) {
      foundSlug = false
      duplicatedLink = true
      generatedSlug = findExistLink[0].source.replace('/', '')
      break
    }

    // Do not have existing link.
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

  let finalLink = `${shortFireConfig.domain}/${generatedSlug}`
  // Copy to clipboard.
  clipboardy.writeSync(finalLink)
  redirectList.push(redirectObject)
  // Update config file.
  if (!duplicatedLink) {
    await writeFile(workspacePath + '/firebase.json', jsonFormat(firebaseConfig, jsonFormatConfig))
    // Deploy to firebase hosting.
    printToscreen(chalk.blue.bold('• Info') + ' Firebase Updating....')
    await deploy()
  }

  textBox(chalk.green.bold('• Completed') + ' Short link is ' + chalk.bold(finalLink) + ' (Ctrl + v to Paste)')
  printToscreen(await genQrcode(finalLink))
}

const onDelete = async (argv) => {
  const slug = argv['_'][1]
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
  await writeFile(workspacePath + '/firebase.json', jsonFormat(firebaseConfig, jsonFormatConfig))
  deploy()
  textBox(chalk.green.bold('• Completed') + ' Delete /' + slug + ' completed.')
}

const onRestore = async (argv) => {
  const file = argv['_'][1]
  if (!file) {
    textBox(chalk.red('• Error') + ' Config file is not define.')
    process.exit(1)
  }
  const configContent = require(file)
  await writeFile(workspacePath + '/firebase.json', jsonFormat(configContent, jsonFormatConfig))
  deploy()
  textBox(chalk.green.bold('• Completed') + ' Restore Data completed.')
}

const onList = (argv) => {
  const q = argv['_'][1]

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
    table.push([`${shortFireConfig.domain}${redirect.source}`, redirect.destination])
  })
  printToscreen(table.toString())
}

const onInit = async () => {
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
    message: 'What is your domain name e.g. https://example.com',
    validate: function (val) {
      return val !== ''
    }
  }]

  let answers = await inquirer.prompt(questions)
  firebaseRcData.projects.default = answers['project-id']
  await writeFile(workspacePath + '/firebaserc', jsonFormat(firebaseRcData, jsonFormatConfig))
  await writeFile(workspacePath + '/config.json', jsonFormat(answers, jsonFormatConfig))
  textBox(chalk.green.bold('• Completed') + ' Create configulation Please run `short-fire create [url]`')
}

module.exports = {
  onInit,
  onRestore,
  onCreate,
  onDelete,
  onList
}
