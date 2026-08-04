/**
 * Debug: 直接测试通知通道，不经过签到逻辑
 *
 * Usage: node scripts/debug-notify.mjs
 * Env:   SKLAND_NOTIFICATION_URLS (必填)
 */

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

// Bypass statocysts for json:// / jsons:// — its URL parser mangles nested ://
const jsonMatch = normalizedUrl.match(/^(jsons?):\/\/(.+)/i)
if (jsonMatch) {
  // The part after json:// is the actual endpoint URL
  let endpoint = jsonMatch[2]
  if (!/^https?:\/\//i.test(endpoint)) {
    // Inner URL has no protocol — add one (json→http, jsons→https)
    const proto = jsonMatch[1].toLowerCase() === 'jsons' ? 'https://' : 'http://'
    endpoint = proto + endpoint
  }
  console.log('json channel POST to:', endpoint)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '【森空岛每日签到 - 调试消息】',
        body: [
          '调试消息，验证通知通道。',
          `时间: ${new Date().toISOString()}`,
        ].join('\n'),
      }),
    })
    if (res.ok) {
      console.log('✅ 通知发送成功 (HTTP', res.status, ')')
      const replyText = await res.text().catch(() => '')
      console.log('Response:', replyText || '(empty)')
      process.exit(0)
    }
    console.error('❌ 通知发送失败 (HTTP', res.status, ')')
    const replyText = await res.text().catch(() => '')
    console.error('Response:', replyText || '(empty)')
    process.exit(1)
  }
  catch (err) {
    console.error('❌ 通知发送失败')
    console.error('Error:', err.message ?? err)
    process.exit(1)
  }
}

// Other protocols: use statocysts
const { createNotifier } = await import('statocysts')
const notifier = createNotifier([normalizedUrl])

try {
  await notifier.send({
    title: '【森空岛每日签到 - 调试消息】',
    body: `调试消息。\n时间: ${new Date().toISOString()}`,
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
  process.exit(1)
}
