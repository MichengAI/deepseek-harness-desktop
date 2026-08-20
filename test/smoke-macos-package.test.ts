import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

import { resolveMacApplicationExecutable } from '../scripts/smoke-macos-package.mjs'

test('定位 macOS 应用包内的可执行文件', () => {
  const applicationBundle = join('release', 'DSH Codex Desktop.app')
  assert.equal(
    resolveMacApplicationExecutable(applicationBundle),
    join(applicationBundle, 'Contents', 'MacOS', 'DSH Codex Desktop'),
  )
})

test('macOS 冒烟检查保留应用输出用于诊断启动失败', async () => {
  const source = await readFile(new URL('../scripts/smoke-macos-package.mjs', import.meta.url), 'utf8')
  assert.match(source, /stdio: \['ignore', 'pipe', 'pipe'\]/)
  assert.match(source, /applicationOutput/)
  assert.match(source, /const startupTimeoutMs = 120_000/)
})
