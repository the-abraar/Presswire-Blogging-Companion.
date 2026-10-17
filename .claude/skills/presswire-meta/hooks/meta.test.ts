import { expect, test } from 'claude-code/testing'

import { checkMeta, skeleton } from './meta'

const ok = skeleton(3, 'mods', 'T', '2026-10-06')

test('skeleton passes its own check', () => {
  expect(checkMeta(ok, 3)).toBe(null)
})
test('number mismatch, bad JSON, unknown platform, bad url', () => {
  expect(checkMeta(ok, 4) !== null).toBe(true)
  expect(checkMeta('{', 3)).toBe('not valid JSON')
  const bad = JSON.parse(ok)
  bad.platforms = { twitter: { url: '' } }
  expect(checkMeta(JSON.stringify(bad), 3) !== null).toBe(true)
  bad.platforms = {}
  bad.canonical_url = 'dev.to/x'
  expect(checkMeta(JSON.stringify(bad), 3) !== null).toBe(true)
  delete bad.canonical_url
  bad.platforms = { devto: { url: 'dev.to/x' } }
  expect(checkMeta(JSON.stringify(bad), 3) !== null).toBe(true)
})
