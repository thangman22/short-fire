import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Must happen before libs/config.js is imported: `conf` resolves its directory
// once, at construction time, and it resolves it through XDG_CONFIG_HOME.
export const tempConfigHome = fs.mkdtempSync(path.join(os.tmpdir(), 'short-fire-test-'))
process.env.XDG_CONFIG_HOME = tempConfigHome

const config = await import('../libs/config.js')
const utils = await import('../libs/utils.js')

export const modules = { config, utils }

// Runs `fn` against an empty store and leaves the store empty afterwards, so
// tests in the same file cannot leak state into each other.
export const withTempConfig = async fn => {
  const reset = () => {
    config.store.clear()
    config.saveSettings({})
    config.saveRedirects([])
  }

  reset()
  try {
    return await fn({ ...config, utils })
  } finally {
    reset()
  }
}
