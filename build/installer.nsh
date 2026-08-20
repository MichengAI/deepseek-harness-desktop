!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "WinMessages.nsh"
!insertmacro GetFileName

!ifndef BUILD_UNINSTALLER
  Function .onVerifyInstDir
    Push $R0
    Push $R1
    Push $R2

    StrCpy $R0 "$INSTDIR" "" -1
    ${If} $R0 == "\"
      StrCpy $INSTDIR "$INSTDIR" -1
    ${EndIf}

    ${GetFileName} $INSTDIR $R0
    ${If} $R0 != "${APP_FILENAME}"
      StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
      FindWindow $R1 "#32770" "" $HWNDPARENT
      ${If} $R1 != 0
        GetDlgItem $R2 $R1 1019
        ${If} $R2 != 0
          SendMessage $R2 ${WM_SETTEXT} 0 "STR:$INSTDIR"
        ${EndIf}
      ${EndIf}
    ${EndIf}

    Pop $R2
    Pop $R1
    Pop $R0
  FunctionEnd
!endif

!macro customInstall
  DetailPrint "正在解压运行时，请稍候..."
  nsExec::ExecToLog '"$INSTDIR\resources\node\node.exe" "$INSTDIR\resources\extract-runtime.mjs" "$INSTDIR" "$INSTDIR\resources"'
  Pop $0
!macroend

; 只结束桌面主进程及其子进程，绝不按安装目录无差别扫杀。
; 官方 CHECK_APP_RUNNING 会把 Uninstall*.exe 一并杀掉，卸载就会中途退出并留下注册表。
!macro safeKillDesktopProcesses
  nsExec::ExecToLog '"$SYSDIR\taskkill.exe" /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Pop $0
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith(''$INSTDIR'') -and $$_.Name -notlike ''Uninstall*'' } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"'
  Pop $0
  Sleep 800
!macroend

!macro customCheckAppRunning
  Push $R0
  Push $R1
  Push $R2
  StrCpy $R2 "ask"
  ${For} $R1 1 8
    nsExec::ExecToStack '"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO CSV /NH | findstr /I /C:"${APP_EXECUTABLE_FILENAME}"'
    Pop $R0
    Pop $0
    ${If} $R0 != 0
      ${Break}
    ${EndIf}
    ${If} $R2 == "ask"
      MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK +4
      Pop $R2
      Pop $R1
      Pop $R0
      Quit
      StrCpy $R2 "kill"
      DetailPrint "$(appClosing)"
    ${EndIf}
    !insertmacro safeKillDesktopProcesses
  ${Next}
  nsExec::ExecToStack '"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO CSV /NH | findstr /I /C:"${APP_EXECUTABLE_FILENAME}"'
  Pop $R0
  Pop $0
  ${If} $R0 == 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDOK
    Pop $R2
    Pop $R1
    Pop $R0
    Quit
  ${EndIf}
  Pop $R2
  Pop $R1
  Pop $R0
!macroend

!macro customUnInstall
  SetShellVarContext current
  !insertmacro safeKillDesktopProcesses
  RMDir /r "$APPDATA\DSH Codex Desktop"
  RMDir /r "$LOCALAPPDATA\DSH Codex Desktop"
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath ''HKCU:\Control Panel\NotifyIconSettings'' -ErrorAction SilentlyContinue | ForEach-Object { $$p = (Get-ItemProperty -LiteralPath $$_.PSPath -Name ExecutablePath -ErrorAction SilentlyContinue).ExecutablePath; if ($$p -and $$p -like ''*${APP_EXECUTABLE_FILENAME}'') { Remove-Item -LiteralPath $$_.PSPath -Recurse -Force -ErrorAction SilentlyContinue } }"'
  Pop $0
!macroend
