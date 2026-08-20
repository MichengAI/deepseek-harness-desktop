import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { APPLY_PLUGIN_UPDATES_IPC } from '../src/dsh-process.js'
import { OFFICIAL_DSH_VERSION } from '../src/bundled-plugins.js'
import { createDesktopHostServices, DESKTOP_BRIDGE_FILES, ensureDesktopBridgePatch, installDesktopBridge, mergeDesktopBridgePatch, officialPluginUpdateVersion, shouldRecycleAfterPluginArgs, shouldRecycleAfterPluginResult } from '../src/desktop-host.js'

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

test('安装失败时不得把残留包写进运行清单或重启', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-failed-install-'))
  try {
    await mkdir(join(root, 'node_modules', 'dsh-file-upload'), { recursive: true })
    await writeFile(join(root, 'node_modules', 'dsh-file-upload', 'package.json'), JSON.stringify({
      name: 'dsh-file-upload',
      dsh: { bundle: { patch: 'cordis.patch.yml' } },
    }), 'utf8')
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { 'dsh-file-upload': '^0.4.3' },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } },
    }), 'utf8')
    const sent: unknown[] = []
    const host = createDesktopHostServices({
      profileName: 'web',
      profileDir: root,
      recycleDelayMs: 0,
      send: (message) => { sent.push(message) },
      runner: () => {
        const stdout = new PassThrough()
        const stderr = new PassThrough()
        stdout.end()
        stderr.end()
        return {
          stdout,
          stderr,
          done: Promise.resolve({ exitCode: 1, signal: null }),
          cancel: () => undefined,
        }
      },
    })
    await host.desktopPnpm.runPlugin(['add', 'dsh-file-upload@0.4.3'], root).done
    await new Promise((resolve) => setTimeout(resolve, 10))
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { dsh?: { profile?: { bundles?: string[] } } }
    assert.equal(manifest.dsh?.profile?.bundles?.includes('dsh-file-upload'), false)
    assert.deepEqual(sent, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('pnpm 成功退出时不应因可选依赖脚本提示阻断热更新', async () => {
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
      queueMicrotask(() => {
        stdout.end('Ignored build scripts: sharp, tesseract.js')
        stderr.end()
      })
      return {
        stdout,
        stderr,
        done: Promise.resolve({ exitCode: 0, signal: null }),
        cancel: () => undefined,
      }
    },
  })
  await host.desktopPnpm.runPlugin(['add', 'dsh-file-upload@0.4.3'], 'D:\\profile\\web').done
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

test('官方运行时卸载会返回明确失败而不是伪成功', async () => {
  const host = createDesktopHostServices({
    profileName: 'web',
    profileDir: 'D:\\profile\\web',
    desktopRuntimeDir: 'D:\\runtime',
  })
  const handle = host.desktopPnpm.runPlugin(['remove', '@deepseek-ai/dsh'], 'D:\\profile\\web')
  let stderr = ''
  handle.stderr.on('data', chunk => { stderr += chunk.toString('utf8') })
  assert.deepEqual(await handle.done, { exitCode: 1, signal: null })
  assert.match(stderr, /不能从插件市场卸载/)
})

test('官方 peer 不会被单独安装进 Web profile', async () => {
  const host = createDesktopHostServices({
    profileName: 'web',
    profileDir: 'D:\\profile\\web',
    desktopRuntimeDir: 'D:\\runtime',
    runner: () => { throw new Error('不应调用 profile pnpm') },
  })
  const handle = host.desktopPnpm.runPlugin(['add', '@deepseek-ai/cordis-plugin-group@1.0.2'], 'D:\\profile\\web')
  let stderr = ''
  handle.stderr.on('data', chunk => { stderr += chunk.toString('utf8') })
  assert.deepEqual(await handle.done, { exitCode: 1, signal: null })
  assert.match(stderr, /不能单独安装到 Web profile/)
})

test('安装桌面桥接时缺少任一依赖都会立即失败', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-bridge-files-'))
  const source = join(root, 'source')
  const profile = join(root, 'profile')
  try {
    await mkdir(source, { recursive: true })
    await writeFile(join(source, DESKTOP_BRIDGE_FILES[0]), '', 'utf8')
    assert.throws(() => installDesktopBridge(profile, source), /桌面桥接文件缺失/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('后续成功安装不会激活上次失败留下的无关依赖', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-stale-install-'))
  try {
    for (const packageName of ['stale-plugin', 'good-plugin']) {
      await mkdir(join(root, 'node_modules', packageName), { recursive: true })
      await writeFile(join(root, 'node_modules', packageName, 'package.json'), JSON.stringify({
        name: packageName,
        dsh: { bundle: { patch: 'cordis.patch.yml' } },
      }), 'utf8')
    }
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { 'stale-plugin': '1.0.0', 'good-plugin': '1.0.0' },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } },
    }), 'utf8')
    const host = createDesktopHostServices({
      profileName: 'web',
      profileDir: root,
      recycleDelayMs: 0,
      runner: () => successfulHandle(),
    })
    await host.desktopPnpm.runPlugin(['add', 'good-plugin@1.0.0'], root).done
    await new Promise(resolve => setTimeout(resolve, 10))
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { dsh?: { profile?: { bundles?: string[] } } }
    assert.equal(manifest.dsh?.profile?.bundles?.includes('good-plugin'), true)
    assert.equal(manifest.dsh?.profile?.bundles?.includes('stale-plugin'), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

function successfulHandle() {
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
}
