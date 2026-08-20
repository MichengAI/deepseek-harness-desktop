import assert from 'node:assert/strict'
import test from 'node:test'

import { applyInitialWindowState, shouldStartMaximized } from '../src/window-state.js'

test('启动默认最大化', () => {
  assert.equal(shouldStartMaximized(), true)
  let maximized = false
  applyInitialWindowState({ maximize: () => { maximized = true } })
  assert.equal(maximized, true)
})