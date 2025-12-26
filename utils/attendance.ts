import type { AppBindingPlayer, AttendanceStatus, Client } from 'skland-kit'
import { formatCharacterName } from './format'
import { retry } from './retry'

export function isTodayAttended(attendanceStatus: AttendanceStatus): boolean {
  const today = new Date().setHours(0, 0, 0, 0)
  return attendanceStatus.records.some((record) => {
    return new Date(Number(record.ts) * 1000).setHours(0, 0, 0, 0) === today
  })
}

export interface AttendanceResult {
  success: boolean
  message: string
  hasError: boolean
}

async function attendance(client: Client, character: AppBindingPlayer): Promise<AttendanceResult> {
  const characterLabel = formatCharacterName(character)
  const query = {
    uid: character.uid,
    gameId: character.channelMasterId,
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

export async function attendCharacter(client: Client, character: AppBindingPlayer, maxRetries: number): Promise<AttendanceResult> {
  try {
    return await retry(async () => {
      return await attendance(client, character)
    }, maxRetries)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const characterLabel = formatCharacterName(character)
    return {
      success: false,
      message: `${characterLabel} 签到过程中出现未知错误: ${errorMessage}`,
      hasError: true,
    }
  }
}
