import type { AuthResponse } from '../types'
import { ofetch } from 'ofetch'
import { SKLAND_AUTH_URL } from '../constant'
import { command_header } from '../utils'

/**
 * 通过 OAuth 登录凭证获取 grant_code
 * @param token 鹰角网络通行证账号的登录凭证
 */
export async function auth(token: string) {
  const data = await ofetch<AuthResponse>(SKLAND_AUTH_URL, {
    method: 'POST',
    headers: command_header,
    body: JSON.stringify({
      appCode: '4ca99fa6b56cc2ba',
      token,
      type: 0,
    }),
  })

  if (data.status !== 0 || !data.data)
    throw new Error(`登录获取 cred 错误:${data.msg}`)

  return data.data
}
