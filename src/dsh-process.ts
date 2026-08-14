import { spawn, type ChildProcess } from 'node:child_process'

import { parseReadyUrl } from './readiness.js'
import type { DshRuntime } from './runtime.js'

const startupTimeoutMs = 45_000
const maxCapturedOutputLength = 4_096
const shutdownTimeoutMs = 5_000

export interface DshServer {
  stop: () => Promise<void>
  url: string
}

export interface StartDshOptions {
  bootstrapPath: string
  environment?: NodeJS.ProcessEnv
  onUnexpectedExit?: (message: string) => void
  runtime: DshRuntime
  nodeExecutable: string
  startupTimeoutMs?: number
}

/** 启动 DSH Web，并在收到本机就绪地址后返回。 */
export function startDsh(options: StartDshOptions): Promise<DshServer> {
  const child = spawn(options.nodeExecutable, [options.bootstrapPath, options.runtime.entry, 'web', '--port', '0'], {
    cwd: options.runtime.root,
    env: {
      ...process.env,
      ...options.environment,
    },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  })

  return waitForReady(child, options.startupTimeoutMs ?? startupTimeoutMs)
    .then(url => createServer(child, url, options.onUnexpectedExit))
}

function waitForReady(child: ChildProcess, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let capturedOutput = ''
    let checkingHealth = false
    let settled = false
    const finish = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      callback()
    }
    const capture = (chunk: Buffer): void => {
      capturedOutput = (capturedOutput + chunk.toString('utf8')).slice(-maxCapturedOutputLength)
      const url = parseReadyUrl(capturedOutput)
      if (url === undefined || checkingHealth) return
      checkingHealth = true
      void waitForHttpHealth(url, timeoutMs)
        .then(() => finish(() => resolve(url)))
        .catch(() => finish(() => reject(new Error('DSH 启动失败：本机 HTTP 服务未通过健康检查。'))))
    }
    const timeout = setTimeout(() => {
      finish(() => {
        void stopChild(child)
        reject(new Error('DSH 启动超时。'))
      })
    }, timeoutMs)

    if (child.stdout === null || child.stderr === null) {
      finish(() => reject(new Error('DSH 无法建立标准输出管道。')))
      return
    }

    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.once('error', () => finish(() => reject(new Error('DSH 无法启动。'))))
    child.once('exit', code => {
      if (settled) return
      finish(() => reject(new Error(`DSH 提前退出（退出码 ${code ?? '未知'}）。`)))
    })
  })
}

function createServer(child: ChildProcess, url: string, onUnexpectedExit?: (message: string) => void): DshServer {
  let stopping = false
  let stopPromise: Promise<void> | undefined

  child.once('exit', (code, signal) => {
    if (!stopping) onUnexpectedExit?.(`DSH 运行中断（退出码 ${code ?? '未知'}，信号 ${signal ?? '无'}）。`)
  })

  return {
    url,
    stop: () => {
      stopping = true
      stopPromise ??= stopChild(child)
      return stopPromise
    },
  }
}

/** 通过 IPC 请求上游 DSH 优雅退出，超时后才强制结束本启动器创建的 PID。 */
function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) return Promise.resolve()

  return new Promise(resolve => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      clearTimeout(forceTimer)
      resolve()
    }
    const forceTimer = setTimeout(() => {
      if (child.exitCode === null && !child.killed) child.kill()
    }, shutdownTimeoutMs)

    child.once('exit', finish)
    if (child.connected && child.send !== undefined) {
      child.send('shutdown', error => {
        if (error !== null) child.kill()
      })
      return
    }
    child.kill()
  })
}

async function waitForHttpHealth(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(Math.min(1_000, Math.max(1, deadline - Date.now()))) })
      if (response.ok) {
        await response.body?.cancel()
        return
      }
    } catch {
      // 就绪行可能早于 HTTP 监听完成，超时前继续轮询。
    }
    await new Promise<void>(resolve => setTimeout(resolve, 50))
  }
  throw new Error('HTTP 健康检查超时。')
}
