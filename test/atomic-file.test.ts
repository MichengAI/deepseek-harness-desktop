import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { writeTextFileAtomic } from '../src/atomic-file.js'

test('原子写入会完整替换清单且不留下临时文件', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-atomic-'))
  try {
    const target = join(root, 'package.json')
    await writeFile(target, '{"old":true}\n', 'utf8')
    await writeTextFileAtomic(target, '{"next":true}\n')
    assert.equal(await readFile(target, 'utf8'), '{"next":true}\n')
    assert.deepEqual(await readdir(root), ['package.json'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
