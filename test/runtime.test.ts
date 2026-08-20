import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { OFFICIAL_LAUNCH_PEERS } from '../src/bundled-plugins.js'
import { resolveDshRuntime } from '../src/runtime.js'

async function writeOfficialEntry(dir: string): Promise<void> {
  await mkdir(join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib'), { recursive: true })
  await writeFile(join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), '', 'utf8')
}

async function writeLaunchPeer(dir: string): Promise<void> {
  for (const peer of OFFICIAL_LAUNCH_PEERS) {
    const peerDir = join(dir, 'node_modules', ...peer.packageName.split('/'))
    await mkdir(peerDir, { recursive: true })
    await writeFile(join(peerDir, 'package.json'), '{}', 'utf8')
  }
}

test('官方运行时优先使用桌面独立目录', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-pick-'))
  try {
    const profile = join(root, 'profile')
    const desktop = join(root, 'desktop')
    await writeOfficialEntry(profile)
    await writeOfficialEntry(desktop)
    await writeLaunchPeer(desktop)
    const runtime = resolveDshRuntime({
      appPath: root,
      isPackaged: true,
      resourcesPath: join(root, 'resources'),
      profileDir: profile,
      desktopRuntimeDir: desktop,
    })
    assert.equal(runtime.root, desktop)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('桌面运行时可用时不使用 profile 里的官方包', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-profile-'))
  try {
    const profile = join(root, 'profile')
    const desktop = join(root, 'desktop')
    await writeOfficialEntry(profile)
    await writeLaunchPeer(profile)
    await writeOfficialEntry(desktop)
    await writeLaunchPeer(desktop)
    const runtime = resolveDshRuntime({
      appPath: root,
      isPackaged: true,
      resourcesPath: join(root, 'resources'),
      profileDir: profile,
      desktopRuntimeDir: desktop,
    })
    assert.equal(runtime.root, desktop)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})