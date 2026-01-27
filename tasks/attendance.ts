import type { Storage } from 'unstorage'
import type { MessageCollector } from '~/utils/index'
import { AsyncLocalStorage } from 'node:async_hooks'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import { createClient } from 'skland-kit'
import { createContext } from 'unctx'
import { attendCharacter, createMessageCollector, generateAttendanceKey, getSplitByComma } from '~/utils/index'

interface GameStats {
  total: number
  succeeded: number // 本次签到成功
  alreadyAttended: number // 今天已签到
  failed: number // 签到失败
}

interface ExecutionStats {
  accounts: {
    total: number
    successful: number // 所有角色都成功的账号
    skipped: number // 今天已签到的账号
    failed: number // 有失败的账号
    failedIndexes: number[]
  }
  charactersByGame: Map<number, GameStats> // key: gameId
}

interface ProcessAccountResult {
  accountHasError: boolean
  charactersCount: number
}

interface AttendanceContext {
  stats: ExecutionStats
  messageCollector: MessageCollector
  storage: Storage
  maxRetries: number
  totalAccounts: number
}

// Create attendance context instance
const attendanceContext = createContext<AttendanceContext>({
  asyncContext: true,
  AsyncLocalStorage,
})

// Export composable function for accessing context
const useAttendanceContext = attendanceContext.use

const ATTENDANCE_AVAILABLE_APPCODE = ['arknights', 'endfield']

async function processAccount(
  token: string,
  accountNumber: number,
): Promise<ProcessAccountResult> {
  // Get all dependencies from context
  const { stats, messageCollector, storage, maxRetries, totalAccounts } = useAttendanceContext()
  // Check if already attended today
  const attendanceKey = await generateAttendanceKey(token)
  const hasAttended = await storage.getItem(attendanceKey)

  if (hasAttended) {
    messageCollector.collect(`\n--- 账号 ${accountNumber}/${totalAccounts} ---`)
    messageCollector.collect(`今天已经签到过，跳过`, { output: true })
    stats.accounts.skipped++
    return { accountHasError: false, charactersCount: 0 }
  }

  messageCollector.collect(`\n--- 账号 ${accountNumber}/${totalAccounts} ---`)
  messageCollector.collect(`开始处理...`, { output: true })

  const client = createClient()
  const { code } = await client.collections.hypergryph.grantAuthorizeCode(token)
  await client.signIn(code)

  const { list } = await client.collections.player.getBinding()
  // Build character list with game information preserved
  const characterList = list
    .filter(i => ATTENDANCE_AVAILABLE_APPCODE.includes(i.appCode))
    .flatMap(i => i.bindingList)

  let accountHasError = false
  for (const character of characterList) {
    // Initialize game stats if not exists
    if (!stats.charactersByGame.has(character.gameId)) {
      stats.charactersByGame.set(character.gameId, {
        total: 0,
        succeeded: 0,
        alreadyAttended: 0,
        failed: 0,
      })
    }

    const gameStats = stats.charactersByGame.get(character.gameId)!
    gameStats.total++

    const result = await attendCharacter(client, character, maxRetries, character.gameName)

    // Collect message to notification
    if (result.hasError) {
      messageCollector.collect(result.message, { output: true, isError: true })
      gameStats.failed++
      accountHasError = true
    }
    else {
      messageCollector.collect(result.message, { output: true })
      if (result.success) {
        gameStats.succeeded++
      }
      else {
        // Already attended today
        gameStats.alreadyAttended++
      }
    }
  }

  // Save attendance status only if all characters succeeded
  if (!accountHasError) {
    await storage.setItem(attendanceKey, true)
    stats.accounts.successful++
  }
  else {
    stats.accounts.failed++
    stats.accounts.failedIndexes.push(accountNumber)
  }

  return { accountHasError, charactersCount: characterList.length }
}

export default defineTask<'success' | 'failed'>({
  meta: {
    name: 'attendance',
    description: '每日签到',
  },
  async run() {
    const config = useRuntimeConfig()

    const tokens = getSplitByComma(config.tokens)

    const notificationUrls = getSplitByComma(config.notificationUrls)

    const messageCollector = createMessageCollector({
      notificationUrls,
    })

    if (tokens.length === 0) {
      messageCollector.log('未配置任何账号，跳过签到任务')
      return { result: 'success' }
    }

    const storage = useStorage()

    messageCollector.collect('## 森空岛每日签到')

    const maxRetries = Number(config.maxRetries)

    // Initialize statistics
    const stats: ExecutionStats = {
      accounts: {
        total: tokens.length,
        successful: 0,
        skipped: 0,
        failed: 0,
        failedIndexes: [],
      },
      charactersByGame: new Map(),
    }

    let hasFailed = false

    const ctx = {
      stats,
      messageCollector,
      storage,
      maxRetries,
      totalAccounts: tokens.length,
    }

    // Create context scope for async operations
    await attendanceContext.call(ctx, async () => {
      // Process each account within the context
      for (const [index, token] of tokens.entries()) {
        const accountNumber = index + 1

        try {
          const result = await processAccount(token, accountNumber)

          if (result.accountHasError) {
            hasFailed = true
          }
        }
        catch (error) {
          const { stats, messageCollector } = useAttendanceContext()
          const errorMessage = error instanceof Error ? error.message : String(error)
          messageCollector.collect(`\n--- 账号 ${accountNumber}/${tokens.length} ---`)
          messageCollector.collect(`处理失败: ${errorMessage}`, { output: true, isError: true })
          hasFailed = true
          stats.accounts.failed++
          stats.accounts.failedIndexes.push(accountNumber)
        }
      }
    })

    // Output execution summary
    messageCollector.collect(`\n========== 执行摘要 ==========`)
    messageCollector.collect(`账号统计:`)
    messageCollector.collect(`  • 总数: ${stats.accounts.total}`)
    messageCollector.collect(`  • 成功: ${stats.accounts.successful}`)
    messageCollector.collect(`  • 跳过: ${stats.accounts.skipped}`)
    if (stats.accounts.failed > 0) {
      messageCollector.collect(`  • 失败: ${stats.accounts.failed} (账号 #${stats.accounts.failedIndexes.join(', #')})`, { isError: true })
    }

    // Output game-specific statistics
    if (stats.charactersByGame.size > 0) {
      const sortedGames = Array.from(stats.charactersByGame.entries()).sort((a, b) => a[0] - b[0])
      for (const [appName, gameStats] of sortedGames) {
        messageCollector.collect(`\n【${appName}】角色统计:`)
        messageCollector.collect(`  • 总数: ${gameStats.total}`)
        messageCollector.collect(`  • 本次签到成功: ${gameStats.succeeded}`)
        messageCollector.collect(`  • 今天已签到: ${gameStats.alreadyAttended}`)
        if (gameStats.failed > 0) {
          messageCollector.collect(`  • 签到失败: ${gameStats.failed}`, { isError: true })
        }
      }
    }

    if (stats.accounts.successful > 0 || stats.accounts.failed > 0)
      await messageCollector.push()

    return { result: hasFailed ? 'failed' : 'success' }
  },
})
