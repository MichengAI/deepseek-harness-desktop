import { accessSync, constants } from 'node:fs'
import { dirname, join } from 'node:path'

export const DESKTOP_APP_NAME = 'DSH Codex Desktop'
export const DESKTOP_USER_DATA_DIR = DESKTOP_APP_NAME
export const DESKTOP_APP_USER_MODEL_ID = 'ai.micheng.deepseekHarnessDesktop'

/** Electron 默认用 package.json 的 name，这里强制改到和应用名一致的目录。 */
export function resolveDesktopUserDataDir(appDataDir: string): string {
  return join(appDataDir, DESKTOP_USER_DATA_DIR)
}
/** 打包后优先把官方运行时放安装目录，避免几百 MB 再写进 C 盘 AppData。 */
export function resolveDesktopRuntimeDir(userDataDir: string, options: {
  isPackaged: boolean
  execPath: string
  canWrite?: (dir: string) => boolean
}): string {
  if (options.isPackaged) {
    const installDir = dirname(options.execPath)
    const canWrite = options.canWrite ?? canWriteDirectory
    if (canWrite(installDir)) return join(installDir, 'dsh-runtime')
  }
  return join(userDataDir, 'dsh-runtime')
}

function canWriteDirectory(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK)
    return true
  } catch {
    return false
  }
}
