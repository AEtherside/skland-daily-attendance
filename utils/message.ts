/**
 * 消息收集器 - 适配器层
 * 保留旧接口，内部委托给新的 NotificationManager
 */

import type {
  NotificationManager,
} from './notification'
import type { NotificationChannelConfig } from './notification/types'
import {
  createBarkChannel,
  createNotificationManager,
  createStatocystsChannel,
} from './notification'

// 重新导出类型（保持向后兼容）
export type { ExecutionResult } from './notification/types'

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export interface CreateMessageCollectorOptions {
  notificationUrls?: string | string[]
  barkTokens?: string[]
  onError?: () => void
}

export interface CollectOptions {
  output?: boolean // Whether to output to console (default: false)
  isError?: boolean // Whether this is an error message (default: false)
}

/**
 * 消息收集器接口 - 保持向后兼容
 */
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
  setResult: (result: 'success' | 'failed' | 'skipped') => void

  // Utility
  push: () => Promise<void>
  hasError: () => boolean

  // 新增：获取底层通知管理器（用于高级用法）
  getManager: () => NotificationManager

  /** @deprecated Use notify(), info(), or notifyError() instead */
  collect: (message: string, options?: CollectOptions) => void
}

/**
 * 从旧配置构建渠道配置
 */
function buildChannelsFromLegacyOptions(
  options: CreateMessageCollectorOptions,
): NotificationChannelConfig[] {
  const channels: NotificationChannelConfig[] = []

  // Statocysts 渠道
  const urls = options.notificationUrls ? toArray(options.notificationUrls) : []
  if (urls.length > 0) {
    channels.push(createStatocystsChannel(urls, {
      sendOn: ['success', 'failed'], // 不发送 skipped
    }))
  }

  // Bark 渠道
  const barkTokens = options.barkTokens ?? []
  if (barkTokens.length > 0) {
    channels.push(createBarkChannel(barkTokens, {
      sendOn: ['success', 'failed', 'skipped'], // 包括 skipped
    }))
  }

  return channels
}

/**
 * 创建消息收集器
 * 这是适配器函数，保持旧 API 不变但使用新的实现
 */
export function createMessageCollector(options: CreateMessageCollectorOptions): MessageCollector {
  // 构建渠道配置
  const channels = buildChannelsFromLegacyOptions(options)

  // 创建通知管理器
  const manager = createNotificationManager({ channels })

  /**
   * 内部方法：添加消息到日志
   */
  const addMessage = (message: string, isError: boolean = false) => {
    // 添加到结构化日志
    manager.addLog({
      accountNumber: 0, // 兼容模式下不追踪账号
      level: isError ? 'error' : 'info',
      message,
    })
  }

  // 控制台输出方法
  const log = (message: string) => {
    console.log(message)
  }

  const error = (message: string) => {
    console.error(message)
    manager.markError()
  }

  // 通知收集方法
  const notify = (message: string) => {
    addMessage(message, false)
  }

  const notifyError = (message: string) => {
    addMessage(message, true)
  }

  // 组合方法（控制台 + 通知）
  const info = (message: string) => {
    console.log(message)
    addMessage(message, false)
  }

  const infoError = (message: string) => {
    console.error(message)
    addMessage(message, true)
  }

  // 设置执行结果
  const setResult = (result: 'success' | 'failed' | 'skipped') => {
    manager.setResult(result)
  }

  // 推送通知
  const push = async () => {
    await manager.push()

    // 兼容旧的 onError 回调
    if (manager.hasError() && options.onError) {
      options.onError()
    }
  }

  // 获取底层管理器
  const getManager = () => manager

  /** @deprecated 使用 notify(), info(), 或 notifyError() 代替 */
  const collect = (message: string, opts: CollectOptions = {}) => {
    const { output = false, isError = false } = opts

    addMessage(message, isError)

    if (output) {
      console[isError ? 'error' : 'log'](message)
    }
  }

  return {
    log,
    error,
    notify,
    notifyError,
    info,
    infoError,
    setResult,
    push,
    hasError: () => manager.hasError(),
    getManager,
    collect,
  } as const
}
