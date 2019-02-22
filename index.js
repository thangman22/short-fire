#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2))
const chalk = require('chalk')
const json = require('format-json')
const figlet = require('figlet')

const { onCreate, onDelete, onRestore, onList, onInit } = require('./libs/actions')
const { textBox, printToscreen } = require('./libs/utils')
const { firebaseConfig, shortFireConfig } = require('./libs/config')

const header = chalk.yellow(figlet.textSync('Short Fire', {
  font: 'Graceful',
  horizontalLayout: 'default',
  verticalLayout: 'default'
}))

const help = `
Usage: short-fire [command] <options>

Command:
  init                          Init Short fire for create configulation.
  create [url] <slug> <options> Create shorten URL defind slug is optional.
      options:
        -n, --new
          Force the system to create a new random url when there is an existing destination.
  list <q>                      List all available URL. defind q for searching.
  dump                          Dump Firebase configulation for backup purpose.
  restore <file>                Restore configulation from file.
  delete [slug]                 Delete URL by specific slug.

Examples:
  $ short-fire create http://example.com/link
  $ short-fire create http://example.com/link example
  
`

if (!argv['_'][0] || argv['_'][0] === '--help') {
  printToscreen(header + '\n')
  printToscreen(help)
}

if ((!shortFireConfig['project-id'] || !shortFireConfig['token'] || !shortFireConfig['domain']) && argv['_'][0] !== 'init') {
  textBox(chalk.red('• Error') + ' Configulation not found. Please run `short-fire init`')
  process.exit(0)
}

if (argv['_'][0] === 'init') {
  printToscreen(header + '\n')
  onInit(argv)
}

if (argv['_'][0] === 'create') {
  printToscreen(header + '\n')
  onCreate(argv)
}

if (argv['_'][0] === 'list') {
  printToscreen(header + '\n')
  onList(argv)
}

if (argv['_'][0] === 'dump') {
  printToscreen(json.diffy(firebaseConfig))
}

if (argv['_'][0] === 'restore') {
  printToscreen(header + '\n')
  onRestore(argv)
}

if (argv['_'][0] === 'delete') {
  printToscreen(header + '\n')
  onDelete(argv)
}
