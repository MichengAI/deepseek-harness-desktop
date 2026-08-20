import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'

import { prependPath, resolveBundledPluginStore, resolvePluginBinDir } from '../src/plugin-toolchain.js'

test('把随包 Node 目录插到 PATH 最前，供 dsh plugin 和 code-ui 找到 pnpm', () => {
  const merged = prependPath('C:\\Windows\\System32', 'D:\\app\\resources\\node', 'win32')
  assert.equal(merged, 'D:\\app\\resources\\node;C:\\Windows\\System32')
})

test('打包态优先使用安装目录里解压后的离线仓库', () => {
  const store = resolveBundledPluginStore({
    isPackaged: true,
    resourcesPath: 'D:\\app\\resources',
    appPath: 'D:\\app',
    extractedStoreDir: 'D:\\app\\plugins\\store',
    exists: path => path === 'D:\\app\\plugins\\store',
  })
  assert.equal(store, 'D:\\app\\plugins\\store')
})

test('没有解压目录时回退 extraResources 里的离线仓库', () => {
  const store = resolveBundledPluginStore({
    isPackaged: true,
    resourcesPath: 'D:\\app\\resources',
    appPath: 'D:\\app',
    exists: path => path === join('D:\\app\\resources', 'plugins', 'store'),
  })
  assert.equal(store, join('D:\\app\\resources', 'plugins', 'store'))
})

test('开发态只在本地装配目录存在时启用补种', () => {
  const missing = resolveBundledPluginStore({
    isPackaged: false,
    resourcesPath: 'D:\\app\\resources',
    appPath: 'D:\\repo\\dsh-codex-desktop',
    exists: () => false,
  })
  assert.equal(missing, undefined)
})

test('打包态的 pnpm 与 Node 放在同一目录', () => {
  assert.equal(
    resolvePluginBinDir({ isPackaged: true, resourcesPath: 'D:\\app\\resources' }),
    join('D:\\app\\resources', 'node'),
  )
  assert.equal(
    resolvePluginBinDir({ isPackaged: false, resourcesPath: 'D:\\app\\resources' }),
    undefined,
  )
})

test('Web profile 跟随 DSH_HOME，避免写到错误用户目录', async () => {
  const { resolveWebProfileDir } = await import('../src/plugin-seed.js')
  assert.equal(resolveWebProfileDir('D:\\data\\dsh-home'), join('D:\\data\\dsh-home', 'profiles', 'web'))
})
