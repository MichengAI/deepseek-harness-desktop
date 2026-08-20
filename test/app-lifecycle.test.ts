import assert from 'node:assert/strict'
import test from 'node:test'

import { quitDesktopApp, shouldHideInsteadOfClose } from '../src/app-lifecycle.js'

test('未退出时关闭窗口应隐藏到托盘', () => {
  assert.equal(shouldHideInsteadOfClose(false, 'win32'), true)
  assert.equal(shouldHideInsteadOfClose(true, 'win32'), false)
  assert.equal(shouldHideInsteadOfClose(false, 'linux'), false)
})

test('托盘退出会先标记 quitting 再停服务', async () => {
  const events: string[] = []
  await quitDesktopApp({
    isQuitting: false,
    markQuitting: () => events.push('mark'),
    destroyTray: () => events.push('tray'),
    stopServer: async () => { events.push('stop') },
    exit: () => events.push('exit'),
  })
  assert.deepEqual(events, ['mark', 'tray', 'stop', 'exit'])
})

test('重复退出不会再次停服务', async () => {
  let exits = 0
  await quitDesktopApp({
    isQuitting: true,
    markQuitting: () => undefined,
    exit: () => { exits += 1 },
  })
  assert.equal(exits, 0)
})
