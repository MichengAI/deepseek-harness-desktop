import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { isExternalOpenUrl, isExternalHttpUrl, isSameOrigin } from '../src/navigation.js'

const localOrigin = 'http://127.0.0.1:10406'

test('仅同源 DSH 页面允许在桌面窗口内导航', () => {
  assert.equal(isSameOrigin('http://127.0.0.1:10406/settings', localOrigin), true)
  assert.equal(isSameOrigin('http://127.0.0.1:10407/', localOrigin), false)
  assert.equal(isSameOrigin('not a url', localOrigin), false)
})

test('主窗口同时拦截导航和服务端重定向', async () => {
  const main = await readFile(new URL('../../src/main.ts', import.meta.url), 'utf8')
  assert.match(main, /will-navigate/)
  assert.match(main, /will-redirect/)
})

test('仅 HTTP(S) 外部链接可交给系统浏览器', () => {
  assert.equal(isExternalHttpUrl('https://example.com/docs', localOrigin), true)
  assert.equal(isExternalHttpUrl('http://127.0.0.1:10406/docs', localOrigin), false)
  assert.equal(isExternalHttpUrl('javascript:alert(1)', localOrigin), false)
  assert.equal(isExternalHttpUrl('data:text/html,unsafe', localOrigin), false)
})

test('mailto 和 tel 可交给系统应用，危险协议仍拒绝', () => {
  assert.equal(isExternalOpenUrl('mailto:support@example.com', localOrigin), true)
  assert.equal(isExternalOpenUrl('tel:+8613800000000', localOrigin), true)
  assert.equal(isExternalOpenUrl('javascript:alert(1)', localOrigin), false)
})
