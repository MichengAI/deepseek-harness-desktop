import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { packDirectoryToTarGz } from '../src/runtime-archive.js'
import { extractPackagedRuntimes } from '../src/extract-runtime.js'

test('已解压过的运行时不会在启动时再解一次', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-extract-'))
  try {
    const resources = join(root, 'resources')
    const installDir = join(root, 'app')
    const officialSrc = join(root, 'official')
    const storeSrc = join(root, 'store')
    await mkdir(join(officialSrc, 'node_modules', '@deepseek-ai', 'dsh', 'lib'), { recursive: true })
    await writeFile(join(officialSrc, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), 'ok', 'utf8')
    await mkdir(join(storeSrc, 'v11'), { recursive: true })
    await writeFile(join(storeSrc, 'v11', 'keep.txt'), 'store', 'utf8')
    await mkdir(resources, { recursive: true })
    packDirectoryToTarGz(officialSrc, join(resources, 'dsh-runtime.tgz'))
    packDirectoryToTarGz(storeSrc, join(resources, 'plugins-store.tgz'))
    const first = extractPackagedRuntimes(resources, installDir)
    const second = extractPackagedRuntimes(resources, installDir)
    assert.deepEqual(first, { official: true, store: true })
    assert.deepEqual(second, { official: false, store: false })
    assert.equal(await readFile(join(installDir, 'dsh-runtime', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), 'utf8'), 'ok')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
