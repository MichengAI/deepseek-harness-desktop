import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { APPLY_PLUGIN_UPDATES_IPC } from '../src/dsh-process.js'
import { OFFICIAL_DSH_VERSION } from '../src/bundled-plugins.js'
import { createDesktopHostServices, ensureDesktopBridgePatch, mergeDesktopBridgePatch, officialPluginUpdateVersion, shouldRecycleAfterPluginArgs, shouldRecycleAfterPluginResult } from '../src/desktop-host.js'

test('市场安装和卸载后需要热更新 DSH', () => {
  assert.equal(shouldRecycleAfterPluginArgs(['add', 'foo@1.0.0']), true)
  assert.equal(shouldRecycleAfterPluginArgs(['remove', 'foo']), true)
  assert.equal(shouldRecycleAfterPluginArgs(['list']), false)
})

test('包没落到磁盘时不能当成安装成功并热重启', () => {
  assert.equal(shouldRecycleAfterPluginResult(['add', 'dsh-file-upload'], () => false), false)
  assert.equal(shouldRecycleAfterPluginResult(['add', 'dsh-file-upload'], () => true), true)
  assert.equal(shouldRecycleAfterPluginResult(['remove', 'dsh-file-upload'], () => false), true)
})

test('desktopPnpm 安装成功后通知桌面端热更新', async () => {
  const sent: unknown[] = []
  const host = createDesktopHostServices({
    profileName: 'web',
    profileDir: 'D:\\profile\\web',
    recycleDelayMs: 0,
    send: (message) => { sent.push(message) },
    isInstalled: () => true,
    runner: () => {
      const stdout = new PassThrough()
      const stderr = new PassThrough()
      stdout.end()
      stderr.end()
      return {
        stdout,
        stderr,
        done: Promise.resolve({ exitCode: 0, signal: null }),
        cancel: () => undefined,
      }
    },
  })
  assert.equal(host.desktopProfiles.current.name, 'web')
  assert.equal(host.desktopProfiles.connected, true)
  assert.equal(host.desktopPnpm.connected, true)
  assert.equal(typeof host.desktopPnpm.run, 'function')
  await host.desktopPnpm.runPlugin(['add', 'demo@1.0.0'], 'D:\\profile\\web').done
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.deepEqual(sent, [APPLY_PLUGIN_UPDATES_IPC])
})
test('会把桌面桥接插件写进 profile patch 顶部', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-bridge-'))
  try {
    ensureDesktopBridgePatch(root)
    const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
    assert.match(patch, /id: dsh-desktop-bridge/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('带注释的空 patch 不会再拼出非法 YAML', () => {
  const next = mergeDesktopBridgePatch('# keep\n[]\n')
  assert.match(next, /^# keep/m)
  assert.match(next, /id: dsh-desktop-bridge/)
  assert.doesNotMatch(next, /^\[\]/m)
})

test('已损坏的 bridge+空数组 patch 会被修回合法 YAML', () => {
  const broken = '- id: dsh-desktop-bridge\n  name: dsh-desktop-bridge\n# note\n[]\n'
  const next = mergeDesktopBridgePatch(broken)
  assert.match(next, /name: dsh-desktop-bridge/)
  assert.doesNotMatch(next, /^\[\]/m)
})

test('官方包更新会锁成同一个版本号', () => {
  assert.equal(officialPluginUpdateVersion(['add', '@deepseek-ai/dsh@0.1.0-rc.9']), '0.1.0-rc.9')
  assert.equal(officialPluginUpdateVersion(['update', '@deepseek-ai/dsh-attachment-local']), OFFICIAL_DSH_VERSION)
  assert.equal(officialPluginUpdateVersion(['add', '@michengai/dsh-codex-ui@0.2.61']), undefined)
})
