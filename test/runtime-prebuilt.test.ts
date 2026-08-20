import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { copyPrebuiltOfficialRuntime, resolvePrebuiltOfficialRuntime } from '../src/runtime-prebuilt.js'

async function writeOfficialEntry(dir: string): Promise<void> {
  await mkdir(join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib'), { recursive: true })
  await writeFile(join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), '', 'utf8')
}

test('打包态从 extraResources 解析预装官方运行时', () => {
  const resourcesPath = 'D:\\app\\resources'
  const resolved = resolvePrebuiltOfficialRuntime({
    appPath: 'D:\\app',
    isPackaged: true,
    resourcesPath,
    exists: (path) => path === join(resourcesPath, 'dsh-runtime', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  })
  assert.equal(resolved, join(resourcesPath, 'dsh-runtime'))
})

test('预装运行时只在目标缺失时复制', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-prebuilt-'))
  try {
    const source = join(root, 'source')
    const dest = join(root, 'dest')
    await writeOfficialEntry(source)
    assert.equal(copyPrebuiltOfficialRuntime(source, dest), 'copied')
    assert.equal(copyPrebuiltOfficialRuntime(source, dest), 'skipped')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})