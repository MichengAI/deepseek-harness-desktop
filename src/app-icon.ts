import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

interface IconResolutionOptions {
  appPath: string
  isPackaged: boolean
  resourcesPath: string
}

export function resolveIconCandidates(options: IconResolutionOptions): string[] {
  return options.isPackaged
    ? [
        join(options.resourcesPath, 'icon.ico'),
        join(options.resourcesPath, 'icon.png'),
      ]
    : [
        resolve(options.appPath, 'assets', 'icons', 'icon.ico'),
        resolve(options.appPath, 'assets', 'icon.png'),
      ]
}

/** 打包后从 extraResources 取图标；开发态使用仓库 assets。窗口必须传文件路径，避免 ICO 被压成 16px。 */
export function resolveAppIconPath(options: IconResolutionOptions): string | undefined {
  return resolveIconCandidates(options).find(candidate => existsSync(candidate))
}

/** 托盘缩放优先用 PNG，避免只拿到 ICO 里最小的那一档。 */
export function resolveRasterIconPath(options: IconResolutionOptions): string | undefined {
  const candidates = options.isPackaged
    ? [
        join(options.resourcesPath, 'icon.png'),
        join(options.resourcesPath, 'icon.ico'),
      ]
    : [
        resolve(options.appPath, 'assets', 'icon.png'),
        resolve(options.appPath, 'assets', 'icons', 'icon.ico'),
      ]
  return candidates.find(candidate => existsSync(candidate))
}

export const TRAY_ICON_SIZE = 32