import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveMacApplicationExecutable } from '../scripts/smoke-macos-package.mjs'

test('定位 macOS 应用包内的可执行文件', () => {
  assert.equal(
    resolveMacApplicationExecutable('C:\\release\\DeepSeek Harness Desktop.app'),
    'C:\\release\\DeepSeek Harness Desktop.app\\Contents\\MacOS\\DeepSeek Harness Desktop',
  )
})
