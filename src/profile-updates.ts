import { join } from 'node:path'

import { isOfficialDshPackage } from './bundled-plugins.js'

export const PROFILE_PENDING_UPDATES_FILE = '.dsh-pending-updates.json'

export interface ProfilePackageUpdate {
  packageName: string
  version: string
}

/** 关于页和桌面端共用的待更新清单文件名。 */
export function resolvePendingUpdatesPath(profileDir: string): string {
  return join(profileDir, PROFILE_PENDING_UPDATES_FILE)
}

export function parsePendingUpdates(raw: string): ProfilePackageUpdate[] {
  const parsed = JSON.parse(raw) as { packages?: unknown }
  if (!Array.isArray(parsed.packages)) return []
  return parsed.packages.flatMap((item) => {
    if (item === null || typeof item !== 'object') return []
    const record = item as { packageName?: unknown; version?: unknown }
    if (typeof record.packageName !== 'string' || typeof record.version !== 'string') return []
    return [{ packageName: record.packageName, version: record.version }]
  })
}

export function partitionPackageUpdates(updates: readonly ProfilePackageUpdate[]): {
  official: ProfilePackageUpdate[]
  community: ProfilePackageUpdate[]
} {
  const official: ProfilePackageUpdate[] = []
  const community: ProfilePackageUpdate[] = []
  for (const item of updates) {
    if (isOfficialDshPackage(item.packageName)) official.push(item)
    else community.push(item)
  }
  return { official, community }
}

/** 官方包按同一版本升级；优先用 @deepseek-ai/dsh 的目标号。 */
export function officialRuntimeUpdateVersion(updates: readonly ProfilePackageUpdate[]): string | undefined {
  const official = partitionPackageUpdates(updates).official
  if (official.length === 0) return undefined
  return official.find((item) => item.packageName === '@deepseek-ai/dsh')?.version ?? official[0]?.version
}

/** 把关于页登记的版本和 package.json 里尚未落地的版本合并。 */
export function mergeProfileUpdates(input: {
  pending: readonly ProfilePackageUpdate[]
  declared: readonly ProfilePackageUpdate[]
  installed: readonly { packageName: string; version?: string }[]
}): ProfilePackageUpdate[] {
  const installed = new Map(input.installed.map((item) => [item.packageName, item.version]))
  const merged = new Map<string, string>()
  for (const item of [...input.declared, ...input.pending]) {
    if (isOfficialDshPackage(item.packageName)) continue
    if (installed.get(item.packageName) === item.version) continue
    merged.set(item.packageName, item.version)
  }
  return [...merged.entries()].map(([packageName, version]) => ({ packageName, version }))
}
