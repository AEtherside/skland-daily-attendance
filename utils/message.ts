import { createNotifier } from './notifier'

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
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
    const urls = options.notificationUrls ? toArray(options.notificationUrls) : []

    if (urls.length > 0) {
      const notifier = createNotifier(urls)
      try {
        const results = await notifier.send({ title, body: content })

        // 如果任意一个通知失败，则记录，但不抛出致命错误
        let anyFailed = false
        for (const res of results) {
          if (!res.ok) {
            anyFailed = true
            console.error('[notify] send failed:', res)
          } else {
            console.info('[notify] sent:', res.status)
          }
        }
        if (anyFailed) {
          // 保持和之前一致：标记为发生错误（有需要时可由 onError 处理）
          hasError = true
        }
      } catch (sendError) {
        // 最后一道防线：不让通知错误致命
        console.error('[notify] send threw an exception:', sendError)
        hasError = true
      }
    }

    // Exit with error if any error occurred
    if (hasError && options.onError) {
      options.onError()
    }
  }

  return { log, error, notify, notifyError, info, infoError, collect, push, hasError: () => hasError } as const
}
