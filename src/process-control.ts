import { spawn, type ChildProcess } from 'node:child_process'

export function terminateProcessTree(child: ChildProcess): void {
  if (child.exitCode !== null || child.signalCode !== null || child.killed) return
  if (process.platform === 'win32' && child.pid !== undefined) {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
    killer.once('error', () => { child.kill('SIGKILL') })
    return
  }
  child.kill('SIGKILL')
}
