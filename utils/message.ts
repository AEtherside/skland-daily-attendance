import { createSender } from 'statocysts'

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export type ExecutionResult = 'success' | 'failed' | 'skipped'

export interface CreateMessageCollectorOptions {
  notificationUrls?: string | string[]
  barkTokens?: string[]
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

  // Execution result
  setResult: (result: ExecutionResult) => void

  // Utility
  push: () => Promise<void>
  hasError: () => boolean

  /** @deprecated Use notify(), info(), or notifyError() instead */
  collect: (message: string, options?: CollectOptions) => void
}

function buildBarkUrls(barkTokens: string[], subtitle: string): string[] {
  const params = new URLSearchParams({
    subtitle,
    group: 'Skland Notification',
    level: 'timeSensitive',
    url: 'skland://',
  })

  return barkTokens.map(key => `bark://api.day.app/${key}?${params.toString()}`)
}

export function createMessageCollector(options: CreateMessageCollectorOptions): MessageCollector {
  const messages: string[] = []
  let hasError = false
  let executionResult: ExecutionResult = 'success'

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

  const setResult = (result: ExecutionResult) => {
    executionResult = result
  }

  const push = async () => {
    const content = messages.join('\n\n')

    // Regular notifications (skip when all accounts are repeated/skipped)
    if (executionResult !== 'skipped') {
      const urls = options.notificationUrls ? toArray(options.notificationUrls) : []
      if (urls.length > 0) {
        const sender = createSender(urls)
        await sender.send('【森空岛每日签到】', content)
      }
    }

    // Bark notifications (always fire, with dynamic subtitle)
    const barkTokens = options.barkTokens ?? []
    if (barkTokens.length > 0) {
      const subtitle = executionResult === 'skipped'
        ? '重复签到'
        : executionResult === 'failed'
          ? '失败❗'
          : '成功'

      const barkUrls = buildBarkUrls(barkTokens, subtitle)
      const barkSender = createSender(barkUrls)
      await barkSender.send('森空岛自动签到', content)
    }

    // Exit with error if any error occurred
    if (hasError && options.onError) {
      options.onError()
    }
  }

  return { log, error, notify, notifyError, info, infoError, collect, setResult, push, hasError: () => hasError } as const
}
