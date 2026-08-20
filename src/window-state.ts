/** 桌面端默认最大化，避免第一次打开只占一小块。 */
export function shouldStartMaximized(): boolean {
  return true
}

export function applyInitialWindowState(window: { maximize: () => void }): void {
  if (shouldStartMaximized()) window.maximize()
}