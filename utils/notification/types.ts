/**
 * Notification System Type Definitions
 * 通知系统类型定义
 */

// ============================================
// 核心数据模型
// ============================================

/**
 * 执行结果类型
 */
export type ExecutionResult = 'success' | 'failed' | 'skipped'

/**
 * 游戏统计数据
 */
export interface GameStats {
  gameId: number
  gameName: string
  total: number
  succeeded: number // 本次签到成功
  alreadyAttended: number // 今天已签到
  failed: number // 签到失败
}

/**
 * 账号统计数据
 */
export interface AccountStats {
  total: number
  successful: number // 所有角色都成功的账号
  skipped: number // 今天已签到的账号
  failed: number // 有失败的账号
  failedIndexes: number[]
}

/**
 * 日志条目
 */
export interface LogEntry {
  accountNumber: number
  level: 'info' | 'error' | 'warning'
  message: string
  gameId?: number
  timestamp?: Date
}

/**
 * 通知数据模型 - 核心数据结构
 * 所有业务数据的结构化表示，用于模板渲染
 */
export interface NotificationData {
  // 元信息
  meta: {
    timestamp: Date
    executionResult: ExecutionResult
    hasError: boolean
  }

  // 账号统计
  accounts: AccountStats

  // 按游戏分组的角色统计
  games: GameStats[]

  // 详细日志（可选，用于详细模板）
  logs: LogEntry[]
}

// ============================================
// 模板系统
// ============================================

/**
 * 模板函数类型
 */
export type TemplateFunction<T = string> = (data: NotificationData) => T

/**
 * 模板定义：可以是字符串模板或函数
 */
export type TemplateDef<T = string> = string | TemplateFunction<T>

/**
 * 渲染后的通知内容
 */
export interface RenderedNotification {
  title: string
  subtitle?: string
  body: string
  [key: string]: unknown // 允许渠道特定字段
}

// ============================================
// 渠道配置
// ============================================

/**
 * 基础渠道配置
 */
export interface BaseChannelConfig {
  type: string
  enabled: boolean
  /**
   * 发送条件：基于执行结果决定是否发送
   * 默认：['success', 'failed']
   */
  sendOn?: ExecutionResult[]
}

/**
 * Bark 渠道配置
 */
export interface BarkChannelConfig extends BaseChannelConfig {
  type: 'bark'
  tokens: string[]

  templates: {
    title: TemplateDef
    subtitle: TemplateDef
    body: TemplateDef
  }

  // Bark 特有参数
  group?: string
  icon?: string
  level?: 'active' | 'timeSensitive' | 'passive'
  url?: string
  sound?: string
}

/**
 * Statocysts 渠道配置
 */
export interface StatocystsChannelConfig extends BaseChannelConfig {
  type: 'statocysts'
  urls: string[]

  templates: {
    title: TemplateDef
    body: TemplateDef
  }
}

/**
 * Webhook 渠道配置（预留扩展）
 */
export interface WebhookChannelConfig extends BaseChannelConfig {
  type: 'webhook'
  url: string
  method?: 'POST' | 'PUT'
  headers?: Record<string, string>

  templates: {
    body: TemplateDef<object> // Webhook 可以发送 JSON
  }
}

/**
 * 所有渠道配置的联合类型
 */
export type NotificationChannelConfig
  = | BarkChannelConfig
    | StatocystsChannelConfig
    | WebhookChannelConfig

// ============================================
// 通知管理器
// ============================================

/**
 * 通知管理器配置
 */
export interface NotificationManagerConfig {
  channels: NotificationChannelConfig[]
}

/**
 * 通知管理器接口
 */
export interface INotificationManager {
  // 数据操作
  getData: () => NotificationData
  setResult: (result: ExecutionResult) => void
  markError: () => void

  // 统计更新
  updateAccountStats: (update: Partial<AccountStats>) => void
  updateGameStats: (gameId: number, gameName: string, update: Partial<Omit<GameStats, 'gameId' | 'gameName'>>) => void

  // 日志记录
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void

  // 控制台输出（不收集到通知）
  log: (message: string) => void
  error: (message: string) => void

  // 推送通知
  push: () => Promise<void>
  hasError: () => boolean
}

// ============================================
// 渠道适配器
// ============================================

/**
 * 渠道适配器接口
 */
export interface ChannelAdapter<T extends BaseChannelConfig = BaseChannelConfig> {
  readonly type: string
  send: (config: T, rendered: RenderedNotification) => Promise<void>
}
