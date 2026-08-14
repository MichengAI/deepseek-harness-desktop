import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

test('构建产物包含所有平台冒烟脚本', () => {
  for (const script of ['smoke-macos-package.mjs', 'smoke-linux-package.mjs']) {
    assert.equal(existsSync(join('dist', 'scripts', script)), true, `缺少构建产物：${script}`)
  }
})
