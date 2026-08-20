import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('主进程安装全局异常兜底并复用统一退出清理', async () => {
  const source = await readFile(new URL('../../src/main.ts', import.meta.url), 'utf8')
  assert.match(source, /process\.on\('uncaughtException'/)
  assert.match(source, /process\.on\('unhandledRejection'/)
  assert.match(source, /async function shutdownDesktop/)
  assert.equal((source.match(/quitDesktopApp\(/g) ?? []).length, 1)
})

test('缺少离线 store 时仍执行官方清理和补种入口', async () => {
  const source = await readFile(new URL('../../src/main.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /if \(pluginStoreDir !== undefined\) \{\s*try \{\s*const seeded = await seedBundledPlugins/)
})
