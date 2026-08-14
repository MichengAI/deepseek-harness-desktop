import assert from 'node:assert/strict'
import test from 'node:test'
import { join, resolve } from 'node:path'

import { startDsh, type DshServer } from '../src/dsh-process.js'

const projectRoot = resolve(import.meta.dirname, '..', '..')
const fixtureEntry = join(projectRoot, 'test', 'fixtures', 'dsh-fixture.mjs')
const bootstrapPath = join(projectRoot, 'dist', 'src', 'dsh-bootstrap.mjs')

test('等待分片就绪输出与 HTTP 健康检查', async () => {
  const server = await startFixture('chunked')
  try {
    const response = await fetch(`${server.url}asset.js`)
    assert.equal(response.status, 200)
  } finally {
    await server.stop()
  }
})

test('DSH 提前退出时报告错误', async () => {
  await assert.rejects(startFixture('exit'), /DSH 提前退出/)
})

test('DSH 未输出就绪地址时超时', async () => {
  await assert.rejects(startFixture('silent', 100), /DSH 启动超时/)
})

test('重复关闭同一 DSH 子进程是安全的', async () => {
  const server = await startFixture('healthy')
  await Promise.all([server.stop(), server.stop()])
})

function startFixture(mode: 'chunked' | 'exit' | 'healthy' | 'silent', startupTimeoutMs = 1_000): Promise<DshServer> {
  return startDsh({
    bootstrapPath,
    environment: { ...process.env, DSH_FIXTURE_MODE: mode },
    nodeExecutable: process.execPath,
    runtime: { entry: fixtureEntry, root: projectRoot },
    startupTimeoutMs,
  })
}
