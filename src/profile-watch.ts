import { existsSync, readFileSync, watch } from 'node:fs'
import { join } from 'node:path'

export function profileActivationFingerprint(source: string, isInstalled?: (packageName: string) => boolean): string {
  try {
    const manifest = JSON.parse(source) as {
      dependencies?: Record<string, string>
      dsh?: { profile?: { bundles?: string[] } }
    }
    const installed = (name: string): boolean => isInstalled?.(name) !== false
    return JSON.stringify({
      dependencies: Object.fromEntries(Object.entries(manifest.dependencies ?? {}).filter(([name]) => installed(name))),
      bundles: (manifest.dsh?.profile?.bundles ?? []).filter((name) => name.startsWith('@deepseek-ai/') || installed(name)),
    })
  } catch {
    return ''
  }
}

export function shouldRecycleForProfileFingerprint(previous: string, next: string): boolean {
  return previous !== '' && next !== '' && previous !== next
}

interface ProfileWatchOptions {
  debounceMs?: number
  watch?: (path: string, listener: (event: string, filename: string | Buffer | null) => void) => { close: () => void }
  read?: (path: string) => string
  isInstalled?: (packageName: string) => boolean
}

/** 只有插件真正落到磁盘，才视为安装成功并热重启 DSH。 */
export function watchProfileActivation(
  profileDir: string,
  onChange: () => void,
  options: ProfileWatchOptions = {},
): { stop: () => void; sync: () => void } {
  const manifestPath = join(profileDir, 'package.json')
  const read = options.read ?? ((path: string) => readFileSync(path, 'utf8'))
  const debounceMs = options.debounceMs ?? 800
  const isInstalled = options.isInstalled ?? ((packageName: string) => existsSync(join(profileDir, 'node_modules', ...packageName.split('/'), 'package.json')))
  let current = readFingerprint()
  let timer: ReturnType<typeof setTimeout> | undefined
  const watcher = (options.watch ?? watch)(profileDir, (_event, filename) => {
    const name = typeof filename === 'string' ? filename : filename?.toString()
    if (name !== undefined && name !== 'package.json') return
    clearTimeout(timer)
    timer = setTimeout(() => {
      const next = readFingerprint()
      if (shouldRecycleForProfileFingerprint(current, next)) {
        current = next
        onChange()
        return
      }
      current = next
    }, debounceMs)
  })

  function readFingerprint(): string {
    try {
      return profileActivationFingerprint(read(manifestPath), isInstalled)
    } catch {
      return ''
    }
  }

  return {
    stop: () => {
      clearTimeout(timer)
      watcher.close()
    },
    sync: () => {
      current = readFingerprint()
    },
  }
}
