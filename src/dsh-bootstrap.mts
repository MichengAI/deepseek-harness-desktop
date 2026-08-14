import { pathToFileURL } from 'node:url'

const entry = process.argv[2]
if (entry === undefined) throw new Error('缺少 DSH 启动入口。')

let initialized = false
let shutdownRequested = false

function requestShutdown(): void {
  shutdownRequested = true
  if (initialized) process.emit('SIGTERM')
}

process.on('message', message => {
  if (message === 'shutdown') requestShutdown()
})
process.on('disconnect', requestShutdown)

process.argv = [process.execPath, entry, ...process.argv.slice(3)]
await import(pathToFileURL(entry).href)
initialized = true

if (shutdownRequested) process.emit('SIGTERM')
