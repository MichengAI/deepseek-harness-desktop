import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { isLoopbackFaviconRequest, pngDataUrl } from '../src/window-icon.js'

test('只拦截本机页面的 favicon 请求', () => {
  assert.equal(isLoopbackFaviconRequest('http://127.0.0.1:1234/favicon.ico'), true)
  assert.equal(isLoopbackFaviconRequest('http://localhost:8080/favicon.png'), true)
  assert.equal(isLoopbackFaviconRequest('http://[::1]/favicon.ico'), true)
  assert.equal(isLoopbackFaviconRequest('https://example.com/favicon.ico'), false)
  assert.equal(isLoopbackFaviconRequest('http://127.0.0.1:1234/api/icon'), false)
})

test('PNG 可以转成 data URL', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-favicon-'))
  try {
    const file = join(root, 'icon.png')
    await writeFile(file, Buffer.from('89504e470d0a1a0a', 'hex'))
    assert.equal(pngDataUrl(file)?.startsWith('data:image/png;base64,'), true)
    assert.equal(pngDataUrl(join(root, 'missing.png')), undefined)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
