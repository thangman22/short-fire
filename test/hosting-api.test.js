import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  fetchLiveRedirects,
  getAccessToken,
  readServiceAccount,
  toFirebaseJsonRedirect
} from '../libs/hosting-api.js'

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
})

const account = {
  client_email: 'short-fire@my-project.iam.gserviceaccount.com',
  private_key: privateKey,
  token_uri: 'https://oauth2.googleapis.com/token'
}

test('toFirebaseJsonRedirect converts the REST shape back to firebase.json', () => {
  assert.deepEqual(
    toFirebaseJsonRedirect({ glob: '/abc', location: 'https://example.com', statusCode: 302 }),
    { source: '/abc', destination: 'https://example.com', type: 302 }
  )
})

test('toFirebaseJsonRedirect keeps regex rules as regex rules', () => {
  assert.deepEqual(
    toFirebaseJsonRedirect({ regex: '/a(.*)', location: 'https://example.com', statusCode: 301 }),
    { regex: '/a(.*)', destination: 'https://example.com', type: 301 }
  )
})

test('toFirebaseJsonRedirect defaults a missing status code to a temporary redirect', () => {
  assert.equal(toFirebaseJsonRedirect({ glob: '/a', location: 'https://b.co' }).type, 302)
})

test('getAccessToken sends a verifiable RS256 JWT bearer assertion', async () => {
  let seen
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    seen = { url, body: new URLSearchParams(options.body) }
    return new Response(JSON.stringify({ access_token: 'ya29.test' }), { status: 200 })
  }

  try {
    assert.equal(await getAccessToken(account), 'ya29.test')
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(seen.url, account.token_uri)
  assert.equal(seen.body.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer')

  const [header, claim, signature] = seen.body.get('assertion').split('.')
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' })

  const parsedClaim = JSON.parse(Buffer.from(claim, 'base64url'))
  assert.equal(parsedClaim.iss, account.client_email)
  assert.equal(parsedClaim.aud, account.token_uri)
  assert.equal(parsedClaim.exp - parsedClaim.iat, 3600)

  const verified = crypto
    .createVerify('RSA-SHA256')
    .update(`${header}.${claim}`)
    .verify(privateKey, Buffer.from(signature, 'base64url'))
  assert.equal(verified, true)
})

test('getAccessToken surfaces the OAuth error instead of returning undefined', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid JWT' }), { status: 400 })

  try {
    await assert.rejects(getAccessToken(account), /Invalid JWT/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

const writeKeyFile = contents => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'short-fire-key-')), 'key.json')
  fs.writeFileSync(file, JSON.stringify(contents))
  return file
}

test('readServiceAccount rejects a JSON file that is not a key', async () => {
  await assert.rejects(readServiceAccount(writeKeyFile({ project_id: 'x' })), /client_email/)
})

// Stubs the two calls fetchLiveRedirects makes: the OAuth exchange and
// releases.list.
const stubHosting = releases => {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push(String(url))
    if (String(url).includes('oauth2')) {
      return new Response(JSON.stringify({ access_token: 'ya29.test' }), { status: 200 })
    }
    assert.equal(options.headers.authorization, 'Bearer ya29.test')
    return new Response(JSON.stringify({ releases }), { status: 200 })
  }
  return calls
}

test('fetchLiveRedirects returns the live list in firebase.json shape', async () => {
  const originalFetch = globalThis.fetch
  const calls = stubHosting([
    {
      version: {
        name: 'sites/links/versions/abc',
        config: {
          redirects: [
            { glob: '/abc', location: 'https://example.com', statusCode: 302 },
            { glob: '/xyz', location: 'https://example.org', statusCode: 301 }
          ]
        }
      }
    }
  ])

  try {
    const redirects = await fetchLiveRedirects({
      site: 'links',
      serviceAccountFile: writeKeyFile(account)
    })

    assert.deepEqual(redirects, [
      { source: '/abc', destination: 'https://example.com', type: 302 },
      { source: '/xyz', destination: 'https://example.org', type: 301 }
    ])
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.ok(calls.some(url => url.includes('/sites/links/releases?pageSize=1')))
})

test('fetchLiveRedirects explains an empty site instead of throwing on undefined', async () => {
  const originalFetch = globalThis.fetch
  stubHosting([])

  try {
    await assert.rejects(
      fetchLiveRedirects({ site: 'links', serviceAccountFile: writeKeyFile(account) }),
      /no release yet/
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
