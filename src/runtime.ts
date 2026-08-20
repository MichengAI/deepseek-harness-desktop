import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { isOfficialRuntimeLaunchable, resolveProfileDshEntry, resolveWebProfileDir } from './plugin-seed.js'
import { verifyFileSha256 } from './runtime-archive.js'

export interface DshRuntime {
  root: string
  entry: string
  workingDirectory?: string
}

interface RuntimeResolutionOptions {
  appPath: string
  isPackaged: boolean
  resourcesPath: string
  profileDir?: string
  desktopRuntimeDir?: string
}

/** 官方运行时走桌面独立目录，避免官方包出现在 Web profile 插件列表。 */
export function resolveDshRuntime(options: RuntimeResolutionOptions): DshRuntime {
  const profileDir = options.profileDir ?? resolveWebProfileDir()
  const desktopDir = options.desktopRuntimeDir
  if (desktopDir !== undefined && isOfficialRuntimeLaunchable(desktopDir)) {
    return { root: desktopDir, entry: resolveProfileDshEntry(desktopDir), workingDirectory: homedir() }
  }
  if (isOfficialRuntimeLaunchable(profileDir)) {
    return { root: profileDir, entry: resolveProfileDshEntry(profileDir), workingDirectory: homedir() }
  }

  const candidates = [
    process.env.DSH_RUNTIME_ROOT,
    options.isPackaged ? join(options.resourcesPath, 'dsh') : undefined,
    options.isPackaged ? undefined : resolve(options.appPath, '..', 'deepseek-harness'),
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const root of candidates) {
    for (const entry of [
      join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
      join(root, 'apps', 'cli', 'lib', 'bin.js'),
      join(root, 'lib', 'bin.js'),
    ]) {
      if (existsSync(entry)) return { root, entry, workingDirectory: root }
    }
  }

  throw new Error('未找到 DSH 运行时。请先完成桌面端补种，或设置 DSH_RUNTIME_ROOT。')
}

/** 开发态使用 PATH 中的 Node，安装包优先使用随包 Node。 */
export function resolveNodeExecutable(options: Pick<RuntimeResolutionOptions, 'isPackaged' | 'resourcesPath'>): string {
  const bundledNode = join(options.resourcesPath, 'node', process.platform === 'win32' ? 'node.exe' : 'node')
  if (options.isPackaged) {
    if (existsSync(bundledNode)) {
      verifyFileSha256(bundledNode)
      return bundledNode
    }
    throw new Error(`未找到随包 Node：${bundledNode}`)
  }

  if (process.env.DSH_NODE_EXECUTABLE) return process.env.DSH_NODE_EXECUTABLE

  return process.platform === 'win32' ? 'node.exe' : 'node'
}

/** 查找控制 DSH 优雅关闭的 Node 引导脚本。 */
export function resolveDshBootstrap(options: RuntimeResolutionOptions): string {
  const bootstrap = options.isPackaged
    ? join(options.resourcesPath, 'bootstrap.mjs')
    : resolve(options.appPath, 'dist', 'src', 'dsh-bootstrap.mjs')
  if (existsSync(bootstrap)) return bootstrap
  throw new Error(`未找到 DSH 启动引导脚本：${bootstrap}`)
}
