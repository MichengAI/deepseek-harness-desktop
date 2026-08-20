import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

interface PrebuiltLookup {
  appPath: string
  isPackaged: boolean
  resourcesPath: string
  exists?: (path: string) => boolean
}

export function officialRuntimeEntry(dir: string): string {
  return join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

export function resolvePrebuiltOfficialRuntime(options: PrebuiltLookup): string | undefined {
  const exists = options.exists ?? existsSync
  const candidates = options.isPackaged
    ? [join(options.resourcesPath, 'dsh-runtime')]
    : [join(options.appPath, 'runtime-dsh')]
  return candidates.find((candidate) => exists(officialRuntimeEntry(candidate)))
}

/** 首启复制预装运行时，避免现场 pnpm add 整棵官方依赖。 */
export function copyPrebuiltOfficialRuntime(sourceDir: string, destDir: string): 'copied' | 'skipped' | 'missing' {
  if (existsSync(officialRuntimeEntry(destDir))) return 'skipped'
  if (!existsSync(officialRuntimeEntry(sourceDir))) return 'missing'
  mkdirSync(destDir, { recursive: true })
  cpSync(sourceDir, destDir, { recursive: true, force: false })
  return existsSync(officialRuntimeEntry(destDir)) ? 'copied' : 'missing'
}