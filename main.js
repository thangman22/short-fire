#!/usr/bin/env node

import { parseArgs } from 'node:util'
import chalk from 'chalk'
import figlet from 'figlet'
import {
  onCreate,
  onDelete,
  onDump,
  onInit,
  onList,
  onPull,
  onRestore,
  onWhere
} from './libs/actions.js'
import { printToscreen, textBox } from './libs/utils.js'
import { isConfigured } from './libs/config.js'

const header = chalk.yellow(figlet.textSync('Short Fire', { font: 'Graceful' }))

const help = `
Usage: short-fire [command] <options>

Command:
  init                          Init Short fire for create configulation.
  create [url] <slug> <options> Create shorten URL defind slug is optional.
      options:
        -n, --new
          Force the system to create a new random url when there is an existing destination.
        --dry-run
          Build the Firebase workspace but do not deploy.
  list <q>                      List all available URL. defind q for searching.
  dump                          Dump the link list for backup purpose.
  restore [file]                Restore link list from file.
  pull                          Re-read the live link list from Firebase Hosting.
  delete [slug]                 Delete URL by specific slug.
  where                         Show where the config and workspace live.

Examples:
  $ short-fire create http://example.com/link
  $ short-fire create http://example.com/link example

`

const argv = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {
    new: { type: 'boolean', short: 'n', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  }
})

const command = argv.positionals[0]

const commands = {
  init: onInit,
  create: onCreate,
  list: onList,
  dump: onDump,
  restore: onRestore,
  pull: onPull,
  delete: onDelete,
  where: onWhere
}

// Commands that only touch local state, so they run before the config check.
const OFFLINE = new Set(['init', 'dump', 'where'])

if (!command || argv.values.help) {
  printToscreen(header + '\n')
  printToscreen(help)
  process.exit(0)
}

if (!commands[command]) {
  printToscreen(header + '\n')
  textBox(chalk.red('• Error') + ` \`${command}\` is not a short-fire command`)
  printToscreen(help)
  process.exit(1)
}

if (!OFFLINE.has(command) && !isConfigured()) {
  textBox(chalk.red('• Error') + ' Configulation not found. Please run `short-fire init`')
  process.exit(1)
}

// `dump` is meant to be piped into a backup file, so it must not print the
// banner.
if (command !== 'dump') printToscreen(header + '\n')

try {
  await commands[command](argv)
} catch (error) {
  textBox(chalk.red.bold('• Error') + ' ' + (error?.message ?? String(error)))
  process.exit(1)
}
