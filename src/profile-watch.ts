import { existsSync, readFileSync, watch } from 'node:fs'
import { join } from 'node:path'

export function profileActivationFingerprint(source: string, isInstalled?: (packageName: string) => boolean): string {
  try {
    const manifest = JSON.parse(source) as {
      dependencies?: Record<string, string>
      dsh?: { profile?: { bundles?: string[] } }
    }
    const installed = (name: string): boolean => isInstalled?.(name) !== false
    const dependencies = manifest.dependencies ?? {}
    const bundles = (manifest.dsh?.profile?.bundles ?? []).filter((name) => name.startsWith('@deepseek-ai/') || (dependencies[name] !== undefined && installed(name)))
    return JSON.stringify({
      dependencies: Object.fromEntries(bundles.filter((name) => !name.startsWith('@deepseek-ai/')).map((name) => [name, dependencies[name]])),
      bundles,
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
  retryMs?: number
  maxRetries?: number
  watch?: (path: string, listener: (event: string, filename: string | Buffer | null) => void) => { close: () => void; on?: (event: 'error', listener: (error: Error) => void) => unknown }
  read?: (path: string) => string
  isInstalled?: (packageName: string) => boolean
  onError?: (error: Error) => void
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
  const retryMs = options.retryMs ?? 250
  const maxRetries = options.maxRetries ?? 20
  const isInstalled = options.isInstalled ?? ((packageName: string) => existsSync(join(profileDir, 'node_modules', ...packageName.split('/'), 'package.json')))
  let current = readFingerprint()
  let timer: ReturnType<typeof setTimeout> | undefined
  let retries = 0
  const check = (): void => {
    const next = readFingerprint()
    if (shouldRecycleForProfileFingerprint(current, next)) {
      current = next
      retries = 0
      onChange()
      return
    }
    if (next !== '') current = next
    if (retries >= maxRetries) return
    retries += 1
    timer = setTimeout(check, retryMs)
  }
  const watcher = (options.watch ?? watch)(profileDir, (_event, filename) => {
    const name = typeof filename === 'string' ? filename : filename?.toString()
    if (name !== undefined && name !== 'package.json' && name !== 'node_modules') return
    clearTimeout(timer)
    retries = 0
    timer = setTimeout(check, debounceMs)
  })
  ;(watcher as { on?: (event: 'error', listener: (error: Error) => void) => unknown })
    .on?.('error', error => { options.onError?.(error) })

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
      const next = readFingerprint()
      if (next !== '') current = next
    },
  }
}
