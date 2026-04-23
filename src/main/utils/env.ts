import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export function loadEnvFile(): void {
  const envPath = join(process.cwd(), '.env')

  if (!existsSync(envPath)) {
    return
  }

  const envContent = readFileSync(envPath, 'utf-8')

  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}
