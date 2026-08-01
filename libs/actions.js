import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import CliTable from 'cli-table3'
import clipboard from 'clipboardy'
import { input } from '@inquirer/prompts'
import {
  cliTableConfig,
  getRedirects,
  getSettings,
  isConfigured,
  saveRedirects,
  saveSettings,
  siteId,
  store,
  workspacePath
} from './config.js'
import { fetchLiveRedirects, readServiceAccount } from './hosting-api.js'
import {
  deploy,
  genQrcode,
  generateSlug,
  isUrlValid,
  printToscreen,
  shortUrl,
  textBox
} from './utils.js'

const fail = message => {
  textBox(chalk.red.bold('• Error') + ' ' + message)
  process.exit(1)
}

const done = message => textBox(chalk.green.bold('• Completed') + ' ' + message)

const info = message => printToscreen(chalk.blue.bold('• Info') + ' ' + message)

const sourceOf = slug => '/' + slug

// Save the new link list and publish it. If the deploy fails, put the old list
// back so the local config keeps matching what is actually live.
const commit = async (redirects, options) => {
  const previous = getRedirects()
  saveRedirects(redirects)

  info('Firebase Updating....')
  try {
    await deploy(options)
  } catch (error) {
    saveRedirects(previous)
    throw error
  }
}

export const onCreate = async argv => {
  const [, url, wantedSlug] = argv.positionals
  const forceNew = argv.values.new

  if (!url) {
    fail('URL is empty please define. \n\n Example usage: `short-fire create [url] <slug>`')
  }

  if (!isUrlValid(url)) {
    fail('URL is not valid. It must start with http:// or https://')
  }

  const redirects = getRedirects()

  // Reuse the existing short link for a destination we already published,
  // unless the user asked for a specific slug or explicitly forced a new one.
  const existing = redirects.find(redirect => redirect.destination === url)
  if (existing && !wantedSlug && !forceNew) {
    const slug = existing.source.replace(/^\//, '')
    copyToClipboard(shortUrl(slug))
    done('Short link already exists: ' + chalk.bold(shortUrl(slug)) + ' (Ctrl + v to Paste)')
    printToscreen(await genQrcode(shortUrl(slug)))
    return
  }

  let slug = wantedSlug
  if (slug) {
    if (redirects.some(redirect => redirect.source === sourceOf(slug))) {
      fail('Slug is duplicated. Please change')
    }
  } else {
    do {
      slug = generateSlug()
    } while (redirects.some(redirect => redirect.source === sourceOf(slug)))
  }

  await commit([...redirects, { source: sourceOf(slug), destination: url, type: 302 }], argv.values)

  const link = shortUrl(slug)
  copyToClipboard(link)
  done('Short link is ' + chalk.bold(link) + ' (Ctrl + v to Paste)')
  printToscreen(await genQrcode(link))
}

const copyToClipboard = link => {
  try {
    clipboard.writeSync(link)
  } catch {
    // Headless shells and containers have no clipboard; the link is printed
    // anyway so this is not worth failing a deploy over.
  }
}

export const onDelete = async argv => {
  const [, slug] = argv.positionals
  if (!slug) fail('Please define slug to delete')

  const redirects = getRedirects()
  const remaining = redirects.filter(redirect => redirect.source !== sourceOf(slug))

  if (remaining.length === redirects.length) {
    fail(`No short link found for /${slug}`)
  }

  await commit(remaining, argv.values)
  done('Delete /' + slug + ' completed.')
}

export const onList = argv => {
  const [, query] = argv.positionals
  const table = new CliTable(cliTableConfig)

  const redirects = getRedirects().filter(redirect =>
    !query || redirect.destination.includes(query) || redirect.source.includes(query)
  )

  for (const redirect of redirects) {
    table.push([shortUrl(redirect.source.replace(/^\//, '')), redirect.destination])
  }

  printToscreen(table.toString())
  printToscreen(chalk.dim(`${redirects.length} link(s)`))
}

export const onDump = () => printToscreen(JSON.stringify(getRedirects(), null, 2))

// Accepts a 2.x dump (a bare array) as well as a 1.x `short-fire dump`
// backup, which was the whole firebase.json object.
export const parseBackup = content => {
  const data = JSON.parse(content)
  const redirects = Array.isArray(data) ? data : data?.hosting?.redirects

  if (!Array.isArray(redirects)) {
    throw new Error('Backup file does not contain a redirect list')
  }

  for (const redirect of redirects) {
    if (!redirect?.source || !redirect?.destination) {
      throw new Error('Backup file contains a redirect without a source or destination')
    }
  }

  return redirects.map(({ source, destination, type }) => ({
    source,
    destination,
    type: type ?? 302
  }))
}

export const onRestore = async argv => {
  const [, file] = argv.positionals
  if (!file) fail('Config file is not define.')

  let redirects
  try {
    redirects = parseBackup(await fs.readFile(path.resolve(file), 'utf8'))
  } catch (error) {
    fail(`Could not read ${file}: ${error.message}`)
  }

  await commit(redirects, argv.values)
  done(`Restore ${redirects.length} link(s) completed.`)
}

// The 1.x answer to "how do I move to a new machine" was to back the config up
// to Cloud Storage, which now requires the paid Blaze plan. Reading the live
// Hosting release back costs nothing.
export const onPull = async argv => {
  const settings = getSettings()
  if (!settings['service-account']) {
    fail('Pull needs a service account key. Run `short-fire init` and provide one.')
  }

  info('Reading the live config from Firebase Hosting....')

  let redirects
  try {
    redirects = await fetchLiveRedirects({
      site: siteId(),
      serviceAccountFile: settings['service-account']
    })
  } catch (error) {
    fail(error.message)
  }

  saveRedirects(redirects)
  done(`Pulled ${redirects.length} link(s) from ${siteId()}.`)
}

export const onInit = async () => {
  const current = getSettings()
  const required = value => (value.trim() === '' ? 'This is required' : true)

  const projectId = await input({
    message: 'What is your Firebase project ID?',
    default: current['project-id'] || undefined,
    validate: required
  })

  const site = await input({
    message: 'What is your Firebase Hosting site ID?',
    default: current['site-id'] || projectId
  })

  const domain = await input({
    message: 'What is your domain name e.g. https://example.com',
    default: current.domain || undefined,
    validate: value => {
      if (required(value) !== true) return 'This is required'
      return isUrlValid(value) ? true : 'Must be a full URL, e.g. https://example.com'
    }
  })

  const serviceAccount = await input({
    message: 'Path to your service account key file (JSON)',
    default: current['service-account'] || undefined,
    validate: async value => {
      if (value.trim() === '') return 'This is required — `firebase login:ci` tokens are deprecated'
      try {
        await readServiceAccount(path.resolve(value))
        return true
      } catch (error) {
        return error.message
      }
    }
  })

  saveSettings({
    'project-id': projectId.trim(),
    'site-id': site.trim(),
    domain: domain.trim().replace(/\/+$/, ''),
    'service-account': path.resolve(serviceAccount.trim()),
    // A leftover 1.x CI token would silently win over the service account.
    token: ''
  })

  done('Create configulation Please run `short-fire create [url]`')
}

export const onWhere = () => {
  const table = new CliTable({ style: { head: ['green'] }, head: ['What', 'Where'] })
  table.push(['Config file', store.path])
  table.push(['Deploy workspace', workspacePath])
  table.push(['Configured', isConfigured() ? 'yes' : 'no'])
  printToscreen(table.toString())
}
