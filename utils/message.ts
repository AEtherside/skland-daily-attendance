import { createSender } from 'statocysts'

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export interface CreateMessageCollectorOptions {
  notificationUrls?: string | string[]
  onError?: () => void
}

export function createMessageCollector(options: CreateMessageCollectorOptions) {
  const messages: string[] = []
  let hasError = false

  const log = (message: string, isError = false) => {
    messages.push(message)
    console[isError ? 'error' : 'log'](message)
    if (isError) {
      hasError = true
    }
  }

  const push = async () => {
    const title = '【森空岛每日签到】'
    const content = messages.join('\n\n')
    const urls = options.notificationUrls ? toArray(options.notificationUrls) : []
    const sender = createSender(urls)

    await sender.send(title, content)

    // Exit with error if any error occurred
    if (hasError && options.onError) {
      options.onError()
    }
  }

  return { log, push, hasError: () => hasError } as const
}
