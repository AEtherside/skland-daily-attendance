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
  return `${gamePrefix}${character.channelName}角色${formatPrivacyName(character)}`
}

export function formatPrivacyName(character: AppBindingPlayer) {
  // 终末地的昵称在 defaultRole 里取
  if (character.gameId === 3 && character.defaultRole)
    return `${maskNickname(character.defaultRole.nickname)} lv.${character.defaultRole.level}`

  const nickName = character.nickName
  const [name, number] = nickName.split('#')
  if (!name)
    throw new Error('Unexpected Error: 明日方舟 nickName 格式不正确')

  return `${maskNickname(name)}#${number}`
}

function maskNickname(name: string) {
  if (name.length <= 1)
    return "*"

  const firstChar = name[0]
  const stars = '*'.repeat(name.length - 1)
  return `${firstChar}${stars}`
}
