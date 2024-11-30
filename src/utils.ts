import { createHash, createHmac } from 'node:crypto'
import type { FetchContext } from 'ofetch'
import { stringifyQuery } from 'ufo'
import { get_d_id } from './did'

export const command_header = {
  'User-Agent': 'Skland/1.21.0 (com.hypergryph.skland; build:102100065; iOS 17.6.0; ) Alamofire/5.7.1',
  'Accept-Encoding': 'gzip',
  'Connection': 'close',
  'Content-Type': 'application/json',
}

export const sign_header = {
  platform: '2',
  timestamp: '',
  dId: '',
  vName: '1.21.0',
}

const MILLISECOND_PER_SECOND = 1000

export function getPrivacyName(name: string) {
  return name.split('')
    .map((s, i) => (i > 0 && i < name.length - 1) ? '*' : s)
    .join('')
}

export function getRequestURL(request: RequestInfo, baseURL?: string) {
  const url = typeof request === 'string' ? request : request.url
  if (URL.canParse(url))
    return new URL(url)
  return new URL(url, baseURL)
}

const WHITE_LIST = ['/web/v1/user/auth/generate_cred_by_code']

export function onSignatureRequest(ctx: FetchContext) {
  const { pathname } = getRequestURL(ctx.request, ctx.options.baseURL)

  if (WHITE_LIST.includes(pathname))
    return
  const headers = new Headers(ctx.options.headers)

  const token = headers.get('token')
  if (!token)
    throw new Error('token 不存在')

  const query = ctx.options.query ? stringifyQuery(ctx.options.query) : ''
  const timestamp = (Date.now() - 2 * MILLISECOND_PER_SECOND).toString().slice(0, -3)
  const signatureHeaders = {
    platform: '1',
    timestamp,
    dId: '',
    vName: '1.21.0',
  }
  const str = `${pathname}${query}${ctx.options.body ? JSON.stringify(ctx.options.body) : ''}${timestamp}${JSON.stringify(signatureHeaders)}`

  const hmacSha256ed = createHmac('sha256', token)
    .update(str, 'utf-8')
    .digest('hex')

  const sign = createHash('md5')
    .update(hmacSha256ed)
    .digest('hex')

  Object.entries(signatureHeaders).forEach(([key, value]) => {
    headers.append(key, value)
  })
  headers.append('sign', sign)
  headers.delete('token')

  ctx.options.headers = headers
}

export function createDeviceId() {
  return get_d_id()
}
