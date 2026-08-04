/**
 * Debug: 直接测试通知通道，不经过签到逻辑
 *
 * Usage: node scripts/debug-notify.mjs
 * Env:   SKLAND_NOTIFICATION_URLS (必填)
 */

import { createNotifier } from 'statocysts'
import process from 'node:process'

// -------- normalizeUrl (from utils/message.ts) --------
function normalizeUrl(url) {
  let normalized = url.trim()
  // Fix "https//" → "https://" at start or after a channel prefix like "json://"
  normalized = normalized.replace(/(^|:\/\/)(https?)\/\/([^/])/gi, '$1$2://$3')
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    return normalized
  }
  return `https://${normalized}`
}

// -------- main --------
const rawUrl = process.env.SKLAND_NOTIFICATION_URLS

if (!rawUrl) {
  console.log('⚠️  SKLAND_NOTIFICATION_URLS 未设置，跳过测试')
  process.exit(0)
}

console.log('原始 URL:', rawUrl)
console.log('原始长度:', rawUrl.length)
console.log('原始字符码:', [...rawUrl].map(c => c.charCodeAt(0).toString(16)).join(' '))

const normalizedUrl = normalizeUrl(rawUrl)
console.log('清洗后 URL:', normalizedUrl)

const notifier = createNotifier([normalizedUrl])

try {
  await notifier.send({
    title: '【森空岛每日签到 - 调试消息】',
    body: [
      '这是一条调试消息，用于验证通知通道是否正常工作。',
      '',
      `原始 URL: ${rawUrl}`,
      `清洗后 URL: ${normalizedUrl}`,
      `时间: ${new Date().toISOString()}`,
    ].join('\n'),
  })
  console.log('✅ 通知发送成功')
  process.exit(0)
}
catch (err) {
  console.error('❌ 通知发送失败')
  console.error('Error name:', err.name)
  console.error('Error message:', err.message)
  if (err.failures) {
    console.error('Failures:')
    for (const f of err.failures) {
      console.error('  target:', f.target)
      console.error('  cause:', f.cause?.message ?? f.cause)
      if (f.cause?.stack) console.error('  stack:', f.cause.stack)
    }
  }
  if (err.stack) console.error('Stack:', err.stack)
  process.exit(1)
}
