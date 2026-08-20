import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractTarGz, verifyFileSha256 } from './runtime-archive.js'

function officialEntry(dir: string): string {
  return join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

/** 首启把随包压缩包原子解压到已选定的可写目录。 */
export function extractPackagedRuntimes(resourcesDir: string, officialDest: string, storeDest: string): { official: boolean; store: boolean } {
  const officialArchive = join(resourcesDir, 'dsh-runtime.tgz')
  const storeArchive = join(resourcesDir, 'plugins-store.tgz')
  return {
    official: extractOnce(officialArchive, officialDest, officialEntry),
    store: extractOnce(storeArchive, storeDest, dir => join(dir, 'v11')),
  }
}

function extractOnce(archivePath: string, destDir: string, readyPath: (dir: string) => string): boolean {
  const completeMarker = join(destDir, '.dsh-extract-complete')
  if (!existsSync(archivePath)) return false
  if (existsSync(completeMarker) && existsSync(readyPath(destDir))) return false
  rmSync(completeMarker, { force: true })
  verifyFileSha256(archivePath)
  mkdirSync(dirname(destDir), { recursive: true })
  const stagingDir = mkdtempSync(join(dirname(destDir), `.${basename(destDir)}-`))
  try {
    extractTarGz(archivePath, stagingDir)
    if (!existsSync(readyPath(stagingDir))) throw new Error(`压缩包内容不完整：${archivePath}`)
    if (existsSync(completeMarker)) return false
    if (process.platform === 'win32') {
      mkdirSync(destDir, { recursive: true })
      cpSync(stagingDir, destDir, { recursive: true, force: true })
    } else {
      rmSync(destDir, { recursive: true, force: true })
      renameSync(stagingDir, destDir)
    }
    writeFileSync(completeMarker, '', 'utf8')
    return true
  } finally {
    rmSync(stagingDir, { recursive: true, force: true })
  }
}

const self = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === self) {
  const installDir = process.argv[2] ?? dirname(dirname(self))
  const resourcesDir = process.argv[3] ?? join(installDir, 'resources')
  extractPackagedRuntimes(resourcesDir, join(installDir, 'dsh-runtime'), join(installDir, 'plugins', 'store'))
}
