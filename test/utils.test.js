import test from 'node:test'
import assert from 'node:assert/strict'
import { withTempConfig } from './helpers.js'

const { isUrlValid, generateSlug } = await import('../libs/utils.js')

test('isUrlValid accepts absolute http(s) URLs', () => {
  assert.equal(isUrlValid('https://example.com'), true)
  assert.equal(isUrlValid('http://example.com/a/b?c=d#e'), true)
})

test('isUrlValid rejects anything Firebase cannot put in a Location header', () => {
  // The 1.x regex matched all of these.
  assert.equal(isUrlValid('example.com'), false)
  assert.equal(isUrlValid('not a url'), false)
  assert.equal(isUrlValid(''), false)
  assert.equal(isUrlValid('javascript:alert(1)'), false)
  assert.equal(isUrlValid('ftp://example.com'), false)
})

test('generateSlug produces the requested length from an unambiguous alphabet', () => {
  for (let i = 0; i < 200; i++) {
    const slug = generateSlug()
    assert.equal(slug.length, 7)
    assert.match(slug, /^[a-km-zA-HJ-NP-Z2-9]+$/)
  }
  assert.equal(generateSlug(12).length, 12)
})

test('generateSlug does not repeat itself over a small sample', () => {
  const slugs = new Set(Array.from({ length: 500 }, () => generateSlug()))
  assert.equal(slugs.size, 500)
})

test('shortUrl joins the configured domain without doubling the slash', async () => {
  await withTempConfig(async ({ saveSettings, utils }) => {
    saveSettings({ domain: 'https://example.com/' })
    assert.equal(utils.shortUrl('abc'), 'https://example.com/abc')

    saveSettings({ domain: 'https://example.com' })
    assert.equal(utils.shortUrl('abc'), 'https://example.com/abc')
  })
})
