import assert from 'node:assert'
import process from 'node:process'
import { doAttendanceForAccount } from './attendance'
import { bark, messagePusher, serverChan } from '@skland-x/notification'

try {
  process.loadEnvFile('.env')
} catch {
  // ignore, dotenv 基本只适用于本地开发
}

assert(typeof process.env.SKLAND_TOKEN === 'string', 'SKLAND_TOKEN 未设置')

const accounts = process.env.SKLAND_TOKEN.split(',')

// 创建全局的消息收集器
const globalMessages: string[] = []
let hasGlobalError = false

const addGlobalMessage = (message: string, error?: boolean) => {
  globalMessages.push(message)
  if (error) hasGlobalError = true}

for (const [index, token] of accounts.entries()) {
  console.log(`开始处理第 ${index + 1}/${accounts.length} 个账号`)
  
  // 为每个账号执行签到，并收集消息
  const accountResult = await doAttendanceForAccount(token, {
    withServerChan: false, // 禁用单个账号的推送
    withBark: false,       // 禁用单个账号的推送
    withMessagePusher: false // 禁用单个账号的推送
  })
  
  // 收集账号结果到全局消息
  addGlobalMessage(`### 账号 ${index + 1} 签到结果`)
  addGlobalMessage(accountResult.message)
  if (accountResult.hasError) {
    addGlobalMessage(`账号签到出错`, true)
  }
}

// 所有账号处理完成后统一推送
if (globalMessages.length > 0) {
  const title = `【森空岛每日签到】${hasGlobalError ? '（有错误）' : ''}`
  const content = globalMessages.join('\n\n')
  
  if (process.env.SERVER_CHAN_TOKEN) {
    await serverChan(process.env.SERVER_CHAN_TOKEN, title, content)
  }
  if (process.env.BARK_URL) {
    await bark(process.env.BARK_URL, title, content)
  }
  if (process.env.MESSAGE_PUSHER_URL) {
    await messagePusher(process.env.MESSAGE_PUSHER_URL, title, content)
  }

  // 如果有错误则退出码为1
  if (hasGlobalError) process.exit(1)
}
