export type DesktopUpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string; releaseNotes?: string }
  | { kind: 'none' }
  | { kind: 'downloading'; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

export type DesktopTrayItem = {
  id: string
  label: string
  enabled: boolean
  type: 'normal' | 'separator'
}

export const DESKTOP_UPDATE_WARNING = '这会替换安装包里的官方运行时，带图片的旧会话可能无法打开。'

/** 去掉路径和底层堆栈，避免把本机目录回给对话框。 */
export function publicDesktopUpdateError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  if (/ENOTFOUND|ECONN|ETIMEDOUT|net::|404|403/i.test(detail)) return '无法检查桌面端更新，请稍后重试。'
  if (/download|sha512|blockmap|differential/i.test(detail)) return '无法下载桌面端更新，请稍后重试。'
  if (/[A-Za-z]:\\|\//.test(detail)) return '桌面端更新失败，请查看桌面日志。'
  return '桌面端更新失败，请稍后重试。'
}

export function desktopUpdatePrompt(status: Extract<DesktopUpdateStatus, { kind: 'available' | 'ready' }>): string {
  if (status.kind === 'ready') {
    return `桌面端 ${status.version} 已下载。关闭应用后安装新版本。`
  }
  const notes = status.releaseNotes === undefined || status.releaseNotes.trim() === '' ? '' : `\n\n${status.releaseNotes.trim()}`
  return `发现桌面端 ${status.version}。\n\n${DESKTOP_UPDATE_WARNING}${notes}`
}

export function buildDesktopTrayItems(input: {
  status: DesktopUpdateStatus
  currentVersion: string
  packaged: boolean
}): DesktopTrayItem[] {
  const items: DesktopTrayItem[] = [
    { id: 'show', label: '显示窗口', enabled: true, type: 'normal' },
    { id: 'sep-1', label: '', enabled: false, type: 'separator' },
    { id: 'version', label: `当前版本 ${input.currentVersion}`, enabled: false, type: 'normal' },
  ]

  if (!input.packaged) {
    items.push({ id: 'check', label: '检查桌面端更新', enabled: true, type: 'normal' })
  } else if (input.status.kind === 'checking') {
    items.push({ id: 'check', label: '正在检查更新…', enabled: false, type: 'normal' })
  } else if (input.status.kind === 'downloading') {
    items.push({ id: 'download', label: `正在下载 ${Math.max(0, Math.min(100, Math.round(input.status.percent)))}%`, enabled: false, type: 'normal' })
  } else if (input.status.kind === 'available') {
    items.push({ id: 'download', label: `下载并安装 ${input.status.version}`, enabled: true, type: 'normal' })
  } else if (input.status.kind === 'ready') {
    items.push({ id: 'install', label: `安装并重启 ${input.status.version}`, enabled: true, type: 'normal' })
  } else {
    items.push({ id: 'check', label: '检查桌面端更新', enabled: true, type: 'normal' })
  }

  items.push({ id: 'sep-2', label: '', enabled: false, type: 'separator' })
  items.push({ id: 'quit', label: '退出', enabled: true, type: 'normal' })
  return items
}
