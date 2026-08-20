[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$ApplicationPath
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'

$resolvedApplication = (Resolve-Path -LiteralPath $ApplicationPath).Path
$installDir = Split-Path -Parent $resolvedApplication
$resourcesDir = Join-Path $installDir 'resources'
$bundledNode = Join-Path $resourcesDir 'node\node.exe'
$runtimeExtractor = Join-Path $resourcesDir 'extract-runtime.mjs'
if ((Test-Path -LiteralPath $bundledNode) -and (Test-Path -LiteralPath $runtimeExtractor)) {
  & $bundledNode $runtimeExtractor $installDir $resourcesDir
  if ($LASTEXITCODE -ne 0) { throw "随包运行时解压失败，退出码：$LASTEXITCODE" }
}
$application = Start-Process -FilePath $resolvedApplication -PassThru
$bootstrapProcessId = $null

try {
  $deadline = (Get-Date).AddSeconds(60)
  $port = $null
  while ((Get-Date) -lt $deadline -and $null -eq $port) {
    $bootstrap = Get-CimInstance Win32_Process | Where-Object {
      $_.ParentProcessId -eq $application.Id -and $_.CommandLine -like '*bootstrap.mjs*'
    } | Select-Object -First 1
    if ($null -ne $bootstrap) {
      $bootstrapProcessId = $bootstrap.ProcessId
      $listener = Get-NetTCPConnection -OwningProcess $bootstrapProcessId -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -eq '127.0.0.1' } |
        Select-Object -First 1
      if ($null -ne $listener) { $port = $listener.LocalPort }
    }
    if ($null -eq $port) { Start-Sleep -Milliseconds 500 }
  }
  if ($null -eq $port) { throw '打包应用在 60 秒内未启动本机 HTTP 服务。' }

  $baseUrl = "http://127.0.0.1:$port"
  $page = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing
  if ($page.StatusCode -ne 200) { throw "根页面返回 HTTP $($page.StatusCode)。" }
  $asset = [regex]::Match($page.Content, '(?:src|href)=["''](?<path>/[^"'']+\.(?:js|css))')
  if (-not $asset.Success) { throw '根页面未找到可验证的前端资源。' }
  $assetResponse = Invoke-WebRequest -Uri "$baseUrl$($asset.Groups['path'].Value)" -UseBasicParsing
  if ($assetResponse.StatusCode -ne 200) { throw "前端资源返回 HTTP $($assetResponse.StatusCode)。" }
} finally {
  $application.Refresh()
  if (-not $application.HasExited) {
    Stop-Process -Id $application.Id -Force -ErrorAction SilentlyContinue
    $application.WaitForExit(10000) | Out-Null
  }
  if ($null -ne $bootstrapProcessId) {
    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline -and (Get-Process -Id $bootstrapProcessId -ErrorAction SilentlyContinue)) {
      Start-Sleep -Milliseconds 250
    }
    if (Get-Process -Id $bootstrapProcessId -ErrorAction SilentlyContinue) {
      throw "DSH 引导进程 $bootstrapProcessId 未在应用退出后结束。"
    }
  }
}
