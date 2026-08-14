import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export interface DshRuntime {
  root: string
  entry: string
}

interface RuntimeResolutionOptions {
  appPath: string
  isPackaged: boolean
  resourcesPath: string
}

/** 查找已构建的 DSH 运行时，开发态默认使用同级仓库。 */
export function resolveDshRuntime(options: RuntimeResolutionOptions): DshRuntime {
  const candidates = [
    process.env.DSH_RUNTIME_ROOT,
    options.isPackaged ? join(options.resourcesPath, 'dsh') : undefined,
    options.isPackaged ? undefined : resolve(options.appPath, '..', 'deepseek-harness'),
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const root of candidates) {
    for (const entry of [join(root, 'apps', 'cli', 'lib', 'bin.js'), join(root, 'lib', 'bin.js')]) {
      if (existsSync(entry)) return { root, entry }
    }
  }

  throw new Error('未找到已构建的 DSH 运行时。请设置 DSH_RUNTIME_ROOT，或在安装包 resources\\dsh 中提供运行时。')
}

/** 开发态使用 PATH 中的 Node，安装包优先使用随包 Node。 */
export function resolveNodeExecutable(options: Pick<RuntimeResolutionOptions, 'isPackaged' | 'resourcesPath'>): string {
  const bundledNode = join(options.resourcesPath, 'node', process.platform === 'win32' ? 'node.exe' : 'node')
  if (options.isPackaged) {
    if (existsSync(bundledNode)) return bundledNode
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
