import { existsSync } from 'node:fs'
import { join } from 'node:path'

interface PathLookup {
  exists?: (path: string) => boolean
}

interface PluginStoreOptions extends PathLookup {
  isPackaged: boolean
  resourcesPath: string
  appPath: string
  envStore?: string
  extractedStoreDir?: string
}

interface PluginBinOptions {
  isPackaged: boolean
  resourcesPath: string
}

/** 把随包工具目录放到 PATH 最前，供 `dsh plugin`、code-ui 和 dshmarket 复用。 */
export function prependPath(existing: string | undefined, prefix: string, platform = process.platform): string {
  const separator = platform === 'win32' ? ';' : ':'
  const parts = (existing ?? '').split(separator).filter(part => part !== '')
  const normalizedPrefix = platform === 'win32' ? prefix.toLowerCase() : prefix
  return [prefix, ...parts.filter(part => (platform === 'win32' ? part.toLowerCase() : part) !== normalizedPrefix)].join(separator)
}

/** 打包态使用 extraResources 中的离线仓库；开发态仅在本地装配目录存在时启用。 */
export function resolveBundledPluginStore(options: PluginStoreOptions): string | undefined {
  const exists = options.exists ?? existsSync
  const envStore = options.envStore !== undefined ? options.envStore : process.env.DSH_BUNDLED_PLUGIN_STORE
  const candidates = [
    envStore,
    options.extractedStoreDir,
    options.isPackaged ? join(options.resourcesPath, 'plugins', 'store') : undefined,
    options.isPackaged ? undefined : join(options.appPath, 'runtime-plugins', 'store'),
  ].filter((candidate): candidate is string => Boolean(candidate))
  return candidates.find(candidate => exists(candidate))
}

/** 打包后 pnpm 与 node 同目录，开发态沿用系统 PATH。 */
export function resolvePluginBinDir(options: PluginBinOptions): string | undefined {
  if (!options.isPackaged) return undefined
  return join(options.resourcesPath, 'node')
}
