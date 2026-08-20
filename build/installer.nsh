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

; 只按精确进程名结束主程序。Uninstall DSH Codex Desktop.exe 包含主程序文件名，
; 不能用子串，否则卸载器会被当成仍在运行并自己退出。
!macro desktopAppIsRunning _RESULT
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "if (@(Get-CimInstance Win32_Process | Where-Object { $$_.Name -eq ''${APP_EXECUTABLE_FILENAME}'' }).Count -gt 0) { exit 0 } else { exit 1 }"'
  Pop ${_RESULT}
  Pop $0
!macroend

!macro safeKillDesktopProcesses
  nsExec::ExecToLog '"$SYSDIR\taskkill.exe" /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Pop $0
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $$_.Name -eq ''node.exe'' -and $$_.ExecutablePath -eq ''$INSTDIR\resources\node\node.exe'' } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"'
  Pop $0
  Sleep 800
!macroend

!macro customCheckAppRunning
  Push $R0
  Push $R1
  Push $R2
  Push $R8
  StrCpy $R2 "ask"
  StrCpy $R8 $EXEFILE 9
  ${For} $R1 1 8
    !insertmacro desktopAppIsRunning $R0
    ${If} $R0 != 0
      ${Break}
    ${EndIf}
    ${If} $R2 == "ask"
      MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK +5
      Pop $R8
      Pop $R2
      Pop $R1
      Pop $R0
      Quit
      StrCpy $R2 "kill"
      DetailPrint "$(appClosing)"
    ${EndIf}
    !insertmacro safeKillDesktopProcesses
  ${Next}
  !insertmacro desktopAppIsRunning $R0
  ${If} $R0 == 0
    ${If} $R8 == "Uninstall"
      DetailPrint "卸载器继续执行，不再把自身当成未退出的应用。"
    ${Else}
      MessageBox MB_OK|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDOK
      Pop $R8
      Pop $R2
      Pop $R1
      Pop $R0
      Quit
    ${EndIf}
  ${EndIf}
  Pop $R8
  Pop $R2
  Pop $R1
  Pop $R0
!macroend

!macro customUnInstall
  SetShellVarContext current
  !insertmacro safeKillDesktopProcesses
  RMDir /r "$APPDATA\DSH Codex Desktop"
  RMDir /r "$LOCALAPPDATA\DSH Codex Desktop"
  DeleteRegKey HKCU "Software\${APP_GUID}"
  DeleteRegKey HKLM "Software\${APP_GUID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath ''HKCU:\Control Panel\NotifyIconSettings'' -ErrorAction SilentlyContinue | ForEach-Object { $$p = (Get-ItemProperty -LiteralPath $$_.PSPath -Name ExecutablePath -ErrorAction SilentlyContinue).ExecutablePath; if ($$p -and $$p -like ''*${APP_EXECUTABLE_FILENAME}'') { Remove-Item -LiteralPath $$_.PSPath -Recurse -Force -ErrorAction SilentlyContinue } }"'
  Pop $0
!macroend
