import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..', '..')
const sourceRoot = resolve(process.env.DSH_RUNTIME_ROOT ?? join(projectRoot, '..', 'deepseek-harness'))
const runtimeRoot = join(projectRoot, 'runtime')
const nodeRoot = join(projectRoot, 'runtime-node')
const projectManifest = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
  config?: { bundledNodeSha256?: unknown, bundledNodeVersion?: unknown }
}
const expectedNodeVersion = projectManifest.config?.bundledNodeVersion
const expectedNodeSha256 = projectManifest.config?.bundledNodeSha256

if (typeof expectedNodeVersion !== 'string' || typeof expectedNodeSha256 !== 'string') {
  throw new Error('package.json 缺少随包 Node 的版本或 SHA256 配置。')
}
if (process.version !== expectedNodeVersion) {
  throw new Error('随包 Node 版本不匹配：需要 ' + expectedNodeVersion + '，实际 ' + process.version + '。')
}

if (!existsSync(join(sourceRoot, 'apps', 'cli', 'lib', 'bin.js'))) {
  throw new Error(`未找到已构建 DSH：${sourceRoot}`)
}

for (const target of [runtimeRoot, nodeRoot]) {
  if (!target.startsWith(projectRoot + sep)) throw new Error(`拒绝清理项目外路径：${target}`)
  await rm(target, { recursive: true, force: true })
}

const pnpmEntry = process.env.npm_execpath
if (!pnpmEntry) throw new Error('未找到 pnpm 入口，必须通过 pnpm 执行运行时装配。')

const deployed = spawnSync(process.execPath, [
  pnpmEntry,
  '--pm-on-fail=ignore',
  '--dir', sourceRoot,
  '--filter', '@deepseek-ai/dsh',
  'deploy',
  '--legacy',
  '--prod',
  '--config.node-linker=hoisted',
  '--config.auto-install-peers=false',
  '--config.link-workspace-packages=true',
  runtimeRoot,
], { cwd: sourceRoot, stdio: 'inherit' })
if (deployed.status !== 0) throw new Error(`DSH 运行时部署失败（退出码 ${deployed.status ?? '未知'}）。`)

await copyWorkspacePackages(join(sourceRoot, 'vendor'), 1)
await copyWorkspacePackages(join(sourceRoot, 'packages'), 2)
await copyWorkspacePackages(join(sourceRoot, 'apps'), 1)
await copyWorkspacePackages(join(sourceRoot, 'native', 'landlock-run'), 1)
await copyWorkspacePackages(join(sourceRoot, 'native', 'landlock-run', 'packages'), 1)

if (!existsSync(join(runtimeRoot, 'node_modules', '@deepseek-ai', 'cordis-plugin-group'))) {
  throw new Error('DSH 运行时缺少 cordis-plugin-group。')
}

const nodeExecutable = process.execPath
const nodeSha256 = createHash('sha256').update(await readFile(nodeExecutable)).digest('hex').toUpperCase()
if (nodeSha256 !== expectedNodeSha256) {
  throw new Error('随包 Node SHA256 不匹配：' + nodeSha256 + '。')
}
await mkdir(nodeRoot, { recursive: true })
await cp(nodeExecutable, join(nodeRoot, process.platform === 'win32' ? 'node.exe' : 'node'))
await writeFile(join(nodeRoot, 'node.sha256'), nodeSha256 + '\n', 'utf8')

console.log(`已装配 DSH 运行时：${runtimeRoot}`)
console.log(`已装配 Node 运行时：${nodeRoot}`)

async function copyWorkspacePackage(sourcePackage: string, destinationPackage: string): Promise<void> {
  await rm(destinationPackage, { recursive: true, force: true })
  const nestedNodeModules = join(sourcePackage, 'node_modules')
  await cp(sourcePackage, destinationPackage, {
    dereference: false,
    filter: path => path !== nestedNodeModules && !path.startsWith(nestedNodeModules + sep),
    recursive: true,
  })
}

async function copyWorkspacePackages(directory: string, depth: 1 | 2): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    const firstLevel = join(directory, entry.name)
    const candidates = depth === 1
      ? [firstLevel]
      : (await readdir(firstLevel, { withFileTypes: true }))
        .filter(child => child.isDirectory() || child.isSymbolicLink())
        .map(child => join(firstLevel, child.name))
    for (const candidate of candidates) {
      const manifestPath = join(candidate, 'package.json')
      if (!existsSync(manifestPath)) continue
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { name?: unknown }
      if (typeof manifest.name !== 'string' || !manifest.name.startsWith('@deepseek-ai/')) continue
      await copyWorkspacePackage(await realpath(candidate), join(runtimeRoot, 'node_modules', manifest.name))
    }
  }
}
