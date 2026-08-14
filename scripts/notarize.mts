import { notarize } from '@electron/notarize'
import { join } from 'node:path'

interface AfterSignContext {
  appOutDir: string
  packager: {
    appInfo: {
      productFilename: string
    }
  }
}

export function isNotarizationRequired(githubRef = process.env.GITHUB_REF): boolean {
  return githubRef?.startsWith('refs/tags/v') ?? false
}

export default async function notarizeApplication(context: AfterSignContext): Promise<void> {
  if (process.platform !== 'darwin' || !isNotarizationRequired()) return
  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID
  if (!appleId || !appleIdPassword || !teamId) {
    throw new Error('macOS 标签发布缺少 Apple 公证凭据。')
  }

  await notarize({
    appPath: join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`),
    appleId,
    appleIdPassword,
    teamId,
  })
}
