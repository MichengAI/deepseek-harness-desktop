import { existsSync, readFileSync } from 'node:fs'

export const WINDOW_ICON_PIXEL_SIZES = [16, 20, 24, 32, 40, 48, 64, 256] as const

export function pngDataUrl(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined
  return 'data:image/png;base64,' + readFileSync(filePath).toString('base64')
}

/** 本机 DSH 页面的默认 favicon 请求，必须在第一次就被换成应用图标。 */
export function isLoopbackFaviconRequest(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^\[|\]$/g, '')
    const path = parsed.pathname.toLowerCase()
    if (path !== '/favicon.ico' && path !== '/favicon.png' && !path.endsWith('/favicon.ico')) return false
    return host === '127.0.0.1' || host === 'localhost' || host === '::1'
  } catch {
    return false
  }
}
