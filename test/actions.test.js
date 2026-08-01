import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import './helpers.js'

const { parseBackup } = await import('../libs/actions.js')

const legacyBackup = fs.readFileSync(
  fileURLToPath(new URL('./fixtures/legacy-backup.json', import.meta.url)),
  'utf8'
)

test('parseBackup reads a 1.x dump, which was the whole firebase.json', () => {
  assert.deepEqual(parseBackup(legacyBackup), [
    { source: '/firebase', destination: 'https://firebase.google.com/', type: 302 }
  ])
})

test('parseBackup reads a 2.x dump, which is a bare redirect list', () => {
  const dump = JSON.stringify([{ source: '/a', destination: 'https://example.com', type: 301 }])
  assert.deepEqual(parseBackup(dump), [
    { source: '/a', destination: 'https://example.com', type: 301 }
  ])
})

test('parseBackup defaults a missing redirect type', () => {
  const dump = JSON.stringify([{ source: '/a', destination: 'https://example.com' }])
  assert.equal(parseBackup(dump)[0].type, 302)
})

test('parseBackup rejects a file that is not a backup', () => {
  assert.throws(() => parseBackup('{"hello":"world"}'), /redirect list/)
  assert.throws(() => parseBackup('[{"source":"/a"}]'), /source or destination/)
  assert.throws(() => parseBackup('not json'))
})
