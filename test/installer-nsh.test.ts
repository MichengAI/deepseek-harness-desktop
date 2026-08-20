import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

const installerPath = join(process.cwd(), 'build', 'installer.nsh')

test('installer.nsh 在使用 LogicLib 宏前必须引入 LogicLib.nsh', async () => {
  const source = await readFile(installerPath, 'utf8')
  const logicLibIndex = source.indexOf('!include "LogicLib.nsh"')
  const ifIndex = source.indexOf('${If}')

  assert.notEqual(ifIndex, -1, '安装目录回填应使用 ${If}')
  assert.notEqual(logicLibIndex, -1, '缺少 LogicLib.nsh，NSIS 会把 ${If} 当成未知命令')
  assert.ok(logicLibIndex < ifIndex, 'LogicLib.nsh 必须出现在第一个 ${If} 之前')
  assert.match(source, /\$INSTDIR\\\$\{APP_FILENAME\}/)
  assert.match(source, /customInstall/)
  assert.match(source, /extract-runtime/)
  assert.match(source, /nsExec::ExecToLog/)
  assert.doesNotMatch(source, /ExecWait/)
  assert.match(source, /customUnInstall/)
  assert.match(source, /taskkill\.exe/)
  assert.match(source, /\$\{APP_EXECUTABLE_FILENAME\}/)
  assert.match(source, /\$APPDATA\\DSH Codex Desktop/)
  assert.doesNotMatch(source, /userdata-dir\.txt/)
  assert.doesNotMatch(source, /DeepSeek Harness Desktop/)
  assert.doesNotMatch(source, /\\.dsh/)
  assert.match(source, /customCheckAppRunning/, '必须覆盖官方按安装目录杀进程的逻辑')
  assert.match(source, /NotifyIconSettings/, '卸载必须清理托盘图标注册表残留')
  assert.match(source, /safeKillDesktopProcesses/, '安装和卸载必须复用同一套安全结束进程逻辑')
  assert.match(source, /Name -eq/, '判断应用是否运行必须精确匹配主进程名')
  assert.match(source, /EXEFILE 9/, '卸载器必须靠自身文件名前缀识别，不能误判为主程序')
  assert.match(source, /\$R8 == "Uninstall"/, '卸载过程中即使误判也不得退出卸载器')
  assert.match(source, /DeleteRegKey HKLM "Software\\\$\{APP_GUID\}"/, '必须同时清 HKLM 安装登记，避免残留在程序列表')
  assert.doesNotMatch(source, /findstr/, '不得用 findstr 子串匹配进程名')
  assert.doesNotMatch(source, /prefetch|AppListBackup|bam/i, '不得删除 Windows 系统预取和 BAM 痕迹')
})
