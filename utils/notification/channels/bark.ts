/**
 * Bark 通知渠道适配器
 * https://github.com/Finb/Bark
 */

import type { BarkChannelConfig, ChannelAdapter, NotificationData, RenderedNotification } from '../types'
import { defaultBarkTemplates } from '../templates/default'
import { renderTemplate } from '../templates/utils'

/**
 * Bark 推送请求体
 */
interface BarkPushRequest {
  device_keys: string[]
  title: string
  subtitle?: string
  body?: string
  markdown?: string
  group?: string
  icon?: string
  level?: 'active' | 'timeSensitive' | 'passive'
  url?: string
  sound?: string
}

/**
 * Bark 渠道适配器
 */
export const barkAdapter: ChannelAdapter<BarkChannelConfig> = {
  type: 'bark',

  async send(config, rendered) {
    if (config.tokens.length === 0) {
      return
    }

    const body: BarkPushRequest = {
      device_keys: config.tokens,
      title: rendered.title,
      subtitle: rendered.subtitle,
      markdown: rendered.body,
      group: config.group ?? 'Skland Notification',
      level: config.level ?? 'timeSensitive',
      url: config.url ?? 'skland://',
    }

    // 可选参数
    if (config.icon) {
      body.icon = config.icon
    }
    if (config.sound) {
      body.sound = config.sound
    }

    await fetch('https://api.day.app/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
}

/**
 * 创建 Bark 渠道配置的辅助函数
 */
export function createBarkChannel(
  tokens: string[],
  options: Partial<Omit<BarkChannelConfig, 'type' | 'tokens'>> = {},
): BarkChannelConfig {
  return {
    type: 'bark',
    enabled: true,
    tokens,
    templates: options.templates ?? defaultBarkTemplates,
    sendOn: options.sendOn ?? ['success', 'failed', 'skipped'],
    group: options.group,
    icon: options.icon,
    level: options.level,
    url: options.url,
    sound: options.sound,
  }
}

/**
 * 渲染 Bark 通知
 */
export function renderBarkNotification(
  config: BarkChannelConfig,
  data: NotificationData,
): RenderedNotification {
  return {
    title: renderTemplate(config.templates.title, data),
    subtitle: renderTemplate(config.templates.subtitle, data),
    body: renderTemplate(config.templates.body, data),
  }
}
