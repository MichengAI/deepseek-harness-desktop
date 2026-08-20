<p align="center">
  <img src="assets/icon.png" alt="DeepSeek Harness Desktop" width="96">
</p>

<h1 align="center">DeepSeek Harness Desktop</h1>

<p align="center">
  <strong>A native desktop launcher for DeepSeek Harness on Windows, macOS, and Linux.</strong>
</p>

<p align="center">
  <a href="https://github.com/MichengAI/dsh-codex-desktop/releases">Download</a> ·
  <a href="https://github.com/MichengAI/dsh-codex-desktop/issues">Report an issue</a>
</p>

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/MichengAI/dsh-codex-desktop/releases"><img src="https://img.shields.io/github/v/release/MichengAI/dsh-codex-desktop?display_name=tag&label=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache License 2.0"></a>
  <a href="https://github.com/MichengAI/dsh-codex-desktop/actions/workflows/desktop-package.yml"><img src="https://github.com/MichengAI/dsh-codex-desktop/actions/workflows/desktop-package.yml/badge.svg?branch=main" alt="Desktop package"></a>
  <img src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-000000?logo=apple&logoColor=white" alt="macOS Apple Silicon and Intel">
  <img src="https://img.shields.io/badge/Windows-x64-0078D4?logo=windows&logoColor=white" alt="Windows x64">
  <img src="https://img.shields.io/badge/Linux-x64-FCC624?logo=linux&logoColor=black" alt="Linux x64">
</p>

<p align="center">
  <img src="assets/screenshots/workspace-session.png" alt="Workspace and coding review session" width="960">
</p>

> DeepSeek Harness Desktop is a community-maintained distribution project. It is not an official DeepSeek AI product.

DeepSeek Harness Desktop packages the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web experience as a native desktop application. It bundles the required Node.js runtime, starts DSH locally, and opens the interface in a dedicated desktop window.

## Download

Download supported packages from [GitHub Releases](https://github.com/MichengAI/dsh-codex-desktop/releases).

| Platform | Package | Release status |
| --- | --- | --- |
| Windows x64 | **.exe** installer | Available · [Download](https://github.com/MichengAI/dsh-codex-desktop/releases/download/v0.1.4/DeepSeek.Harness.Desktop-0.1.4-win-x64.exe) |
| Windows x64 | **.zip** archive | Available · [Download](https://github.com/MichengAI/dsh-codex-desktop/releases/download/v0.1.4/DeepSeek.Harness.Desktop-0.1.4-win-x64.zip) |
| macOS Apple Silicon | **.dmg** installer | Available · [Download](https://github.com/MichengAI/dsh-codex-desktop/releases/download/v0.1.4/DeepSeek.Harness.Desktop-0.1.4-mac-arm64.dmg) |
| macOS Intel | **.dmg** installer | Available · [Download](https://github.com/MichengAI/dsh-codex-desktop/releases/download/v0.1.4/DeepSeek.Harness.Desktop-0.1.4-mac-x64.dmg) |
| Linux x64 | **.AppImage** | Available · [Download](https://github.com/MichengAI/dsh-codex-desktop/releases/download/v0.1.4/DeepSeek.Harness.Desktop-0.1.4-linux-x86_64.AppImage) |
| Debian / Ubuntu x64 | **.deb** package | Available · [Download](https://github.com/MichengAI/dsh-codex-desktop/releases/download/v0.1.4/DeepSeek.Harness.Desktop-0.1.4-linux-amd64.deb) |

All current and historical packages are available from [GitHub Releases](https://github.com/MichengAI/dsh-codex-desktop/releases).

## Screenshots

<p align="center">
  <em>Start a new workspace conversation with model and permission controls.</em>
</p>

<p align="center">
  <img src="assets/screenshots/settings.png" alt="Desktop settings" width="960">
</p>

<p align="center">
  <em>Choose a built-in Agent preset or create a custom preset.</em>
</p>

## What it provides

- **Native startup** — installs and launches DeepSeek Harness on Windows, macOS, and Linux without a separate Node.js installation.
- **Local DSH runtime** — starts DSH on a randomly assigned loopback port and renders it in an Electron window.
- **Focused desktop workflow** — uses the existing DSH workspace, session, model, plugin, and Agent preset capabilities.
- **Bundled community plugins** — first launch seeds Codex UI, IM, automation, skills, archive, and agency experts into the Web profile. Later installs and updates still go through code-ui / dshmarket via `dsh plugin add`.
- **Desktop behavior** — single-instance protection, system-tray controls, and safe handling of external links.
- **Continuity with DSH CLI** — reuses the current user's DSH home directory, including existing settings and sessions.

## Requirements

| Item | Requirement |
| --- | --- |
| Operating system | Windows 10/11, macOS, or Linux |
| Architecture | Windows x64, macOS Apple Silicon (arm64), macOS Intel (x64), or Linux x64 |
| Network | Required only for the model providers and tools you configure |
| Node.js | Not required for end users; bundled with the application |

## Install and get started

1. Download the package for your operating system from [Releases](https://github.com/MichengAI/dsh-codex-desktop/releases).
2. Run the Windows **.exe** installer, open the macOS **.dmg**, run the Linux **.AppImage**, or install the Debian/Ubuntu **.deb** package; then launch **DeepSeek Harness Desktop**.
3. Wait for the local DSH service to start, then create or open a workspace and session.
4. Configure models, plugins, permissions, and Agent presets in DSH settings as needed.

The installer bundles a complete runtime. Installation and first startup can take several minutes on some machines; allow the process to finish before cancelling.

## Privacy and security

- The launcher accepts and loads only validated local HTTP addresses on **127.0.0.1**.
- External HTTP(S) links open in the system browser; file, JavaScript, and data URLs are blocked.
- Electron runs with Node.js integration disabled, context isolation enabled, and sandboxing enabled.
- DSH configuration, sessions, and credentials remain in **~/.dsh** (on Windows: **%USERPROFILE%\.dsh**). Uninstalling the desktop launcher does not remove that directory.
- The launcher does not expose Electron IPC APIs to the DSH page.

Your configured model providers and DSH tools may make their own network requests. Review their respective settings and policies before use.

## Troubleshooting

| Situation | What to do |
| --- | --- |
| Installation appears to pause | Wait several minutes. The installer is extracting the bundled runtime. |
| macOS says the app cannot be opened | Move the application to Applications, then open it again and follow the system prompt. |
| Startup fails | Reopen the app and check the diagnostic path shown in the error window. |
| Existing DSH data is not visible | Confirm you are using the same account and inspect ~/.dsh (on Windows: %USERPROFILE%\.dsh). |

## Development

Development requires Windows, Node.js 24.19.0, pnpm 11.20.0, and a built checkout of DeepSeek Harness.

~~~powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm install --frozen-lockfile
pnpm test
$env:DSH_RUNTIME_ROOT = 'D:\Repository\deepseek-harness'
pnpm run dist
~~~

Build output is written locally to **release\** and is not committed. Pushing a **vX.Y.Z** tag builds Windows x64, macOS Apple Silicon/Intel, and Linux x64 AppImage/DEB packages.

## Project documentation

Project status, active work, architecture constraints, and iteration records are available from the [documentation entry point](docs/00-交接入口/00-阅读导航.md).

## Support and contribution

- Report defects and feature requests through [GitHub Issues](https://github.com/MichengAI/dsh-codex-desktop/issues).
- Before submitting a pull request, run the test suite and keep user-facing text in Simplified Chinese where applicable.
- See the upstream [DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness) for DSH-specific functionality and documentation.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
