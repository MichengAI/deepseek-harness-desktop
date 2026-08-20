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

export function isNotarizationConfigured(
  appleId = process.env.APPLE_ID,
  appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD,
  teamId = process.env.APPLE_TEAM_ID,
): boolean {
  return Boolean(appleId && appleIdPassword && teamId)
}

export function assertNotarizationConfigured(appleId?: string, appleIdPassword?: string, teamId?: string): void {
  if (!isNotarizationConfigured(appleId, appleIdPassword, teamId)) {
    throw new Error('正式标签发布必须配置完整的 Apple 公证凭据。')
  }
}

export default async function notarizeApplication(context: AfterSignContext): Promise<void> {
  if (process.platform !== 'darwin' || !isNotarizationRequired()) return
  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID
  assertNotarizationConfigured(appleId, appleIdPassword, teamId)
  if (!appleId || !appleIdPassword || !teamId) return

  await notarize({
    appPath: join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`),
    appleId,
    appleIdPassword,
    teamId,
  })
}
