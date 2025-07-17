import assert from 'node:assert'
import process from 'node:process'
import { doAttendanceForAccount } from './attendance'

try {
  process.loadEnvFile('.env')
} catch {
  // ignore, dotenv 基本只适用于本地开发
}

assert(typeof process.env.SKLAND_TOKEN === 'string', 'SKLAND_TOKEN 未设置')

const accounts = process.env.SKLAND_TOKEN.split(',')

for (const [index, token] of accounts.entries()) {
  console.log(`开始处理第 ${index + 1}/${accounts.length} 个账号`)
  // eslint-disable-next-line antfu/no-top-level-await
  await doAttendanceForAccount(token, {
    withServerChan: process.env.SERVER_CHAN_TOKEN,
    withBark: process.env.BARK_URL,
    withMessagePusher: process.env.MESSAGE_PUSHER_URL,
  })
}
