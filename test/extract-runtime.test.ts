import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { packDirectoryToTarGz, writeFileSha256 } from '../src/runtime-archive.js'
import { extractPackagedRuntimes } from '../src/extract-runtime.js'

function createChecksums(resources: string): void {
  writeFileSha256(join(resources, 'dsh-runtime.tgz'))
  writeFileSha256(join(resources, 'plugins-store.tgz'))
}

test('已解压过的运行时不会重复解压，内容缺失时会自愈', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-extract-'))
  try {
    const resources = join(root, 'resources')
    const officialSrc = join(root, 'official')
    const storeSrc = join(root, 'store')
    await mkdir(join(officialSrc, 'node_modules', '@deepseek-ai', 'dsh', 'lib'), { recursive: true })
    await writeFile(join(officialSrc, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), 'ok', 'utf8')
    await mkdir(join(storeSrc, 'v11'), { recursive: true })
    await writeFile(join(storeSrc, 'v11', 'keep.txt'), 'store', 'utf8')
    await mkdir(resources, { recursive: true })
    packDirectoryToTarGz(officialSrc, join(resources, 'dsh-runtime.tgz'))
    packDirectoryToTarGz(storeSrc, join(resources, 'plugins-store.tgz'))
    createChecksums(resources)
    const runtimeDir = join(root, 'app', 'dsh-runtime')
    const storeDir = join(root, 'app', 'plugins', 'store')
    assert.deepEqual(extractPackagedRuntimes(resources, runtimeDir, storeDir), { official: true, store: true })
    assert.deepEqual(extractPackagedRuntimes(resources, runtimeDir, storeDir), { official: false, store: false })
    await unlink(join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'))
    assert.deepEqual(extractPackagedRuntimes(resources, runtimeDir, storeDir), { official: true, store: false })
    assert.equal(await readFile(join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), 'utf8'), 'ok')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('运行时和插件仓库可以解压到用户数据回退目录', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-extract-fallback-'))
  try {
    const resources = join(root, 'resources')
    const officialSrc = join(root, 'official')
    const storeSrc = join(root, 'store')
    const runtimeDir = join(root, 'user-data', 'dsh-runtime')
    const storeDir = join(root, 'user-data', 'plugins', 'store')
    await mkdir(join(officialSrc, 'node_modules', '@deepseek-ai', 'dsh', 'lib'), { recursive: true })
    await writeFile(join(officialSrc, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), 'ok', 'utf8')
    await mkdir(join(storeSrc, 'v11'), { recursive: true })
    await writeFile(join(storeSrc, 'v11', 'keep.txt'), 'store', 'utf8')
    await mkdir(resources, { recursive: true })
    packDirectoryToTarGz(officialSrc, join(resources, 'dsh-runtime.tgz'))
    packDirectoryToTarGz(storeSrc, join(resources, 'plugins-store.tgz'))
    createChecksums(resources)
    assert.deepEqual(extractPackagedRuntimes(resources, runtimeDir, storeDir), { official: true, store: true })
    assert.equal(await readFile(join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), 'utf8'), 'ok')
    assert.equal(await readFile(join(storeDir, 'v11', 'keep.txt'), 'utf8'), 'store')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('随包归档被篡改时拒绝解压', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-extract-hash-'))
  try {
    const resources = join(root, 'resources')
    const source = join(root, 'source')
    await mkdir(join(source, 'node_modules', '@deepseek-ai', 'dsh', 'lib'), { recursive: true })
    await writeFile(join(source, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), 'ok', 'utf8')
    await mkdir(resources)
    const archive = join(resources, 'dsh-runtime.tgz')
    packDirectoryToTarGz(source, archive)
    writeFileSha256(archive)
    await writeFile(archive, 'tampered', 'utf8')
    assert.throws(() => extractPackagedRuntimes(resources, join(root, 'runtime'), join(root, 'store')), /SHA256/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
