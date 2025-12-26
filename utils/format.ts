import type { AppBindingPlayer } from 'skland-kit'

export function formatCharacterName(character: AppBindingPlayer) {
  return `${formatChannelName(character.channelMasterId)}角色${formatPrivacyName(character.nickName)}`
}

export function formatChannelName(channelMasterId: string): string {
  return Number(channelMasterId) - 1 ? 'B 服' : '官服'
}

export function formatPrivacyName(nickName: string) {
  const [name, number] = nickName.split('#')
  if (!name)
    throw new Error('Unexpected Error: nickName is not valid')

  if (name.length <= 2)
    return nickName

  const firstChar = name[0]
  const lastChar = name[name.length - 1]
  const stars = '*'.repeat(name.length - 2)

  return `${firstChar}${stars}${lastChar}#${number}`
}
