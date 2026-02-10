export * from './attendance'
export * from './format'
export * from './message'
export * from './notification'
export * from './retry'

export function getSplitByComma(value: string) {
  return value ? value.split(',') : []
}

/**
 * Generate a storage key for daily attendance record
 * Uses SHA256 hash of token combined with date in YYYY-MM-DD format (Asia/Shanghai timezone)
 */
export async function generateAttendanceKey(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Get current date in Asia/Shanghai timezone
  const now = new Date()
  const shanghaiDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) // Returns YYYY-MM-DD format

  return `kv:attendance:${hashHex}:${shanghaiDate}`
}
