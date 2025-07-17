import type { BindingUserItem } from '@skland-x/core'
import type { Storage } from 'unstorage'
import { TZDate } from '@date-fns/tz'
import { attendance, auth, getBinding, signIn } from '@skland-x/core'
import { format, sub } from 'date-fns'
import { defu } from 'defu'
import { createStorage } from 'unstorage'
import cloudflareKVBindingDriver from 'unstorage/drivers/cloudflare-kv-binding'
import { context, DEFULAT_CONFIG, useContext } from './context'
import { pick, retry } from './utils'

function formatCharacterName(character: BindingUserItem) {
  return `${formatChannelName(character.channelMasterId)}角色${formatPrivacyName(character.nickName)}`
}

function formatChannelName(channelMasterId: string) {
  return (Number(channelMasterId) - 1) ? 'B 服' : '官服'
}

function formatPrivacyName(nickName: string) {
  const [name, number] = nickName.split('#')
  if (name.length <= 2)
    return nickName

  const firstChar = name[0]
  const lastChar = name[name.length - 1]
  const stars = '*'.repeat(name.length - 2)

  return `${firstChar}${stars}${lastChar}#${number}`
}

async function cleanOutdatedData() {
  const { storage } = useContext()
  const allKeys = await storage.getKeys()

  const keysWithDate = allKeys.map((key) => {
    const [date] = key.split(':')

    return { date: new TZDate(date, 'Asia/Shanghai'), key }
  })

  const keysToRemove = keysWithDate.filter(({ date }) => {
    const sevenDaysAgo = sub(new TZDate().withTimeZone('Asia/Shanghai'), { days: 7 })
    return date < sevenDaysAgo
  })

  if (keysToRemove.length === 0) {
    return
  }

  console.log('\n开始清理过期数据')

  await Promise.all(keysToRemove.map(i => storage.removeItem(i.key)))
}

// 错误处理函数
async function handleAttendanceError(error: any, character: BindingUserItem, storage: Storage, key: string) {
  if (error.response?.status === 403) {
    console.log(`${formatCharacterName(character)}今天已经签到过了`)
    await storage.setItem(key, true)
    return true
  }

  console.error(`签到过程中出现错误: ${error.message}`)
  if (error.response?.data) {
    console.error('错误详情:', JSON.stringify(error.response.data, null, 2))
  }
  return false
}

// 签到单个角色
async function attendSingleCharacter(character: BindingUserItem, cred: string, signToken: string) {
  const { config, storage, today } = useContext()
  const key = `${config.ATTENDANCE_STORAGE_PREFIX}${format(today, 'yyyy-MM-dd')}:${character.uid}`
  const isAttended = await storage.getItem(key)

  if (isAttended) {
    console.log(`${formatCharacterName(character)}今天已经签到过了`)
    return true
  }

  return retry(async () => {
    try {
      const data = await attendance(cred, signToken, {
        uid: character.uid,
        gameId: character.channelMasterId,
      })

      if (!data) {
        console.log(`${formatCharacterName(character)}今天已经签到过了`)
        await storage.setItem(key, true)
        return true
      }

      if (data.code === 0 && data.message === 'OK') {
        const awards = data.data.awards.map(a => `「${a.resource.name}」${a.count}个`).join(',')
        const msg = `${formatCharacterName(character)}签到成功${awards ? `, 获得了${awards}` : ''}`
        console.log(msg)
        await storage.setItem(key, true)
        return true
      }

      const msg = `${formatCharacterName(character)}签到失败, 错误消息: ${data.message}`
      console.error(msg)
      console.error('详细错误信息:', JSON.stringify(data, null, 2))
      return false
    }
    catch (error: any) {
      return handleAttendanceError(error, character, storage, key)
    }
  })
}

async function authorizeSklandAccount(token: string) {
  const { code } = await auth(token)
  const { cred, token: signToken, userId } = await signIn(code)

  return { cred, signToken, userId }
}

async function getArknightsCharacterList(cred: string, signToken: string) {
  const { list } = await getBinding(cred, signToken)
  return list.filter(i => i.appCode === 'arknights').map(i => i.bindingList).flat()
}

async function checkUserBindingsAllAttended(userId: string) {
  const { config, storage, today } = useContext()
  const bindings = await storage.getItem<string[]>(`${config.BINDINGS_STORAGE_PREFIX}${userId}`)

  if (!bindings) {
    return false
  }
  const date = format(today, 'yyyy-MM-dd')

  for (const binding of bindings) {
    const key = `${config.ATTENDANCE_STORAGE_PREFIX}${date}:${binding}`
    const isAttended = await storage.getItem(key)
    if (!isAttended) {
      return false
    }
  }

  return true
}

/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your Worker in action
 * - Run `npm run deploy` to publish your Worker
 *
 * Bind resources to your Worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch() {
    const module = WebAssembly.validate
    console.log(module)
    return new Response(`Running in ${navigator.userAgent}!`)
  },
  async scheduled(_event, env, _ctx): Promise<void> {
    if (!env.SKLAND_TOKEN) {
      throw new Error('SKLAND_TOKEN 未设置')
    }

    const config = defu({}, DEFULAT_CONFIG, pick(env, Object.keys(DEFULAT_CONFIG) as (keyof typeof DEFULAT_CONFIG)[]))

    const storage = createStorage({
      driver: cloudflareKVBindingDriver({ binding: env.SKLAND_DAILY_ATTENDANCE_STORAGE }),
    })

    context.set({
      config,
      storage,
      today: new TZDate().withTimeZone('Asia/Shanghai'),
    })

    const tokens = env.SKLAND_TOKEN.split(',')
    console.log(`开始执行签到任务，共 ${tokens.length} 个账号`)

    for (const [index, token] of tokens.entries()) {
      console.log(`\n开始处理第 ${index + 1}/${tokens.length} 个账号`)

      try {
        const { cred, signToken, userId } = await retry(() => authorizeSklandAccount(token))

        if (await checkUserBindingsAllAttended(userId)) {
          console.log(`账号 ${index + 1} 的所有角色已经签到完成，跳过`)
          continue
        }

        const characterList = await retry(() => getArknightsCharacterList(cred, signToken))
        await storage.setItem(
          `${config.BINDINGS_STORAGE_PREFIX}${userId}`,
          characterList.map(i => i.uid.toString())
        )

        console.log(`账号 ${index + 1} 共有 ${characterList.length} 个角色需要签到`)

        // 使用 chunk 控制并发
        const chunks = []
        for (let i = 0; i < characterList.length; i += config.CONCURRENT_LIMIT) {
          chunks.push(characterList.slice(i, i + config.CONCURRENT_LIMIT))
        }

        for (const [chunkIndex, chunk] of chunks.entries()) {
          if (chunks.length > 1) {
            console.log(`处理第 ${chunkIndex + 1}/${chunks.length} 批角色`)
          }

          await Promise.all(chunk.map(character =>
            attendSingleCharacter(character, cred, signToken),
          ))

          if (chunkIndex < chunks.length - 1) {
            console.log(`等待 ${config.CHUNK_DELAY}ms 后处理下一批角色`)
            await new Promise(resolve => setTimeout(resolve, config.CHUNK_DELAY))
          }
        }
      }
      catch (error) {
        console.error(`处理账号 ${index + 1} 时发生错误:`, error instanceof Error ? error.message : error)
        continue
      }
    }

    await cleanOutdatedData()
    context.unset()
    console.log('签到任务完成')
  },
} satisfies ExportedHandler<Env>
