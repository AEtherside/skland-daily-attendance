import { spawn } from 'node:child_process'
import process from 'node:process'
import waitOn from 'wait-on'

const PORT = process.env.NITRO_PORT || 3000
const HOST = process.env.NITRO_HOST || 'localhost'
const BASE_URL = `http://${HOST}:${PORT}`

console.log('🚀 准备启动 Nitro 服务...')

// 启动服务
const server = spawn('pnpm', ['dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NITRO_PORT: String(PORT),
  },
})

// 处理服务进程错误
server.on('error', (error) => {
  console.error('❌ 启动服务失败:', error)
  process.exit(1)
})

try {
  // 等待服务就绪
  console.log(`⏳ 等待服务启动 (${BASE_URL})...`)
  await waitOn({
    resources: [BASE_URL],
    timeout: 60000, // 60 秒超时
    interval: 1000, // 每秒检查一次
  })
  console.log('✅ 服务已启动')

  // 触发 attendance 任务
  console.log('📋 触发 attendance 任务...')
  const taskUrl = `${BASE_URL}/_nitro/tasks/attendance`

  const response = await fetch(taskUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log('📊 任务响应:', JSON.stringify(data, null, 2))

  // 检查任务结果
  if (data.result === 'success') {
    console.log('✅ 任务执行成功')
    process.exit(0)
  }
  else {
    console.error('❌ 任务执行失败')
    process.exit(1)
  }
}
catch (error) {
  console.error('❌ 执行失败:', error)
  process.exit(1)
}
finally {
  // 清理：停止服务
  console.log('🛑 停止服务...')
  server.kill('SIGTERM')

  // 给进程一些时间优雅关闭
  setTimeout(() => {
    server.kill('SIGKILL')
  }, 3000)
}
