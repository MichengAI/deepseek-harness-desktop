# DeepSeek Harness Desktop

[English](#english) | [中文](#中文)

## 中文

DeepSeek Harness Desktop 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Windows x64 桌面启动器。它将 DSH Web 界面封装为原生桌面应用，并随安装包提供运行所需的 Node.js 与 DSH 运行时。

### 功能

- 启动本地 DSH Web 会话，无需预先安装 Node.js。
- 保留 DeepSeek Harness 的工作区、会话、模型、插件和 Agent 预设能力。
- 支持中文界面、浅色 / 深色 / 跟随系统主题，以及默认权限和发送行为设置。
- 仅加载本机 `127.0.0.1` 服务；窗口关闭后最小化到托盘，可从托盘恢复或退出。

### 安装与使用

1. 前往 [Releases](https://github.com/MichengAI/deepseek-harness-desktop/releases) 下载最新的 `DeepSeek Harness Desktop-*-x64.exe`。
2. 运行安装程序，完成安装后启动 **DeepSeek Harness Desktop**。
3. 首次启动时，应用会在本机启动 DSH 服务并打开桌面窗口。

安装包包含完整运行时，安装阶段可能需要数分钟。请等待安装程序完成，不要在进度停留时立即取消。

### 开发

前提：Windows、Node.js 24、pnpm 11，以及已构建的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 源码。

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm install --frozen-lockfile
pnpm test
$env:DSH_RUNTIME_ROOT = 'D:\Repository\deepseek-harness'
pnpm run dist
```

构建产物位于本地 `dist\`，该目录不会提交到仓库。发布版本时推送 `vX.Y.Z` 标签，GitHub Actions 会自动创建 Release 并上传安装包。

### 安全与数据

- DSH 服务仅监听本机回环地址。
- 桌面窗口关闭 Node.js 集成并启用沙箱。
- DSH 配置与数据保存在当前 Windows 用户的应用数据目录中。

---

## English

DeepSeek Harness Desktop is a Windows x64 desktop launcher for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It wraps the DSH web interface in a native desktop application and bundles the Node.js and DSH runtimes required to run it.

### Features

- Starts local DSH web sessions without a separate Node.js installation.
- Preserves DeepSeek Harness workspaces, sessions, models, plugins, and Agent presets.
- Supports Chinese UI, light / dark / system themes, default permission modes, and send behavior settings.
- Loads only the local `127.0.0.1` service; closing the window minimizes it to the tray, where it can be restored or quit.

### Install and use

1. Download the latest `DeepSeek Harness Desktop-*-x64.exe` from [Releases](https://github.com/MichengAI/deepseek-harness-desktop/releases).
2. Run the installer and start **DeepSeek Harness Desktop** after installation.
3. On first launch, the application starts a local DSH service and opens the desktop window.

The installer includes the complete runtime and may take several minutes to finish. Please allow it to complete before cancelling.

### Development

Prerequisites: Windows, Node.js 24, pnpm 11, and a built checkout of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm install --frozen-lockfile
pnpm test
$env:DSH_RUNTIME_ROOT = 'D:\Repository\deepseek-harness'
pnpm run dist
```

Build output is kept locally in `dist\` and is not committed. Push a `vX.Y.Z` tag to create a GitHub Release and upload the installer automatically.

### Security and data

- The DSH service listens only on the local loopback address.
- The desktop window disables Node.js integration and enables sandboxing.
- DSH configuration and data are stored in the current Windows user's application data directory.
