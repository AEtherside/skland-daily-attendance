/**
 * 通知管理器
 * 核心类，负责收集数据、渲染模板、分发通知
 */

import type {
  AccountStats,
  BarkChannelConfig,
  ExecutionResult,
  GameStats,
  INotificationManager,
  LogEntry,
  NotificationChannelConfig,
  NotificationData,
  RenderedNotification,
  StatocystsChannelConfig,
} from './types'
import { barkAdapter, renderBarkNotification } from './channels/bark'
import { renderStatocystsNotification, statocystsAdapter } from './channels/statocysts'

/**
 * 通知管理器配置
 */
export interface NotificationManagerOptions {
  channels: NotificationChannelConfig[]
}

/**
 * 通知管理器实现
 */
export class NotificationManager implements INotificationManager {
  private data: NotificationData
  private channels: NotificationChannelConfig[]

  constructor(options: NotificationManagerOptions) {
    this.channels = options.channels
    this.data = this.initializeData()
  }

  /**
   * 初始化数据结构
   */
  private initializeData(): NotificationData {
    return {
      meta: {
        timestamp: new Date(),
        executionResult: 'success',
        hasError: false,
      },
      accounts: {
        total: 0,
        successful: 0,
        skipped: 0,
        failed: 0,
        failedIndexes: [],
      },
      games: [],
      logs: [],
    }
  }

  /**
   * 获取当前数据
   */
  getData(): NotificationData {
    return this.data
  }

  /**
   * 设置执行结果
   */
  setResult(result: ExecutionResult): void {
    this.data.meta.executionResult = result
  }

  /**
   * 标记错误
   */
  markError(): void {
    this.data.meta.hasError = true
  }

  /**
   * 更新账号统计
   */
  updateAccountStats(update: Partial<AccountStats>): void {
    Object.assign(this.data.accounts, update)
  }

  /**
   * 更新游戏统计
   */
  updateGameStats(
    gameId: number,
    gameName: string,
    update: Partial<Omit<GameStats, 'gameId' | 'gameName'>>,
  ): void {
    let gameStats = this.data.games.find(g => g.gameId === gameId)

    if (!gameStats) {
      gameStats = {
        gameId,
        gameName,
        total: 0,
        succeeded: 0,
        alreadyAttended: 0,
        failed: 0,
      }
      this.data.games.push(gameStats)
    }

    Object.assign(gameStats, update)
  }

  /**
   * 获取游戏统计
   */
  getGameStats(gameId: number): GameStats | undefined {
    return this.data.games.find(g => g.gameId === gameId)
  }

  /**
   * 确保游戏统计存在并返回
   */
  ensureGameStats(gameId: number, gameName: string): GameStats {
    let gameStats = this.data.games.find(g => g.gameId === gameId)

    if (!gameStats) {
      gameStats = {
        gameId,
        gameName,
        total: 0,
        succeeded: 0,
        alreadyAttended: 0,
        failed: 0,
      }
      this.data.games.push(gameStats)
    }

    return gameStats
  }

  /**
   * 添加日志条目
   */
  addLog(entry: Omit<LogEntry, 'timestamp'>): void {
    this.logs.push({
      ...entry,
      timestamp: new Date(),
    })

    // 错误日志自动标记
    if (entry.level === 'error') {
      this.data.meta.hasError = true
    }
  }

  /**
   * 获取日志的别名（用于内部访问）
   */
  private get logs(): LogEntry[] {
    return this.data.logs
  }

  /**
   * 控制台输出（不收集到通知）
   */
  log(message: string): void {
    console.log(message)
  }

  /**
   * 控制台错误输出（不收集到通知）
   */
  error(message: string): void {
    console.error(message)
    this.data.meta.hasError = true
  }

  /**
   * 检查是否有错误
   */
  hasError(): boolean {
    return this.data.meta.hasError
  }

  /**
   * 推送通知到所有渠道
   */
  async push(): Promise<void> {
    for (const channel of this.channels) {
      if (!channel.enabled) {
        continue
      }

      // 检查发送条件
      if (!this.shouldSend(channel)) {
        continue
      }

      try {
        await this.sendToChannel(channel)
      }
      catch (error) {
        console.error(`Failed to send notification to ${channel.type}:`, error)
      }
    }
  }

  /**
   * 检查是否应该发送到该渠道
   */
  private shouldSend(channel: NotificationChannelConfig): boolean {
    const sendOn = channel.sendOn ?? ['success', 'failed']
    return sendOn.includes(this.data.meta.executionResult)
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(channel: NotificationChannelConfig): Promise<void> {
    switch (channel.type) {
      case 'bark': {
        const rendered = renderBarkNotification(channel as BarkChannelConfig, this.data)
        await barkAdapter.send(channel as BarkChannelConfig, rendered)
        break
      }
      case 'statocysts': {
        const rendered = renderStatocystsNotification(channel as StatocystsChannelConfig, this.data)
        await statocystsAdapter.send(channel as StatocystsChannelConfig, rendered)
        break
      }
      default:
        console.warn(`Unknown channel type: ${(channel as NotificationChannelConfig).type}`)
    }
  }

  /**
   * 渲染指定渠道的通知（用于调试）
   */
  renderForChannel(channelType: 'bark' | 'statocysts'): RenderedNotification | null {
    const channel = this.channels.find(c => c.type === channelType)
    if (!channel) {
      return null
    }

    switch (channelType) {
      case 'bark':
        return renderBarkNotification(channel as BarkChannelConfig, this.data)
      case 'statocysts':
        return renderStatocystsNotification(channel as StatocystsChannelConfig, this.data)
      default:
        return null
    }
  }
}

/**
 * 创建通知管理器的工厂函数
 */
export function createNotificationManager(
  options: NotificationManagerOptions,
): NotificationManager {
  return new NotificationManager(options)
}
