import crypto from 'node:crypto'
import fs from 'node:fs/promises'

const HOSTING_API = 'https://firebasehosting.googleapis.com/v1beta1'
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

const base64url = input => Buffer.from(input).toString('base64url')

export const readServiceAccount = async file => {
  const raw = await fs.readFile(file, 'utf8')
  const account = JSON.parse(raw)

  for (const field of ['client_email', 'private_key']) {
    if (!account[field]) {
      throw new Error(`${file} is not a service account key (missing "${field}")`)
    }
  }

  return account
}

// Self-signed JWT flow (RFC 7523) so that reading the live config needs no
// dependency beyond node:crypto.
export const getAccessToken = async account => {
  const tokenUri = account.token_uri ?? 'https://oauth2.googleapis.com/token'
  const issued = Math.floor(Date.now() / 1000)

  const claim = {
    iss: account.client_email,
    scope: SCOPE,
    aud: tokenUri,
    iat: issued,
    exp: issued + 3600
  }

  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify(claim))}`
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url')

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`
    })
  })

  const body = await response.json()
  if (!response.ok) {
    throw new Error(`Could not exchange the service account key for a token: ${body.error_description ?? body.error ?? response.status}`)
  }

  return body.access_token
}

const request = async (accessToken, url) => {
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } })
  const body = await response.json()

  if (!response.ok) {
    throw new Error(`Firebase Hosting API ${response.status}: ${body.error?.message ?? 'unknown error'}`)
  }

  return body
}

// The REST API speaks {glob|regex, location, statusCode}; firebase.json speaks
// {source|regex, destination, type}. Translate so a pulled list is directly
// deployable again.
export const toFirebaseJsonRedirect = redirect => {
  const local = redirect.glob !== undefined
    ? { source: redirect.glob }
    : { regex: redirect.regex }

  return { ...local, destination: redirect.location, type: redirect.statusCode ?? 302 }
}

// Read back the redirect list that is actually live on the site. This is what
// makes a second machine (or a lost config file) recoverable without paying
// for Cloud Storage.
export const fetchLiveRedirects = async ({ site, serviceAccountFile }) => {
  const account = await readServiceAccount(serviceAccountFile)
  const accessToken = await getAccessToken(account)

  const { releases = [] } = await request(accessToken, `${HOSTING_API}/sites/${encodeURIComponent(site)}/releases?pageSize=1`)
  const [release] = releases

  if (!release?.version) {
    throw new Error(`Site "${site}" has no release yet. Run \`short-fire create\` once to publish one.`)
  }

  // releases.list usually inlines the version config; fall back to versions.get
  // when it does not.
  const config = release.version.config ??
    (await request(accessToken, `${HOSTING_API}/${release.version.name}`)).config

  return (config?.redirects ?? []).map(toFirebaseJsonRedirect)
}
