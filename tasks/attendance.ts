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
  gameName: string
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
    messageCollector.notify(`\n--- 账号 ${accountNumber}/${totalAccounts} ---`)
    messageCollector.info(`今天已经签到过，跳过`)
    stats.accounts.skipped++
    return { accountHasError: false, charactersCount: 0 }
  }

  messageCollector.notify(`\n--- 账号 ${accountNumber}/${totalAccounts} ---`)
  messageCollector.info(`开始处理...`)

  const client = createClient()
  const { code } = await client.collections.hypergryph.grantAuthorizeCode(token)
  await client.signIn(code)

  const { list } = await client.collections.player.getBinding()
  // Build character list with game information preserved
  const characterList = list
    .filter(i => ATTENDANCE_AVAILABLE_APPCODE.includes(i.appCode))
    .flatMap(i => i.bindingList)

  let accountHasError = false
  let hasNewAttendance = false
  for (const character of characterList) {
    // Initialize game stats if not exists
    if (!stats.charactersByGame.has(character.gameId)) {
      stats.charactersByGame.set(character.gameId, {
        gameName: character.gameName,
        total: 0,
        succeeded: 0,
        alreadyAttended: 0,
        failed: 0,
      })
    }

    const gameStats = stats.charactersByGame.get(character.gameId)!
    gameStats.total++

    const result = await attendCharacter(
      client,
      character,
      maxRetries,
      character.gameName,
      retriesLeft => messageCollector.log(`操作失败，剩余重试次数: ${retriesLeft}`),
    )

    // Collect message to notification
    if (result.hasError) {
      messageCollector.infoError(result.message)
      gameStats.failed++
      accountHasError = true
    }
    else {
      messageCollector.info(result.message)
      if (result.success) {
        gameStats.succeeded++
        hasNewAttendance = true
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
    if (hasNewAttendance) {
      stats.accounts.successful++
    }
    else {
      // All characters were already attended at API level
      stats.accounts.skipped++
    }
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
    const barkTokens = getSplitByComma(config.barkToken)

    const messageCollector = createMessageCollector({
      notificationUrls,
      barkTokens,
    })

    if (tokens.length === 0) {
      messageCollector.log('未配置任何账号，跳过签到任务')
      return { result: 'success' }
    }

    const storage = useStorage()

    messageCollector.notify('## 森空岛每日签到')

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
          messageCollector.notify(`\n--- 账号 ${accountNumber}/${tokens.length} ---`)
          messageCollector.infoError(`处理失败: ${errorMessage}`)
          hasFailed = true
          stats.accounts.failed++
          stats.accounts.failedIndexes.push(accountNumber)
        }
      }
    })

    // Output execution summary
    messageCollector.notify(`\n========== 执行摘要 ==========`)
    messageCollector.notify(`账号统计:`)
    messageCollector.notify(`  • 总数: ${stats.accounts.total}`)
    messageCollector.notify(`  • 成功: ${stats.accounts.successful}`)
    messageCollector.notify(`  • 跳过: ${stats.accounts.skipped}`)
    if (stats.accounts.failed > 0) {
      messageCollector.notifyError(`  • 失败: ${stats.accounts.failed} (账号 #${stats.accounts.failedIndexes.join(', #')})`)
    }

    // Output game-specific statistics
    if (stats.charactersByGame.size > 0) {
      for (const gameStats of stats.charactersByGame.values()) {
        messageCollector.notify(`\n【${gameStats.gameName}】角色统计:`)
        messageCollector.notify(`  • 总数: ${gameStats.total}`)
        messageCollector.notify(`  • 本次签到成功: ${gameStats.succeeded}`)
        messageCollector.notify(`  • 今天已签到: ${gameStats.alreadyAttended}`)
        if (gameStats.failed > 0) {
          messageCollector.notifyError(`  • 签到失败: ${gameStats.failed}`)
        }
      }
    }

    // Determine execution result for Bark subtitle
    if (stats.accounts.failed > 0) {
      messageCollector.setResult('failed')
    }
    else if (stats.accounts.successful > 0) {
      messageCollector.setResult('success')
    }
    else {
      messageCollector.setResult('skipped')
    }

    // Push notifications:
    // - Regular notifications: only on success/fail
    // - Bark notifications: also on skipped (repeated attendance)
    const hasResult = stats.accounts.successful > 0 || stats.accounts.failed > 0
    const isRepeated = !hasResult && barkTokens.length > 0 && stats.accounts.skipped > 0
    if (hasResult || isRepeated)
      await messageCollector.push()

    return { result: hasFailed ? 'failed' : 'success' }
  },
})
