import assert from 'node:assert/strict'
import test from 'node:test'

import { profileActivationFingerprint, shouldRecycleForProfileFingerprint, watchProfileActivation } from '../src/profile-watch.js'

test('依赖或 bundle 变化才需要热重启 DSH', () => {
  const installed = (name: string) => name !== 'dsh-file-upload'
  const before = profileActivationFingerprint(JSON.stringify({
    dependencies: { 'dsh-better-sidebar': '0.13.0' },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } },
  }), installed)
  const afterInstall = profileActivationFingerprint(JSON.stringify({
    dependencies: { 'dsh-better-sidebar': '0.13.1' },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-better-sidebar'] } },
  }), installed)
  const phantom = profileActivationFingerprint(JSON.stringify({
    dependencies: { 'dsh-better-sidebar': '0.13.0' },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-file-upload'] } },
  }), installed)
  const dependencyOnly = profileActivationFingerprint(JSON.stringify({
    dependencies: { 'dsh-better-sidebar': '0.13.1' },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } },
  }), installed)
  assert.equal(shouldRecycleForProfileFingerprint(before, afterInstall), true)
  assert.equal(shouldRecycleForProfileFingerprint(before, phantom), false)
  assert.equal(shouldRecycleForProfileFingerprint(before, dependencyOnly), false)
})

test('profile 清单变化后会触发一次热重启', async () => {
  const installed = new Set<string>()
  const files = new Map<string, string>([[
    'D:\\profile\\web\\package.json',
    JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } }),
  ]])
  let listener: ((event: string, filename: string) => void) | undefined
  const fired: number[] = []
  const handle = watchProfileActivation('D:\\profile\\web', () => { fired.push(Date.now()) }, {
    debounceMs: 20,
    isInstalled: (name) => installed.has(name),
    read: (path) => files.get(path) ?? '',
    watch: (_path, next) => {
      listener = next
      return { close: () => { listener = undefined } }
    },
  })
  files.set('D:\\profile\\web\\package.json', JSON.stringify({
    dependencies: { 'dsh-file-upload': '1.0.0' },
    dsh: { profile: { bundles: ['dsh-file-upload'] } },
  }))
  listener?.('change', 'package.json')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(fired.length, 0)
  installed.add('dsh-better-sidebar')
  files.set('D:\\profile\\web\\package.json', JSON.stringify({
    dependencies: { 'dsh-better-sidebar': '0.13.1' },
    dsh: { profile: { bundles: ['dsh-better-sidebar'] } },
  }))
  listener?.('change', 'package.json')
  listener?.('change', 'package.json')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(fired.length, 1)
  handle.sync()
  listener?.('change', 'package.json')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(fired.length, 1)
  handle.stop()
})
