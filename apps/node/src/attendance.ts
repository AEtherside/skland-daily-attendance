import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { attendance, auth, getBinding, signIn } from '@skland-x/core'
import { bark, messagePusher, serverChan } from '@skland-x/notification'

interface Options {
  /** server 酱推送功能的启用，false 或者 server 酱的token */
  withServerChan?: false | string
  /** bark 推送功能的启用，false 或者 bark 的 URL */
  withBark?: false | string
  /** 消息推送功能的启用，false 或者 message-pusher 的 WebHook URL */
  withMessagePusher?: false | string
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
    if (options.withServerChan) {
      await serverChan(options.withServerChan, title, content)
    }
    if (options.withBark) {
      await bark(options.withBark, title, content)
    }
    if (options.withMessagePusher) {
      await messagePusher(options.withMessagePusher, title, content)
    }
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
  const { code } = await auth(token)
  const { cred, token: signToken } = await signIn(code)
  const { list } = await getBinding(cred, signToken)

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
        const data = await attendance(cred, signToken, {
          uid: character.uid,
          gameId: character.channelMasterId,
        })
        if (data) {
          if (data.code === 0 && data.message === 'OK') {
            const msg = `${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'}角色 ${successAttendance + 1} 签到成功${`, 获得了${data.data.awards.map(a => `「${a.resource.name}」${a.count}个`).join(',')}`}`
            combineMessage(msg)
            successAttendance++
            break // 签到成功，跳出重试循环
          }
          else {
            const msg = `${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'}角色 ${successAttendance + 1} 签到失败${`, 错误消息: ${data.message}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``}`
            combineMessage(msg, true)
            retries++ // 签到失败，增加重试计数器
          }
        }
        else {
          combineMessage(`${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'}角色 ${successAttendance + 1} 今天已经签到过了`)
          break // 已经签到过，跳出重试循环
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
