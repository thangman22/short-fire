import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Conf from 'conf'

// The encryption key is inherited from short-fire 1.x so that an existing
// config file keeps opening after the upgrade. It is obfuscation, not secrecy.
export const store = new Conf({
  projectName: 'short-fire',
  encryptionKey: 'short-file'
})

// 1.x wrote its Firebase workspace inside the package directory, which is
// read-only for a global `npm i -g` install. Keep it next to the config file.
export const workspacePath = path.join(path.dirname(store.path), 'workspace')

const templatePath = fileURLToPath(new URL('../template/', import.meta.url))

const EMPTY_SETTINGS = {
  'project-id': '',
  'site-id': '',
  domain: '',
  'service-account': '',
  token: ''
}

export const cliTableConfig = {
  style: { head: ['green'] },
  head: ['Short URL', 'Full URL']
}

// --- 1.x migration ----------------------------------------------------------

// 1.x kept the whole firebase.json under `firebase` and the answers to `init`
// under `config`. 2.x keeps a flat settings object and a bare redirect list.
const migrate = () => {
  if (store.has('settings')) return

  const legacySettings = store.get('config')
  const legacyFirebase = store.get('firebase')
  if (!legacySettings && !legacyFirebase) return

  store.set('settings', {
    ...EMPTY_SETTINGS,
    'project-id': legacySettings?.['project-id'] ?? '',
    domain: legacySettings?.domain ?? '',
    // 1.x stored the key file path under a longer name.
    'service-account': legacySettings?.['service-account-key-file'] ?? '',
    token: legacySettings?.token ?? ''
  })
  store.set('redirects', legacyFirebase?.hosting?.redirects ?? [])
}

migrate()

// --- settings ---------------------------------------------------------------

export const getSettings = () => ({ ...EMPTY_SETTINGS, ...(store.get('settings') ?? {}) })

export const saveSettings = patch => {
  store.set('settings', { ...getSettings(), ...patch })
}

export const isConfigured = () => {
  const settings = getSettings()
  return Boolean(settings['project-id'] && settings.domain)
}

export const siteId = () => {
  const settings = getSettings()
  return settings['site-id'] || settings['project-id']
}

// --- redirects --------------------------------------------------------------

export const getRedirects = () => store.get('redirects') ?? []

export const saveRedirects = redirects => store.set('redirects', redirects)

export const buildFirebaseJson = () => {
  const settings = getSettings()
  const hosting = {
    public: '.',
    ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
    redirects: getRedirects()
  }

  // Only pin the site when it differs from the project's default site, so a
  // single-site project keeps working even before `hosting:sites` is set up.
  if (settings['site-id'] && settings['site-id'] !== settings['project-id']) {
    hosting.site = settings['site-id']
  }

  return { hosting }
}

// --- workspace --------------------------------------------------------------

// Materialise the directory that firebase-tools deploys from: the static
// pages plus a freshly generated firebase.json / .firebaserc.
export const syncWorkspace = () => {
  fs.mkdirSync(workspacePath, { recursive: true })

  for (const file of fs.readdirSync(templatePath)) {
    fs.copyFileSync(path.join(templatePath, file), path.join(workspacePath, file))
  }

  const write = (name, data) =>
    fs.writeFileSync(path.join(workspacePath, name), JSON.stringify(data, null, 2) + '\n')

  write('firebase.json', buildFirebaseJson())
  // 1.x wrote this as `firebaserc` without the leading dot, so firebase-tools
  // never picked it up.
  write('.firebaserc', { projects: { default: getSettings()['project-id'] } })

  return workspacePath
}
