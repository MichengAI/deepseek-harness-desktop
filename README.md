# DeepSeek Harness Desktop

<p align="center">
  <strong>A native Windows desktop launcher for DeepSeek Harness.</strong>
</p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="https://github.com/MichengAI/deepseek-harness-desktop/releases">Download</a> ·
  <a href="https://github.com/MichengAI/deepseek-harness-desktop/issues">Report an issue</a>
</p>

> **Preview release.** DeepSeek Harness Desktop is a community-maintained Windows distribution project. It is not an official DeepSeek AI product.

DeepSeek Harness Desktop packages the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web experience as a native Windows application. It bundles the required Node.js runtime, starts DSH locally, and opens the interface in a dedicated desktop window.

## Download

Download the latest Windows x64 installer from [GitHub Releases](https://github.com/MichengAI/deepseek-harness-desktop/releases).

| Package | Recommended for |
| --- | --- |
| **DeepSeek Harness Desktop-*-x64.exe** | Most Windows users |
| **DeepSeek Harness Desktop-*-x64.zip** | Portable or manual deployment |

Only download installers from this repository's Releases page. Unsigned preview builds may display a Windows SmartScreen warning.

## Screenshots

<p align="center">
  <img src="assets/screenshots/workspace-session.png" alt="Workspace and coding review session" width="960">
</p>

<p align="center">
  <em>Workspace, session timeline, tool activity, and model controls.</em>
</p>

<p align="center">
  <img src="assets/screenshots/settings.png" alt="Desktop settings" width="960">
</p>

<p align="center">
  <em>Language, theme, default permission mode, and Agent preset settings.</em>
</p>

## What it provides

- **Windows-native startup** — installs and launches DeepSeek Harness without a separate Node.js installation.
- **Local DSH runtime** — starts DSH on a randomly assigned loopback port and renders it in an Electron window.
- **Focused desktop workflow** — uses the existing DSH workspace, session, model, plugin, and Agent preset capabilities.
- **Desktop behavior** — single-instance protection, system-tray controls, and safe handling of external links.
- **Continuity with DSH CLI** — reuses the current user's DSH home directory, including existing settings and sessions.

## Requirements

| Item | Requirement |
| --- | --- |
| Operating system | Windows 10 or Windows 11 |
| Architecture | x64 |
| Network | Required only for the model providers and tools you configure |
| Node.js | Not required for end users; bundled with the application |

## Install and get started

1. Download the latest **.exe** installer from [Releases](https://github.com/MichengAI/deepseek-harness-desktop/releases).
2. Run the installer and launch **DeepSeek Harness Desktop**.
3. Wait for the local DSH service to start, then create or open a workspace and session.
4. Configure models, plugins, permissions, and Agent presets in DSH settings as needed.

The installer bundles a complete runtime. Installation and first startup can take several minutes on some machines; allow the process to finish before cancelling.

## Privacy and security

- The launcher accepts and loads only validated local HTTP addresses on **127.0.0.1**.
- External HTTP(S) links open in the system browser; file, JavaScript, and data URLs are blocked.
- Electron runs with Node.js integration disabled, context isolation enabled, and sandboxing enabled.
- DSH configuration, sessions, and credentials remain in **%USERPROFILE%\.dsh**. Uninstalling the desktop launcher does not remove that directory.
- The launcher does not expose Electron IPC APIs to the DSH page.

Your configured model providers and DSH tools may make their own network requests. Review their respective settings and policies before use.

## Troubleshooting

| Situation | What to do |
| --- | --- |
| Installation appears to pause | Wait several minutes. The installer is extracting the bundled runtime. |
| Windows SmartScreen appears | Verify the download came from this repository's Releases page; preview builds are not yet code-signed. |
| Startup fails | Reopen the app and check the diagnostic path shown in the error window. |
| Existing DSH data is not visible | Confirm you are using the same Windows account and inspect %USERPROFILE%\.dsh. |

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

Build output is written locally to **release\** and is not committed. Pushing a **vX.Y.Z** tag runs the Windows packaging workflow and creates a GitHub Release.

## Support and contribution

- Report defects and feature requests through [GitHub Issues](https://github.com/MichengAI/deepseek-harness-desktop/issues).
- Before submitting a pull request, run the test suite and keep user-facing text in Simplified Chinese where applicable.
- See the upstream [DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness) for DSH-specific functionality and documentation.

## License

No project license has been declared in this repository yet. Please obtain permission from the repository owner before redistributing the source code or binaries.
