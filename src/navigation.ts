/** 判断 URL 是否与本机 DSH 服务同源。 */
export function isSameOrigin(value: string, allowedOrigin: string): boolean {
  try {
    return new URL(value).origin === allowedOrigin
  } catch {
    return false
  }
}

/** 仅允许通过系统浏览器打开明确的 HTTP(S) 外部链接。 */
export function isExternalHttpUrl(value: string, allowedOrigin: string): boolean {
  try {
    const url = new URL(value)
    return url.origin !== allowedOrigin && (url.protocol === 'http:' || url.protocol === 'https:')
  } catch {
    return false
  }
}
