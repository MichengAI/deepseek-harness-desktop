# DeepSeek Harness Desktop

<p align="center">
  <strong>支持 Windows 与 macOS 的 DeepSeek Harness 原生桌面启动器。</strong>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="https://github.com/MichengAI/deepseek-harness-desktop/releases">下载</a> ·
  <a href="https://github.com/MichengAI/deepseek-harness-desktop/issues">反馈问题</a>
</p>

> **预览版本。** DeepSeek Harness Desktop 是社区维护的分发项目，并非 DeepSeek AI 官方产品。

DeepSeek Harness Desktop 将 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web 使用体验封装为原生桌面应用。它随安装包提供所需 Node.js 运行时，在本机启动 DSH，并在独立桌面窗口中打开界面。

## 下载

请从 [GitHub Releases](https://github.com/MichengAI/deepseek-harness-desktop/releases) 下载对应平台的安装包。

| 平台 | 文件 | 发布状态 |
| --- | --- | --- |
| Windows x64 | **.exe** 安装器 / **.zip** 压缩包 | 当前可用 |
| macOS Apple Silicon | **.dmg** 安装器 / **.zip** 压缩包 | 完成 Apple 签名与公证后发布 |
| macOS Intel | **.dmg** 安装器 / **.zip** 压缩包 | 完成 Apple 签名与公证后发布 |

请只从本仓库的 Releases 页面下载安装程序。Windows 预览版可能触发 SmartScreen；macOS 安装包仅会在签名和公证完成后发布。

## 界面预览

<p align="center">
  <img src="assets/screenshots/workspace-session.png" alt="工作区与代码审查会话界面" width="960">
</p>

<p align="center">
  <em>工作区、会话时间线、工具活动与模型控制。</em>
</p>

<p align="center">
  <img src="assets/screenshots/settings.png" alt="桌面端设置界面" width="960">
</p>

<p align="center">
  <em>语言、主题、默认权限模式与 Agent 预设设置。</em>
</p>

## 核心能力

- **原生启动**：无需单独安装 Node.js，即可在 Windows 与 macOS 安装和启动 DeepSeek Harness。
- **本地 DSH 运行时**：以随机本机端口启动 DSH，并在 Electron 窗口中加载。
- **保留 DSH 工作流**：继续使用 DSH 的工作区、会话、模型、插件和 Agent 预设能力。
- **桌面端行为**：提供单实例保护、系统托盘控制及安全的外部链接处理。
- **延续 CLI 数据**：沿用当前用户的 DSH 数据目录，保留既有设置和会话。

## 系统要求

| 项目 | 要求 |
| --- | --- |
| 操作系统 | Windows 10/11 或 macOS |
| 架构 | Windows x64、macOS Apple Silicon（arm64）或 macOS Intel（x64） |
| 网络 | 仅在使用你配置的模型供应商和工具时需要 |
| Node.js | 终端用户无需安装，应用已内置 |

## 安装与开始使用

1. 前往 [Releases](https://github.com/MichengAI/deepseek-harness-desktop/releases) 下载对应操作系统的安装包。
2. Windows 运行 **.exe** 安装器；macOS 打开 **.dmg**，然后启动 **DeepSeek Harness Desktop**。
3. 等待本地 DSH 服务启动，再创建或打开工作区和会话。
4. 按需在 DSH 设置中配置模型、插件、权限和 Agent 预设。

安装包包含完整运行时。部分设备在安装或首次启动时可能需要数分钟，请等待完成后再取消。

## 隐私与安全

- 启动器只接受并加载经校验的 **127.0.0.1** 本地 HTTP 地址。
- 外部 HTTP(S) 链接由系统浏览器打开；文件、JavaScript 和 data URL 会被拦截。
- Electron 已禁用 Node.js 集成，并启用上下文隔离和沙箱。
- DSH 配置、会话和凭据保存在 **%USERPROFILE%\.dsh**；卸载桌面启动器不会删除该目录。
- 启动器不会向 DSH 页面暴露 Electron IPC 接口。

你配置的模型供应商和 DSH 工具可能自行发起网络请求；使用前请核对其设置和隐私政策。

## 常见问题

| 情况 | 处理方式 |
| --- | --- |
| 安装进度似乎停住 | 请等待数分钟，安装器正在解压随包运行时。 |
| 出现 Windows SmartScreen | 确认安装包来自本仓库 Releases 页面；预览版暂未代码签名。 |
| macOS 提示无法打开应用 | 仅使用 Releases 中已签名、公证的版本；未签名预览制品不面向终端用户发布。 |
| 启动失败 | 重新打开应用，并查看错误窗口显示的诊断日志路径。 |
| 看不到已有 DSH 数据 | 确认使用同一 Windows 账号，并检查 %USERPROFILE%\.dsh。 |

## 开发

开发环境需要 Windows、Node.js 24.19.0、pnpm 11.20.0，以及已构建的 DeepSeek Harness 源码。

~~~powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm install --frozen-lockfile
pnpm test
$env:DSH_RUNTIME_ROOT = 'D:\Repository\deepseek-harness'
pnpm run dist
~~~

构建制品仅写入本地 **release\**，不会提交。推送 **vX.Y.Z** 标签后，工作流会构建 Windows x64 与两种 macOS 架构；macOS 制品仅在 Apple 签名与公证成功后进入 GitHub Release。

## 项目文档

项目状态、当前工作、技术约束和迭代记录，请从[文档交接入口](docs/00-交接入口/00-阅读导航.md)阅读。

## 支持与贡献

- 请通过 [GitHub Issues](https://github.com/MichengAI/deepseek-harness-desktop/issues) 提交缺陷和功能建议。
- 提交 Pull Request 前请运行测试，并保持用户可见文本使用简体中文。
- DSH 本身的功能与文档，请参阅上游 [DeepSeek Harness 仓库](https://github.com/deepseek-ai/deepseek-harness)。

## 许可证

本仓库当前尚未声明项目许可证。重新分发源码或二进制文件前，请先取得仓库所有者许可。
