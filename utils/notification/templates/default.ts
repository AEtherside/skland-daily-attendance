/**
 * 默认模板 - 复刻当前通知格式
 * 保持与原实现完全一致的输出
 */

import type { NotificationData, TemplateFunction } from '../types'
import { defineTemplate } from './utils'

// ============================================
// Bark 模板
// ============================================

/**
 * Bark 标题模板
 */
export const barkTitleTemplate = defineTemplate('森空岛自动签到')

/**
 * Bark 副标题模板 - 根据执行结果动态生成
 */
export const barkSubtitleTemplate = defineTemplate<string>((data) => {
  switch (data.meta.executionResult) {
    case 'skipped':
      return '重复签到'
    case 'failed':
      return '失败❗'
    default:
      return '成功'
  }
})

/**
 * Bark 正文模板 - 完整的通知内容
 */
export const barkBodyTemplate: TemplateFunction = (data) => {
  return buildFullBody(data)
}

// ============================================
// Statocysts 模板
// ============================================

/**
 * Statocysts 标题模板
 */
export const statocystsTitleTemplate = defineTemplate('【森空岛每日签到】')

/**
 * Statocysts 正文模板
 */
export const statocystsBodyTemplate: TemplateFunction = (data) => {
  return buildFullBody(data)
}

// ============================================
// 通用构建函数
// ============================================

/**
 * 构建完整的通知正文
 * 复刻原 attendance.ts 中的消息格式
 *
 * 兼容两种模式：
 * 1. 新模式：使用结构化数据（accounts, games）
 * 2. 旧模式：使用日志消息直接拼接（向后兼容）
 */
function buildFullBody(data: NotificationData): string {
  // 如果日志中包含格式化的消息，直接使用（向后兼容模式）
  if (data.logs.length > 0 && data.logs.some(log => log.message.includes('---') || log.message.includes('=='))) {
    return data.logs.map(log => log.message).join('\n\n')
  }

  // 新模式：从结构化数据构建
  return buildStructuredBody(data)
}

/**
 * 从结构化数据构建通知正文
 */
function buildStructuredBody(data: NotificationData): string {
  const lines: string[] = []

  // 标题
  lines.push('## 森空岛每日签到')

  // 账号日志（按账号分组）
  const logsByAccount = groupLogsByAccount(data.logs)
  for (const [accountNumber, logs] of logsByAccount) {
    if (accountNumber > 0) { // 只显示有效账号
      lines.push('')
      lines.push(`--- 账号 ${accountNumber}/${data.accounts.total} ---`)
      for (const log of logs) {
        lines.push(log.message)
      }
    }
  }

  // 执行摘要
  lines.push('')
  lines.push('========== 执行摘要 ==========')
  lines.push('账号统计:')
  lines.push(`  • 总数: ${data.accounts.total}`)
  lines.push(`  • 成功: ${data.accounts.successful}`)
  lines.push(`  • 跳过: ${data.accounts.skipped}`)

  if (data.accounts.failed > 0) {
    lines.push(`  • 失败: ${data.accounts.failed} (账号 #${data.accounts.failedIndexes.join(', #')})`)
  }

  // 游戏统计
  if (data.games.length > 0) {
    for (const gameStats of data.games) {
      lines.push('')
      lines.push(`【${gameStats.gameName}】角色统计:`)
      lines.push(`  • 总数: ${gameStats.total}`)
      lines.push(`  • 本次签到成功: ${gameStats.succeeded}`)
      lines.push(`  • 今天已签到: ${gameStats.alreadyAttended}`)
      if (gameStats.failed > 0) {
        lines.push(`  • 签到失败: ${gameStats.failed}`)
      }
    }
  }

  return lines.join('\n\n')
}

/**
 * 按账号分组日志
 */
function groupLogsByAccount(logs: NotificationData['logs']): Map<number, NotificationData['logs']> {
  const grouped = new Map<number, NotificationData['logs']>()

  for (const log of logs) {
    const existing = grouped.get(log.accountNumber) || []
    existing.push(log)
    grouped.set(log.accountNumber, existing)
  }

  return grouped
}

// ============================================
// 预设模板配置
// ============================================

/**
 * Bark 默认模板配置
 */
export const defaultBarkTemplates = {
  title: barkTitleTemplate,
  subtitle: barkSubtitleTemplate,
  body: barkBodyTemplate,
}

/**
 * Statocysts 默认模板配置
 */
export const defaultStatocystsTemplates = {
  title: statocystsTitleTemplate,
  body: statocystsBodyTemplate,
}
