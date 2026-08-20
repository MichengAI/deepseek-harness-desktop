import { spawn, type ChildProcess } from 'node:child_process'
import { PassThrough } from 'node:stream'

import { OFFICIAL_DSH_VERSION, isOfficialDshPackage } from './bundled-plugins.js'
import { APPLY_PLUGIN_UPDATES_IPC } from './dsh-process.js'
import { finalizeProfileBundlesAfterInstall, officialRuntimeInstallArgs, writeOfficialRuntimeManifest } from './plugin-seed.js'

export const DESKTOP_BRIDGE_PACKAGE = 'dsh-desktop-bridge'

export interface DesktopPnpmHandle {
  readonly stdout: NodeJS.ReadableStream
  readonly stderr: NodeJS.ReadableStream
  readonly done: Promise<{ readonly exitCode: number | null; readonly signal: NodeJS.Signals | null }>
  cancel(): void
}

export interface DesktopHostOptions {
  profileName: string
  profileDir: string
  desktopRuntimeDir?: string
  send?: (message: unknown) => void
  runner?: (args: readonly string[], cwd: string, signal?: AbortSignal) => DesktopPnpmHandle
  recycleDelayMs?: number
  isInstalled?: (packageName: string) => boolean
}

export function shouldRecycleAfterPluginArgs(args: readonly string[]): boolean {
  return pluginCommandAction(args) !== 'other'
}

export function packageNameFromSpec(spec: string): string {
  if (spec.startsWith('@')) {
    const rest = spec.slice(1)
    const cut = rest.indexOf('@')
    return cut === -1 ? spec : '@' + rest.slice(0, cut)
  }
  return spec.split('@')[0] ?? spec
}

export function pluginCommandAction(args: readonly string[]): 'add' | 'remove' | 'update' | 'install' | 'other' {
  if (args.includes('add')) return 'add'
  if (args.includes('remove') || args.includes('uninstall')) return 'remove'
  if (args.includes('update')) return 'update'
  if (args.includes('install')) return 'install'
  return 'other'
}

export function pluginCommandPackageNames(args: readonly string[]): string[] {
  return args
    .filter((item) => item !== 'add' && item !== 'remove' && item !== 'uninstall' && item !== 'update' && item !== 'install' && !item.startsWith('-'))
    .map(packageNameFromSpec)
}

export function officialPluginCommandSpecs(args: readonly string[]): string[] {
  return args
    .filter((item) => item !== 'add' && item !== 'remove' && item !== 'uninstall' && item !== 'update' && item !== 'install' && !item.startsWith('-'))
    .filter((item) => isOfficialDshPackage(packageNameFromSpec(item)))
}

export function officialPluginUpdateVersion(args: readonly string[]): string | undefined {
  const action = pluginCommandAction(args)
  if (action !== 'add' && action !== 'update' && action !== 'install') return undefined
  const specs = officialPluginCommandSpecs(args)
  if (specs.length === 0) return undefined
  const preferred = specs.find((item) => packageNameFromSpec(item) === '@deepseek-ai/dsh') ?? specs[0]
  if (preferred === undefined) return undefined
  const name = packageNameFromSpec(preferred)
  const version = preferred.slice(name.length).replace(/^@/, '')
  return version === '' ? OFFICIAL_DSH_VERSION : version
}

/** add/update 必须能在 profile 里解析到包，才算安装成功并允许热重启。 */
export function shouldRecycleAfterPluginResult(
  args: readonly string[],
  isInstalled: (packageName: string) => boolean,
): boolean {
  const action = pluginCommandAction(args)
  if (action === 'other') return false
  if (action === 'remove') return true
  const names = pluginCommandPackageNames(args)
  if (names.length === 0) return true
  return names.every((name) => isInstalled(name))
}

export function createDesktopHostServices(options: DesktopHostOptions) {
  const runPlugin = (args: readonly string[], invokingDir: string, signal?: AbortSignal): DesktopPnpmHandle => {
    const officialVersion = officialPluginUpdateVersion(args)
    if (officialVersion !== undefined && options.desktopRuntimeDir !== undefined) {
      writeOfficialRuntimeManifest(options.desktopRuntimeDir, officialVersion)
      const handle = (options.runner ?? runBundledPnpm)(officialRuntimeInstallArgs(options.desktopRuntimeDir), options.desktopRuntimeDir, signal)
      void handle.done.then(async (outcome) => {
        if (outcome.exitCode !== 0) return
        const delay = options.recycleDelayMs ?? 400
        setTimeout(() => {
          options.send?.(APPLY_PLUGIN_UPDATES_IPC)
        }, delay).unref?.()
      })
      return handle
    }
    if (officialPluginCommandSpecs(args).length > 0 && (pluginCommandAction(args) === 'remove' || options.desktopRuntimeDir === undefined)) {
      const stdout = new PassThrough()
      const stderr = new PassThrough()
      stdout.end()
      stderr.end()
      return {
        stdout,
        stderr,
        done: Promise.resolve({ exitCode: 0, signal: null }),
        cancel: () => undefined,
      }
    }
    const handle = (options.runner ?? runBundledPnpm)(args, invokingDir, signal)
    void handle.done.then(async (outcome) => {
      if (outcome.exitCode !== 0) return
      const isInstalled = options.isInstalled ?? ((packageName) => existsSync(join(options.profileDir, 'node_modules', ...packageName.split('/'), 'package.json')))
      await finalizeProfileBundlesAfterInstall(options.profileDir)
      if (!shouldRecycleAfterPluginResult(args, isInstalled)) return
      const delay = options.recycleDelayMs ?? 400
      setTimeout(() => {
        options.send?.(APPLY_PLUGIN_UPDATES_IPC)
      }, delay).unref?.()
    })
    return handle
  }
  return {
    desktopProfiles: {
      connected: true,
      current: {
        name: options.profileName,
        dir: options.profileDir,
        connected: true,
      },
      list() {
        return [{ name: options.profileName, dir: options.profileDir }]
      },
      async select() {
        return
      },
    },
    desktopPnpm: {
      connected: true,
      run(args: readonly string[], signal?: AbortSignal): DesktopPnpmHandle {
        return runPlugin(args, options.profileDir, signal)
      },
      runPlugin,
    },
  }
}
function runBundledPnpm(args: readonly string[], cwd: string, signal?: AbortSignal): DesktopPnpmHandle {
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const child: ChildProcess = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', [...args], {
    cwd,
    env: process.env,
    shell: process.platform === 'win32',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.pipe(stdout)
  child.stderr?.pipe(stderr)
  const done = new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolvePromise) => {
    const finish = (exitCode: number | null, exitSignal: NodeJS.Signals | null): void => {
      stdout.end()
      stderr.end()
      resolvePromise({ exitCode, signal: exitSignal })
    }
    child.once('error', () => finish(127, null))
    child.once('exit', (code, exitSignal) => finish(code, exitSignal))
    signal?.addEventListener('abort', () => cancelChild(child), { once: true })
  })
  return {
    stdout,
    stderr,
    done,
    cancel: () => { cancelChild(child) },
  }
}

function cancelChild(child: ChildProcess): void {
  if (child.exitCode !== null || child.killed) return
  if (process.platform === 'win32' && child.pid !== undefined) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
    return
  }
  child.kill('SIGKILL')
}
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const bridgeFiles = [
  'desktop-bridge.mjs',
  'desktop-host.js',
  'dsh-process.js',
  'plugin-toolchain.js',
  'readiness.js',
] as const

export function resolveDesktopBridgeDir(options: { isPackaged: boolean; appPath: string; resourcesPath: string }): string {
  return options.isPackaged
    ? join(options.resourcesPath, 'desktop-bridge')
    : join(options.appPath, 'dist', 'src')
}

export function installDesktopBridge(profileDir: string, sourceDir: string): void {
  const destDir = join(profileDir, 'node_modules', DESKTOP_BRIDGE_PACKAGE)
  mkdirSync(destDir, { recursive: true })
  for (const file of bridgeFiles) {
    const from = join(sourceDir, file)
    if (existsSync(from)) copyFileSync(from, join(destDir, file))
  }
  writeFileSync(join(destDir, 'package.json'), `${JSON.stringify({
    name: DESKTOP_BRIDGE_PACKAGE,
    type: 'module',
    main: 'desktop-bridge.mjs',
  }, undefined, 2)}\n`, 'utf8')
  ensureDesktopBridgePatch(profileDir)
}

export function mergeDesktopBridgePatch(current: string): string {
  const entry = `- id: ${DESKTOP_BRIDGE_PACKAGE}\n  name: ${DESKTOP_BRIDGE_PACKAGE}`
  const lines = current.replace(/\r\n/g, '\n').split('\n')
  const comments = lines.filter((line) => line.trim().startsWith('#'))
  const body = lines.filter((line) => {
    const trimmed = line.trim()
    return trimmed !== '' && !trimmed.startsWith('#')
  }).join('\n').trim()
  const rest = body === '[]' ? '' : body.replace(/(?:^|\n)\[\]\s*$/g, '').trim()
  const items = rest.includes(DESKTOP_BRIDGE_PACKAGE)
    ? rest
    : rest === '' ? entry : `${entry}\n${rest}`
  const header = comments.length > 0 ? `${comments.join('\n')}\n` : ''
  return `${header}${items}\n`
}

export function ensureDesktopBridgePatch(profileDir: string): void {
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const current = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
  const next = mergeDesktopBridgePatch(current)
  if (next !== current) writeFileSync(patchPath, next, 'utf8')
}
