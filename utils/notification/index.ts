/**
 * 通知系统主入口
 */

export * from './channels'
export {
  createBarkChannel,
  createStatocystsChannel,
} from './channels'
export * from './manager'
export {
  createNotificationManager,
  NotificationManager,
} from './manager'

export * from './templates'

export {
  defaultBarkTemplates,
  defaultStatocystsTemplates,
} from './templates'

export * from './types'

// 重新导出常用类型和函数
export type {
  AccountStats,
  BarkChannelConfig,
  ExecutionResult,
  GameStats,
  LogEntry,
  NotificationChannelConfig,
  NotificationData,
  StatocystsChannelConfig,
} from './types'
