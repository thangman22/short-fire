import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Conf from 'conf'

// A 1.x install is a `conf` store holding the whole firebase.json under
// `firebase` and the `init` answers under `config`. Build one, then load
// libs/config.js against it and check the links survive.
const seedLegacyStore = () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'short-fire-legacy-'))
  const legacy = new Conf({
    projectName: 'short-fire',
    encryptionKey: 'short-file',
    cwd: path.join(home, 'short-fire-nodejs')
  })

  legacy.set('firebase', {
    hosting: {
      public: './',
      ignore: ['firebase.json'],
      redirects: [
        { source: '/old1', destination: 'https://one.example.com', type: 302 },
        { source: '/old2', destination: 'https://two.example.com', type: 301 }
      ]
    }
  })
  legacy.set('config', {
    'project-id': 'legacy-proj',
    token: '1//legacy-ci-token',
    domain: 'https://lnk.example',
    'service-account-key-file': '/keys/sa.json'
  })

  return home
}

test('a 1.x store is migrated on first load', async () => {
  process.env.XDG_CONFIG_HOME = seedLegacyStore()
  const config = await import('../libs/config.js')

  assert.deepEqual(config.getRedirects(), [
    { source: '/old1', destination: 'https://one.example.com', type: 302 },
    { source: '/old2', destination: 'https://two.example.com', type: 301 }
  ])

  const settings = config.getSettings()
  assert.equal(settings['project-id'], 'legacy-proj')
  assert.equal(settings.domain, 'https://lnk.example')
  // The 1.x key file path moves to its shorter 2.x name...
  assert.equal(settings['service-account'], '/keys/sa.json')
  assert.equal(settings['service-account-key-file'], undefined)
  // ...and the deprecated CI token is kept so an existing install keeps
  // deploying until the user re-runs `init`.
  assert.equal(settings.token, '1//legacy-ci-token')

  assert.equal(config.isConfigured(), true)
})
