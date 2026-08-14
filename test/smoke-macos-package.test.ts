import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'

import { resolveMacApplicationExecutable } from '../scripts/smoke-macos-package.mjs'

test('定位 macOS 应用包内的可执行文件', () => {
  const applicationBundle = join('release', 'DeepSeek Harness Desktop.app')
  assert.equal(
    resolveMacApplicationExecutable(applicationBundle),
    join(applicationBundle, 'Contents', 'MacOS', 'DeepSeek Harness Desktop'),
  )
})
