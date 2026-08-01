import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { withTempConfig } from './helpers.js'

const readWorkspace = (workspacePath, file) =>
  JSON.parse(fs.readFileSync(path.join(workspacePath, file), 'utf8'))

test('syncWorkspace writes a deployable firebase.json outside the package directory', async () => {
  await withTempConfig(async ({ saveSettings, saveRedirects, syncWorkspace, workspacePath }) => {
    saveSettings({ 'project-id': 'my-project', domain: 'https://exam.pl' })
    saveRedirects([{ source: '/abc', destination: 'https://example.com', type: 302 }])

    const dir = syncWorkspace()
    assert.equal(dir, workspacePath)

    const firebaseJson = readWorkspace(dir, 'firebase.json')
    assert.deepEqual(firebaseJson.hosting.redirects, [
      { source: '/abc', destination: 'https://example.com', type: 302 }
    ])
    assert.equal(firebaseJson.hosting.public, '.')

    // 1.x wrote `firebaserc`, without the leading dot, so firebase-tools never
    // read it.
    assert.deepEqual(readWorkspace(dir, '.firebaserc'), { projects: { default: 'my-project' } })

    assert.ok(fs.existsSync(path.join(dir, 'index.html')))
    assert.ok(fs.existsSync(path.join(dir, '404.html')))
  })
})

test('syncWorkspace only pins hosting.site when it differs from the project', async () => {
  await withTempConfig(async ({ saveSettings, syncWorkspace }) => {
    saveSettings({ 'project-id': 'my-project', 'site-id': 'my-project', domain: 'https://exam.pl' })
    assert.equal(readWorkspace(syncWorkspace(), 'firebase.json').hosting.site, undefined)

    saveSettings({ 'site-id': 'other-site' })
    assert.equal(readWorkspace(syncWorkspace(), 'firebase.json').hosting.site, 'other-site')
  })
})

test('isConfigured requires both a project and a domain', async () => {
  await withTempConfig(async ({ saveSettings, isConfigured }) => {
    assert.equal(isConfigured(), false)

    saveSettings({ 'project-id': 'my-project' })
    assert.equal(isConfigured(), false)

    saveSettings({ domain: 'https://exam.pl' })
    assert.equal(isConfigured(), true)
  })
})

test('siteId falls back to the project id', async () => {
  await withTempConfig(async ({ saveSettings, siteId }) => {
    saveSettings({ 'project-id': 'my-project' })
    assert.equal(siteId(), 'my-project')

    saveSettings({ 'site-id': 'links' })
    assert.equal(siteId(), 'links')
  })
})
