import type { AppBindingPlayer } from 'skland-kit'

/**
 * Format game name from appCode
 */
export function formatGameName(appCode: string): string {
  const gameNameMap: Record<string, string> = {
    arknights: '明日方舟',
    endfield: '终末地',
  }
  return gameNameMap[appCode] || appCode
}

export function formatCharacterName(character: AppBindingPlayer, appName?: string) {
  const gamePrefix = appName ? `【${appName}】` : ''
  return `${gamePrefix}${formatChannelName(character.channelMasterId)}角色${formatPrivacyName(character.nickName)}`
}

export function formatChannelName(channelMasterId: string): string {
  return Number(channelMasterId) - 1 ? 'B 服' : '官服'
}

export function formatPrivacyName(nickName: string) {
  const [name, number] = nickName.split('#')
  if (!name)
    throw new Error('Unexpected Error: nickName is not valid')

  if (name.length <= 1)
    return nickName

  const firstChar = name[0]
  const stars = '*'.repeat(name.length - 1)

  return `${firstChar}${stars}#${number}`
}
