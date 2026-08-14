import assert from 'node:assert/strict'
import test from 'node:test'

import { isExternalHttpUrl, isSameOrigin } from '../src/navigation.js'

const localOrigin = 'http://127.0.0.1:10406'

test('仅同源 DSH 页面允许在桌面窗口内导航', () => {
  assert.equal(isSameOrigin('http://127.0.0.1:10406/settings', localOrigin), true)
  assert.equal(isSameOrigin('http://127.0.0.1:10407/', localOrigin), false)
  assert.equal(isSameOrigin('not a url', localOrigin), false)
})

test('仅 HTTP(S) 外部链接可交给系统浏览器', () => {
  assert.equal(isExternalHttpUrl('https://example.com/docs', localOrigin), true)
  assert.equal(isExternalHttpUrl('http://127.0.0.1:10406/docs', localOrigin), false)
  assert.equal(isExternalHttpUrl('javascript:alert(1)', localOrigin), false)
  assert.equal(isExternalHttpUrl('data:text/html,unsafe', localOrigin), false)
})
