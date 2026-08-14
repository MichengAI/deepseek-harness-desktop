import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { copyWorkspacePackages } from '../scripts/prepare-runtime.js'

test('跳过指向普通文件的工作区链接', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-'))
  try {
    const packagesRoot = join(root, 'packages')
    const packageRoot = join(packagesRoot, 'fixture', 'package')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: '@deepseek-ai/fixture' }), 'utf8')
    const sourceFile = join(root, 'CLAUDE.md')
    await writeFile(sourceFile, '无关文件', 'utf8')
    try {
      await symlink(sourceFile, join(packagesRoot, 'CLAUDE.md'), 'file')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EPERM') t.skip('当前环境不允许创建文件链接')
      else throw error
      return
    }

    const runtimeRoot = join(root, 'runtime')
    await copyWorkspacePackages(packagesRoot, 2, runtimeRoot)
    assert.equal(existsSync(join(runtimeRoot, 'node_modules', '@deepseek-ai', 'fixture', 'package.json')), true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
