import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

/** 把目录打成单个 tar.gz，避免安装器解压上万个小文件。 */
export function packDirectoryToTarGz(sourceDir: string, archivePath: string): void {
  if (!existsSync(sourceDir)) throw new Error(`压缩源目录不存在：${sourceDir}`)
  const result = spawnSync('tar', ['-czf', archivePath, '-C', sourceDir, '.'], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) {
    throw new Error(`压缩失败：${(result.stderr || result.stdout || archivePath).trim()}`)
  }
}

/** 首启把随包压缩包解到可写目录。 */
export function extractTarGz(archivePath: string, destDir: string): void {
  if (!existsSync(archivePath)) throw new Error(`压缩包不存在：${archivePath}`)
  mkdirSync(destDir, { recursive: true })
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) {
    throw new Error(`解压失败：${(result.stderr || result.stdout || archivePath).trim()}`)
  }
}
