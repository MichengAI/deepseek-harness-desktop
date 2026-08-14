import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { startDsh, type DshServer } from './dsh-process.js'
import { isExternalHttpUrl, isSameOrigin } from './navigation.js'
import { resolveDshBootstrap, resolveDshRuntime, resolveNodeExecutable } from './runtime.js'

let mainWindow: BrowserWindow | undefined
let server: DshServer | undefined
let tray: Tray | undefined
let isQuitting = false

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())
  app.on('before-quit', event => {
    if (isQuitting || server === undefined) return
    event.preventDefault()
    isQuitting = true
    void server.stop().finally(() => app.exit())
  })

  void startApplication()
}

async function startApplication(): Promise<void> {
  await app.whenReady()
  createTray()

  try {
    const runtimeOptions = {
      appPath: app.getAppPath(),
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
    }
    const runtime = resolveDshRuntime(runtimeOptions)
    server = await startDsh({
      bootstrapPath: resolveDshBootstrap(runtimeOptions),
      onUnexpectedExit: handleUnexpectedDshExit,
      runtime,
      nodeExecutable: resolveNodeExecutable(runtimeOptions),
    })
    createMainWindow(server.url)
  } catch (error) {
    await reportStartupFailure(error)
  }
}

function createMainWindow(serverUrl: string): void {
  mainWindow = createWindow()
  const allowedOrigin = new URL(serverUrl).origin
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalHttpUrl(url, allowedOrigin)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isSameOrigin(url, allowedOrigin)) return
    event.preventDefault()
    if (isExternalHttpUrl(url, allowedOrigin)) void shell.openExternal(url)
  })
  void mainWindow.loadURL(serverUrl)
}

function createErrorWindow(message: string): void {
  mainWindow ??= createWindow()
  const escaped = message.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
  void mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<main><h1>启动失败</h1><p>${escaped}</p></main>`)}`)
}

async function reportStartupFailure(error: unknown): Promise<void> {
  const logPath = join(app.getPath('userData'), 'startup-error.log')
  const message = error instanceof Error ? error.message : '未知启动错误。'
  await writeFile(logPath, `${message}\n`, 'utf8').catch(() => undefined)
  createErrorWindow(`DSH 启动失败。诊断日志：${logPath}`)
}

function handleUnexpectedDshExit(message: string): void {
  if (isQuitting) return
  server = undefined
  void writeFile(join(app.getPath('userData'), 'startup-error.log'), `${message}\n`, 'utf8').catch(() => undefined)
  createErrorWindow(`DSH 已停止运行。请重新启动应用。`)
}


function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.on('close', event => {
    if (isQuitting) return
    event.preventDefault()
    window.hide()
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  return window
}

function createTray(): void {
  tray = new Tray(nativeImage.createEmpty())
  tray.setToolTip('DeepSeek Harness Desktop')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示窗口', click: () => showMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]))
  tray.on('click', () => showMainWindow())
}

function showMainWindow(): void {
  if (mainWindow === undefined) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}
