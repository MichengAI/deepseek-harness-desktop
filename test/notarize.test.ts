import assert from 'node:assert/strict'
import test from 'node:test'

import { isNotarizationRequired } from '../scripts/notarize.mjs'

test('仅标签发布要求 macOS 公证', () => {
  assert.equal(isNotarizationRequired('refs/heads/main'), false)
  assert.equal(isNotarizationRequired('refs/tags/v0.2.0'), true)
})
