import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { join } from 'node:path'

import { parseReadyUrl } from './readiness.js'
import type { DshRuntime } from './runtime.js'

const startupTimeoutMs = 45_000
const maxCapturedOutputLength = 4_096

export interface DshServer {
  stop: () => void
  url: string
}

interface StartDshOptions {
  runtime: DshRuntime
  userDataPath: string
  nodeExecutable: string
}

/** 启动 DSH Web，并在收到本机就绪地址后返回。 */
export function startDsh(options: StartDshOptions): Promise<DshServer> {
  const child = spawn(options.nodeExecutable, [options.runtime.entry, 'web', '--port', '0'], {
    cwd: options.runtime.root,
    env: {
      ...process.env,
      DSH_AGENTS_HOME: join(options.userDataPath, 'dsh-agents'),
      DSH_HOME: join(options.userDataPath, 'dsh'),
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'pipe',
    windowsHide: true,
  })

  return waitForReady(child)
}

function waitForReady(child: ChildProcessWithoutNullStreams): Promise<DshServer> {
  return new Promise((resolve, reject) => {
    let capturedOutput = ''
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
      if (url !== undefined) finish(() => resolve({ url, stop: () => stopChild(child) }))
    }
    const timeout = setTimeout(() => {
      finish(() => {
        stopChild(child)
        reject(new Error(`DSH 启动超时。最近输出：${capturedOutput || '无'}`))
      })
    }, startupTimeoutMs)

    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.once('error', error => finish(() => reject(new Error(`DSH 无法启动：${error.message}`))))
    child.once('exit', code => {
      if (settled) return
      finish(() => reject(new Error(`DSH 提前退出（退出码 ${code ?? '未知'}）。最近输出：${capturedOutput || '无'}`)))
    })
  })
}

/** 主进程退出时终止仅由本应用创建的 DSH 子进程。 */
function stopChild(child: ChildProcessWithoutNullStreams): void {
  if (!child.killed && child.exitCode === null) child.kill()
}
