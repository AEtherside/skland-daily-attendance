import type { AttendanceResponse, BindingResponse, CredResponse, GetAttendanceResponse } from '../types'
import { createFetch } from 'ofetch'
import { command_header, getDid, onSignatureRequest } from '../utils'

const fetch = createFetch({
  defaults: {
    baseURL: 'https://zonai.skland.com',
    onRequest: onSignatureRequest,
  },
})

/**
 * grant_code 获得森空岛用户的 token 等信息
 * @param grant_code 从 OAuth 接口获取的 grant_code
 */
export async function signIn(grant_code: string) {
  const data = await fetch<CredResponse>(
    '/web/v1/user/auth/generate_cred_by_code',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'referer': 'https://www.skland.com/',
        'origin': 'https://www.skland.com',
        'dId': await getDid(),
        'platform': '3',
        'timestamp': `${Math.floor(Date.now() / 1000)}`,
        'vName': '1.0.0',
      },
      body: {
        code: grant_code,
        kind: 1,
      },
      onRequestError(ctx) {
        throw new Error(`登录获取 cred 错误:${ctx.error.message}`)
      },
    },
  )

  return data.data
}
/**
 * 通过登录凭证和森空岛用户的 token 获取角色绑定列表
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function getBinding(cred: string, token: string) {
  const data = await fetch<BindingResponse>(
    '/api/v1/game/player/binding',
    {
      headers: { token, cred },
      onRequestError(ctx) {
        throw new Error(`获取绑定角色错误:${ctx.error.message}`)
      },
    },
  )

  return data.data
}

/**
 * 明日方舟每日签到
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function attendance(cred: string, token: string, body: { uid: string, gameId: string }) {
  const record = await fetch<GetAttendanceResponse>(
    '/api/v1/game/attendance',
    {
      headers: Object.assign({ token, cred }, command_header),
      query: body,
    },
  )

  const todayAttended = record.data.records.find((i) => {
    const today = new Date().setHours(0, 0, 0, 0)
    return new Date(Number(i.ts) * 1000).setHours(0, 0, 0, 0) === today
  })
  if (todayAttended) {
    // 今天已经签到过了
    return false
  }
  else {
    const data = await fetch<AttendanceResponse>(
      '/api/v1/game/attendance',
      {
        method: 'POST',
        headers: Object.assign({ token, cred }, command_header),
        body,
      },
    )
    return data
  }
}
