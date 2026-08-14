import { createServer } from 'node:http'

const mode = process.env.DSH_FIXTURE_MODE
let server

if (mode === 'exit') process.exit(1)
process.on('SIGTERM', () => {
  if (server === undefined) process.exit(0)
  server.close(() => process.exit(0))
})

if (mode === 'silent') {
  setInterval(() => undefined, 1_000)
} else {
  server = createServer((request, response) => {
    if (request.url === '/asset.js') {
      response.writeHead(200, { 'content-type': 'application/javascript' })
      response.end('export {}')
      return
    }
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end('<!doctype html><script src="/asset.js"></script>')
  })

  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('未获取 HTTP 监听端口。')
    const ready = `dsh web: http://127.0.0.1:${address.port}`
    if (mode === 'chunked') {
      process.stdout.write(ready.slice(0, 24))
      setTimeout(() => process.stdout.write(`${ready.slice(24)}\n`), 10)
      return
    }
    process.stdout.write(`${ready}\n`)
  })
}
