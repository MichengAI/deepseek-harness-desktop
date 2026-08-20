import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function extractTarGz(archivePath: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true })
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) {
    throw new Error(`解压失败：${(result.stderr || result.stdout || archivePath).trim()}`)
  }
}

function officialEntry(dir: string): string {
  return join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

/** 安装阶段或首启把随包压缩包解到安装目录，避免启动时再卡很久。 */
export function extractPackagedRuntimes(resourcesDir: string, installDir: string): { official: boolean; store: boolean } {
  const officialDest = join(installDir, 'dsh-runtime')
  const storeDest = join(installDir, 'plugins', 'store')
  let official = false
  let store = false
  const officialArchive = join(resourcesDir, 'dsh-runtime.tgz')
  if (existsSync(officialArchive) && !existsSync(officialEntry(officialDest))) {
    extractTarGz(officialArchive, officialDest)
    official = true
  }
  const storeArchive = join(resourcesDir, 'plugins-store.tgz')
  if (existsSync(storeArchive) && !existsSync(join(storeDest, 'v11'))) {
    extractTarGz(storeArchive, storeDest)
    store = true
  }
  return { official, store }
}

const self = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === self) {
  const installDir = process.argv[2] ?? dirname(dirname(self))
  const resourcesDir = process.argv[3] ?? join(installDir, 'resources')
  extractPackagedRuntimes(resourcesDir, installDir)
}
