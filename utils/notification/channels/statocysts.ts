/**
 * Statocysts 通知渠道适配器
 * https://github.com/octoplorer/statocysts
 */

import type { ChannelAdapter, NotificationData, RenderedNotification, StatocystsChannelConfig } from '../types'
import { createSender } from 'statocysts'
import { defaultStatocystsTemplates } from '../templates/default'
import { renderTemplate } from '../templates/utils'

/**
 * Statocysts 渠道适配器
 */
export const statocystsAdapter: ChannelAdapter<StatocystsChannelConfig> = {
  type: 'statocysts',

  async send(config, rendered) {
    if (config.urls.length === 0) {
      return
    }

    const sender = createSender(config.urls)
    await sender.send(rendered.title, rendered.body)
  },
}

/**
 * 创建 Statocysts 渠道配置的辅助函数
 */
export function createStatocystsChannel(
  urls: string[],
  options: Partial<Omit<StatocystsChannelConfig, 'type' | 'urls'>> = {},
): StatocystsChannelConfig {
  return {
    type: 'statocysts',
    enabled: true,
    urls,
    templates: options.templates ?? defaultStatocystsTemplates,
    sendOn: options.sendOn ?? ['success', 'failed'],
  }
}

/**
 * 渲染 Statocysts 通知
 */
export function renderStatocystsNotification(
  config: StatocystsChannelConfig,
  data: NotificationData,
): RenderedNotification {
  return {
    title: renderTemplate(config.templates.title, data),
    body: renderTemplate(config.templates.body, data),
  }
}
