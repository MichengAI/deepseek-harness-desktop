/** 托盘退出必须先标记 quitting，否则窗口 close 会被拦截成最小化到托盘。 */
export function shouldHideInsteadOfClose(isQuitting: boolean, platform = process.platform): boolean {
  return !isQuitting && platform !== 'linux'
}

export async function quitDesktopApp(options: {
  isQuitting: boolean
  markQuitting: () => void
  destroyTray?: () => void
  stopServer?: () => Promise<void>
  exit: (code?: number) => void
}): Promise<void> {
  if (options.isQuitting) return
  options.markQuitting()
  options.destroyTray?.()
  try {
    await options.stopServer?.()
  } finally {
    options.exit()
  }
}
