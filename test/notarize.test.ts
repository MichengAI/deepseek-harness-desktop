import assert from 'node:assert/strict'
import test from 'node:test'

import { assertNotarizationConfigured, isNotarizationConfigured, isNotarizationRequired } from '../scripts/notarize.mjs'

test('仅标签发布要求 macOS 公证', () => {
  assert.equal(isNotarizationRequired('refs/heads/main'), false)
  assert.equal(isNotarizationRequired('refs/tags/v0.2.0'), true)
})

test('仅凭据完整时执行 macOS 公证', () => {
  assert.equal(isNotarizationConfigured(undefined, undefined, undefined), false)
  assert.equal(isNotarizationConfigured('user@example.com', 'password', undefined), false)
  assert.equal(isNotarizationConfigured('user@example.com', 'password', 'TEAMID'), true)
  assert.doesNotThrow(() => assertNotarizationConfigured(undefined, undefined, undefined))
  assert.throws(() => assertNotarizationConfigured('user@example.com', undefined, undefined), /必须同时完整配置/)
  assert.doesNotThrow(() => assertNotarizationConfigured('user@example.com', 'password', 'TEAMID'))
})
