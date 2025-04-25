import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { attendance, auth, getBinding, signIn } from './api'
import { bark, serverChan, messagePusher } from './notifications'
import { getPrivacyName } from './utils'

interface Options {
  /** server 酱推送功能的启用，false 或者 server 酱的token */
  withServerChan?: false | string
  /** bark 推送功能的启用，false 或者 bark 的 URL */
  withBark?: false | string
  /** 消息推送功能的启用，false 或者 message-pusher 的 WebHook URL */
  withMessagePusher?: false | string
}

export async function doAttendanceForAccount(token: string, options: Options) {
  const { code } = await auth(token)
  const { cred, token: signToken } = await signIn(code)
  const { list } = await getBinding(cred, signToken)

  const createCombinePushMessage = () => {
    const messages: string[] = []
    let hasError = false
    const logger = (message: string, error?: boolean) => {
      messages.push(message)
      console[error ? 'error' : 'log'](message)
      if (error && !hasError)
        hasError = true
    }
    const push
      = async () => {
        if (options.withServerChan) {
          await serverChan(
            options.withServerChan,
            `【森空岛每日签到】`,
            messages.join('\n\n'),
          )
        }
        if (options.withBark) {
          await bark(
            options.withBark,
            `【森空岛每日签到】`,
            messages.join('\n\n'),
          )
        }
        if (options.withMessagePusher) {
          await messagePusher(
            options.withMessagePusher,
            `【森空岛每日签到】`,
            messages.join('\n\n'),
          )
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

  const [combineMessage, excutePushMessage, addMessage] = createCombinePushMessage()

  addMessage('## 明日方舟签到')
  let successAttendance = 0
  const characterList = list.map(i => i.bindingList).flat()
  const maxRetries = parseInt(process.env.MAX_RETRIES, 10) || 3 // 添加最大重试次数
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

  /** 登岛检票已经被风控 所以不提供这个功能了 */
  // addMessage(`# 森空岛每日签到 \n\n> ${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date())}`)
  // addMessage('## 森空岛各版面每日检票')
  // const isCheckIn = await getScoreIsCheckIn(cred, signToken)

  // await Promise.all(
  //   SKLAND_BOARD_IDS
  //     .map(async (id) => {
  //       // 过滤已经签到过的
  //       const name = SKLAND_BOARD_NAME_MAPPING[id]
  //       if (isCheckIn.data.list.find(i => i.gameId === id)?.checked !== 1) {
  //         const data = await checkIn(cred, signToken, id)

  //         if (data.message === 'OK' && data.code === 0) {
  //           combineMessage(`版面【${name}】登岛检票成功`)
  //         }
  //         else {
  //           // 登岛检票 最后不会以错误结束进程
  //           combineMessage(`版面【${name}】登岛检票失败, 错误信息: ${data.message}`)
  //         }
  //         // 多个登岛检票之间的延时
  //         await setTimeout(3000)
  //       } else {
  //         combineMessage(`版面【${name}】今天已经登岛检票过了`)
  //       }
  //     })
  // )

  await excutePushMessage()
}
