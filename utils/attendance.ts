import type { AppBindingPlayer, ArknightsAttendanceStatus, Client, EndfieldAttendanceStatus } from 'skland-kit'
import { formatCharacterName } from './format'
import { retry } from './retry'

export function isTodayAttended(attendanceStatus: ArknightsAttendanceStatus): boolean
export function isTodayAttended(attendanceStatus: EndfieldAttendanceStatus): boolean
export function isTodayAttended(attendanceStatus: ArknightsAttendanceStatus | EndfieldAttendanceStatus): boolean {
  const today = new Date().setHours(0, 0, 0, 0)
  if ('records' in attendanceStatus) {
    return attendanceStatus.records.some((record) => {
      return new Date(Number(record.ts) * 1000).setHours(0, 0, 0, 0) === today
    })
  }
  else {
    return attendanceStatus.hasToday
  }
}

export interface AttendanceResult {
  success: boolean
  message: string
  hasError: boolean
}

async function attendance(client: Client, character: AppBindingPlayer, appName?: string): Promise<AttendanceResult> {
  const characterLabel = formatCharacterName(character, appName)
  if (character.gameId === 3) {
    if (!character.defaultRole) {
      return {
        success: false,
        message: `${characterLabel} 没有角色，跳过签到`,
        hasError: false,
      }
    }
    const query = {
      gameId: character.gameId,
      serverId: character.defaultRole.serverId,
      roleId: character.defaultRole.roleId,
    }
    const attendanceStatus = await client.collections.game.getAttendanceStatus(query)
    if (isTodayAttended(attendanceStatus)) {
      return {
        success: false,
        message: `${characterLabel} 今天已经签到过了`,
        hasError: false,
      }
    }
    const data = await client.collections.game.attendance(query)
    const awards = data.awardIds.map(a => {
      const awardId = a.id
      const award = data.resourceInfoMap[awardId]
      if (!award) {
        return `「未知奖励」1 个`
      }
      return `「${award.name}」1个`
    }).join(',')
    return {
      success: true,
      message: `${characterLabel} 签到成功，获得了${awards}`,
      hasError: false,
    }
  }
  else {
    const query = {
      uid: character.uid,
      gameId: character.gameId,
    }

    const attendanceStatus = await client.collections.game.getAttendanceStatus(query)

    if (isTodayAttended(attendanceStatus)) {
      return {
        success: false,
        message: `${characterLabel} 今天已经签到过了`,
        hasError: false,
      }
    }

    const data = await client.collections.game.attendance(query)
    const awards = data.awards.map(a => `「${a.resource.name}」${a.count}个`).join(',')

    return {
      success: true,
      message: `${characterLabel} 签到成功，获得了${awards}`,
      hasError: false,
    }
  }
}

export async function attendCharacter(client: Client, character: AppBindingPlayer, maxRetries: number, appName?: string): Promise<AttendanceResult> {
  try {
    return await retry(async () => {
      return await attendance(client, character, appName)
    }, maxRetries)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const characterLabel = formatCharacterName(character, appName)
    return {
      success: false,
      message: `${characterLabel} 签到过程中出现未知错误: ${errorMessage}`,
      hasError: true,
    }
  }
}
