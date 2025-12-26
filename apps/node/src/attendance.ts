import type { AttendanceStatus } from 'skland-kit'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { createClient } from 'skland-kit'
import { createSender } from 'statocysts'

const client = createClient()

interface Options {
  notificationUrls?: string | string[]
}

function isTodayAttended(attendanceStatus: AttendanceStatus) {
  return attendanceStatus.records.some((i) => {
    const today = new Date().setHours(0, 0, 0, 0)
    return new Date(Number(i.ts) * 1000).setHours(0, 0, 0, 0) === today
  })
}

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

function createCombinePushMessage(options: Options) {
  const messages: string[] = []
  let hasError = false
  const logger = (message: string, error?: boolean) => {
    messages.push(message)
    console[error ? 'error' : 'log'](message)
    if (error && !hasError)
      hasError = true
  }
  const push = async () => {
    const title = `【森空岛每日签到】`
    const content = messages.join('\n\n')
    const urls = options.notificationUrls ? toArray(options.notificationUrls) : []
    const sender = createSender(urls)

    await sender.send(title, content)

    // quit with error
    if (hasError)
      process.exit(1)
  }
  const add = (message: string) => {
    messages.push(message)
  }
  return [logger, push, add] as const
}

export async function doAttendanceForAccount(token: string, options: Options) {
  const { code } = await client.collections.hypergryph.grantAuthorizeCode(token)

  await client.signIn(code)

  const { list } = await client.collections.player.getBinding()

  const [combineMessage, excutePushMessage, addMessage] = createCombinePushMessage(options)

  addMessage('## 明日方舟签到')

  let successAttendance = 0
  const characterList = list.filter(i => i.appCode === 'arknights').map(i => i.bindingList).flat()
  const maxRetries = Number.parseInt(process.env.MAX_RETRIES || '3', 10) // 添加最大重试次数

  await Promise.all(characterList.map(async (character) => {
    console.log(`将签到第${successAttendance + 1}个角色`)
    let retries = 0 // 初始化重试计数器
    while (retries < maxRetries) {
      try {
        const query = {
          uid: character.uid,
          gameId: character.channelMasterId,
        }
        const attendanceStatus = await client.collections.game.getAttendanceStatus(query)

        if (isTodayAttended(attendanceStatus)) {
          combineMessage(`${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'}角色 ${successAttendance + 1} 今天已经签到过了`)
          break // 已经签到过，跳出重试循环
        }
        else {
          const data = await client.collections.game.attendance(query)

          const msg = `${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'}角色 ${successAttendance + 1} 签到成功${`, 获得了${data.awards.map(a => `「${a.resource.name}」${a.count}个`).join(',')}`}`
          combineMessage(msg)
          successAttendance++
          break // 签到成功，跳出重试循环
        }
      }
      catch (error: any) {
        if (error.response && error.response.status === 403) {
          combineMessage(`${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'}角色 ${successAttendance + 1} 今天已经签到过了`)
          break // 已经签到过，跳出重试循环
        }
        else {
          combineMessage(`签到过程中出现未知错误: ${error.message}`, true)
          console.error('发生未知错误，工作流终止。')
          retries++ // 增加重试计数器
          if (retries >= maxRetries) {
            process.exit(1) // 达到最大重试次数，终止工作流
          }
        }
      }
      // 多个角色之间的延时
      await setTimeout(3000)
    }
  }))

  if (successAttendance !== 0)
    combineMessage(`成功签到${successAttendance}个角色`)

  await excutePushMessage()
}
