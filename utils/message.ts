import { createNotifier } from 'statocysts'

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

/**
 * Normalize a notification URL to a valid format.
 * Handles common user input mistakes like missing colons in protocol.
 * Preserves Statocysts protocol prefixes (json://, tg://, etc.).
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim()

  // Fix missing colon: "https//" → "https://" (at start or after channel prefix like "json://")
  normalized = normalized.replace(/(^|:\/\/)(https?)\/\/([^/])/gi, '$1$2://$3')

  // If URL already has a recognized scheme, return as-is
  // (matches json://, tg://, http://, https://, etc.)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    return normalized
  }

  // No scheme — prepend https://
  return `https://${normalized}`
}

export interface CreateMessageCollectorOptions {
  notificationUrls?: string | string[]
  onError?: () => void
}

export interface CollectOptions {
  output?: boolean // Whether to output to console (default: false)
  isError?: boolean // Whether this is an error message (default: false)
}

export interface MessageCollector {
  // Console only (不收集到通知)
  log: (message: string) => void
  error: (message: string) => void

  // Notification only (不输出到控制台)
  notify: (message: string) => void
  notifyError: (message: string) => void

  // Console + Notification (同时输出和收集)
  info: (message: string) => void
  infoError: (message: string) => void

  // Utility
  push: () => Promise<void>
  hasError: () => boolean

  /** @deprecated Use notify(), info(), or notifyError() instead */
  collect: (message: string, options?: CollectOptions) => void
}

export function createMessageCollector(options: CreateMessageCollectorOptions): MessageCollector {
  const messages: string[] = []
  let hasError = false

  const log = (message: string) => {
    console.log(message)
  }

  const error = (message: string) => {
    console.error(message)
    hasError = true
  }

  // Notification only methods
  const notify = (message: string) => {
    messages.push(message)
  }

  const notifyError = (message: string) => {
    messages.push(message)
    hasError = true
  }

  // Combined methods (Console + Notification)
  const info = (message: string) => {
    console.log(message)
    messages.push(message)
  }

  const infoError = (message: string) => {
    console.error(message)
    messages.push(message)
    hasError = true
  }

  /** @deprecated Use notify(), info(), or notifyError() instead */
  const collect = (message: string, opts: CollectOptions = {}) => {
    const { output = false, isError = false } = opts

    // Add to notification messages
    messages.push(message)

    // Output to console if requested
    if (output) {
      console[isError ? 'error' : 'log'](message)
    }

    // Mark as error if needed
    if (isError) {
      hasError = true
    }
  }

  const push = async () => {
    const title = '【森空岛每日签到】'
    const content = messages.join('\n\n')
    const urls = options.notificationUrls
      ? toArray(options.notificationUrls)
          .map(url => url.trim())
          .filter(url => url.length > 0)
          .map(url => normalizeUrl(url))
      : []

    if (urls.length > 0) {
      console.info('[notify] normalized urls =', urls)

      for (const url of urls) {
        try {
          // Bypass statocysts for json:// / jsons:// — its normalizeTarget()
          // uses new URL() which mangles nested :// (e.g. json://https://... → json://https//...)
          const jsonMatch = url.match(/^(jsons?):\/\/(.+)/i)
          if (jsonMatch) {
            let endpoint = jsonMatch[2]
            if (!/^https?:\/\//i.test(endpoint)) {
              // Inner URL has no protocol — add one (json→http, jsons→https)
              const proto = jsonMatch[1].toLowerCase() === 'jsons' ? 'https://' : 'http://'
              endpoint = proto + endpoint
            }
            console.info('[notify] json channel POST to:', endpoint)
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, body: content }),
            })
            if (!res.ok) {
              console.error(`[notify] json channel returned ${res.status}:`, await res.text().catch(() => ''))
              hasError = true
            }
            continue
          }

          const notifier = createNotifier([url])
          await notifier.send({ title, body: content })
        }
        catch (sendError) {
          // Don't let notification failures crash the attendance task
          console.error('[notify] send failed:', sendError)
          hasError = true
        }
      }
    }

    // Exit with error if any error occurred
    if (hasError && options.onError) {
      options.onError()
    }
  }

  return { log, error, notify, notifyError, info, infoError, collect, push, hasError: () => hasError } as const
}
