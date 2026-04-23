export function formatTimestamp(seconds: number): string {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(totalMilliseconds / 3600000)
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000)
  const secs = Math.floor((totalMilliseconds % 60000) / 1000)
  const milliseconds = totalMilliseconds % 1000

  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':') +
    `.${String(milliseconds).padStart(3, '0')}`
}

export function parseTimestamp(timestamp: string): number {
  const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)

  if (!match) {
    throw new Error(`Timestamp inválido encontrado: ${timestamp}`)
  }

  const [, hours, minutes, seconds, milliseconds] = match

  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  )
}
