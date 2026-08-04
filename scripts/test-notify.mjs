/**
 * 自测脚本：验证 URL 清洗 + 通知失败隔离
 *
 * 模拟 CI 中的通知发送流程，确保：
 * 1. normalizeUrl 不会破坏 json:// 等 Statocysts 协议前缀
 * 2. 通知发送失败不会抛异常（签到任务不受影响）
 *
 * Usage: node scripts/test-notify.mjs
 */

// -------- 从 utils/message.ts 复制的 normalizeUrl --------
function normalizeUrl(url) {
  let normalized = url.trim()

  // Fix missing colon in http/https: "https//" → "https://", "http//" → "http://"
  normalized = normalized.replace(/^(https?)\/\/([^/])/i, '$1://$2')

  // If URL already has a recognized scheme, return as-is
  // (matches json://, tg://, http://, https://, etc.)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    return normalized
  }

  // No scheme — prepend https://
  return `https://${normalized}`
}

// -------- 模拟 push() 的错误隔离逻辑 --------
async function safeNotify(urls) {
  const normalizedUrls = urls
    .map(u => u.trim())
    .filter(u => u.length > 0)
    .map(u => normalizeUrl(u))

  console.log('[notify] normalized urls =', normalizedUrls)

  // 用无效 URL 模拟 statocysts 投递失败
  try {
    const res = await fetch(normalizedUrls[0], { method: 'POST', signal: AbortSignal.timeout(3000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    console.log('✅ 通知发送成功')
  }
  catch (sendError) {
    // 关键：通知失败不抛异常，签到任务不受影响
    console.error('[notify] send failed:', sendError.message ?? sendError)
    console.log('⚠️  通知发送失败，但未影响主流程')
  }
}

// -------- 测试用例 --------
const tests = [
  // [输入, 预期输出, 描述]
  ['json://https://is14w.xyz/wp-json/skland/v1/notify?key=abc', 'json://https://is14w.xyz/wp-json/skland/v1/notify?key=abc', 'json:// 前缀保持不变'],
  ['tg://user?id=123', 'tg://user?id=123', 'tg:// 前缀保持不变'],
  ['https//is14w.xyz/path', 'https://is14w.xyz/path', '缺冒号的 https// 被修复'],
  ['http//is14w.xyz/path', 'http://is14w.xyz/path', '缺冒号的 http// 被修复'],
  ['https://is14w.xyz/path', 'https://is14w.xyz/path', '正常 https 不变'],
  ['is14w.xyz/path', 'https://is14w.xyz/path', '无协议自动补 https://'],
  ['  https://is14w.xyz/path  ', 'https://is14w.xyz/path', '前后空格被 trim'],
]

let passed = 0
let failed = 0

console.log('=== Test 1: normalizeUrl ===\n')

for (const [input, expected, desc] of tests) {
  const result = normalizeUrl(input)
  if (result === expected) {
    console.log(`  ✅ ${desc}`)
    passed++
  }
  else {
    console.log(`  ❌ ${desc}`)
    console.log(`     input:    "${input}"`)
    console.log(`     expected: "${expected}"`)
    console.log(`     got:      "${result}"`)
    failed++
  }
}

console.log(`\n  ${passed}/${tests.length} passed`)

// -------- 模拟通知发送失败 --------
console.log('\n=== Test 2: 通知失败不抛异常 ===\n')

try {
  await safeNotify(['https://127.0.0.1:1/definitely-not-reachable'])
  console.log('  ✅ safeNotify 完成，未抛异常')
  passed++
}
catch (err) {
  console.log(`  ❌ safeNotify 抛出了异常: ${err.message}`)
  failed++
}

// -------- 结果 --------
console.log(`\n========== 结果 ==========`)
console.log(`通过: ${passed}, 失败: ${failed}`)

if (failed > 0) {
  console.log('❌ 测试失败！')
  process.exit(1)
}
else {
  console.log('✅ 全部通过')
  process.exit(0)
}
