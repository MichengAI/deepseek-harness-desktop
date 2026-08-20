import { spawnSync } from 'node:child_process'
import { createHash, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

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
  const listed = spawnSync('tar', ['-tzf', archivePath], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  })
  if (listed.status !== 0) {
    throw new Error(`无法读取压缩包目录：${(listed.error?.message || listed.stderr || archivePath).trim()}`)
  }
  validateArchiveEntries(listed.stdout.split(/\r?\n/))
  mkdirSync(destDir, { recursive: true })
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) {
    throw new Error(`解压失败：${(result.stderr || result.stdout || archivePath).trim()}`)
  }
}

export function writeFileSha256(path: string): void {
  writeFileSync(`${path}.sha256`, `${fileSha256(path)}\n`, 'utf8')
}

export function verifyFileSha256(path: string): void {
  const checksumPath = `${path}.sha256`
  if (!existsSync(checksumPath)) throw new Error(`缺少 SHA256 校验文件：${checksumPath}`)
  const expected = readFileSync(checksumPath, 'utf8').trim().toLowerCase()
  const actual = fileSha256(path)
  if (!/^[a-f0-9]{64}$/.test(expected) || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))) {
    throw new Error(`SHA256 校验失败：${path}`)
  }
}

function fileSha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function validateArchiveEntries(entries: readonly string[]): void {
  for (const entry of entries) {
    if (entry === '') continue
    const normalized = entry.replace(/\\/g, '/')
    if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || normalized.split('/').includes('..')) {
      throw new Error(`压缩包包含不安全路径：${entry}`)
    }
  }
}
