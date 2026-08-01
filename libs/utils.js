import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import qrcode from 'qrcode-terminal'
import { getSettings, syncWorkspace } from './config.js'

// No 0/O/1/l/I so a link stays readable when it is dictated or printed.
const SLUG_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const printToscreen = content => console.log(content)

export const isUrlValid = userInput => {
  let url
  try {
    url = new URL(userInput)
  } catch {
    return false
  }

  // Firebase Hosting needs an absolute destination it can put in a Location
  // header, so a scheme is mandatory.
  return url.protocol === 'http:' || url.protocol === 'https:'
}

export const generateSlug = (length = 7) => {
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += SLUG_ALPHABET[crypto.randomInt(SLUG_ALPHABET.length)]
  }
  return slug
}

export const genQrcode = url =>
  new Promise(resolve => qrcode.generate(url, { small: true }, resolve))

// eslint-disable-next-line no-control-regex
const ANSI = /\u001B\[[0-9;]*m/g
const visibleLength = text => text.replace(ANSI, '').length

export const textBox = text => {
  const lines = text.split('\n')
  const width = Math.max(...lines.map(visibleLength)) + 2
  const padded = lines.map(line => `│ ${line}${' '.repeat(width - visibleLength(line) - 2)} │`)

  printToscreen([
    `┌${'─'.repeat(width)}┐`,
    ...padded,
    `└${'─'.repeat(width)}┘`
  ].join('\n'))
}

export const deploy = async (options = {}) => {
  const workspace = syncWorkspace()
  // `--dry-run` regenerates the workspace but never talks to Firebase, which
  // keeps the command testable without credentials.
  if (options['dry-run']) return workspace

  const settings = getSettings()
  const deployOptions = {
    project: settings['project-id'],
    only: 'hosting',
    cwd: workspace,
    nonInteractive: true,
    force: true
  }

  // Prefer a service account: `firebase login:ci` tokens are deprecated and
  // firebase-tools warns on every deploy that uses one. A 1.x config can carry
  // a key path that no longer exists, so fall back rather than fail.
  if (settings['service-account'] && existsSync(settings['service-account'])) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = settings['service-account']
  } else if (settings.token) {
    deployOptions.token = settings.token
  } else if (settings['service-account']) {
    throw new Error(`Service account key not found at ${settings['service-account']}. Run \`short-fire init\` to point at the right file.`)
  } else {
    throw new Error('No credentials configured. Run `short-fire init`.')
  }

  // firebase-tools is by far the heaviest import in the tree; loading it here
  // keeps `list`, `dump` and `where` instant.
  const { default: client } = await import('firebase-tools')
  await client.deploy(deployOptions)
  return workspace
}

export const shortUrl = slug => `${getSettings().domain.replace(/\/+$/, '')}/${slug}`
