import type { FetchContext } from 'ofetch'
import { webcrypto } from 'node:crypto'
import { format } from 'date-fns'
import { stringifyQuery } from 'ufo'
import { BROWSER_ENV, DES_RULE, SKLAND_SM_CONFIG } from './constant'
import { encryptAES, encryptObjectByDESRules, encryptRSA, hmacSha256, md5 } from './crypto'

const crypto = webcrypto

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

export async function onSignatureRequest(ctx: FetchContext) {
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

  const hmacSha256ed = await hmacSha256(token, str)

  const sign = await md5(hmacSha256ed)

  Object.entries(signatureHeaders).forEach(([key, value]) => {
    headers.append(key, value)
  })
  headers.append('sign', sign)
  headers.delete('token')

  ctx.options.headers = headers
}

const stringify = (obj: any) => JSON.stringify(obj).replace(/":"/g, '": "').replace(/","/g, '", "')

export async function gzipObject(o: object) {
  // 将对象转换为字节数组
  const encoded = new TextEncoder().encode(stringify(o))

  // 使用 CompressionStream 进行 gzip 压缩
  const compressed = await new Response(
    new Blob([encoded]).stream().pipeThrough<Uint8Array>(new CompressionStream('gzip')),
  ).arrayBuffer()

  // 转换为 Uint8Array 并设置 Python gzip OS FLG
  const compressedArray = new Uint8Array(compressed)
  compressedArray[9] = 19 // Python gzip OS FLG = Unknown

  // 转换为 base64
  return btoa(String.fromCharCode(...compressedArray))
}

export async function getSmId() {
  const now = new Date()
  const _time = format(now, 'yyyyMMddHHmmss')

  // 生成UUID v4
  const uid = crypto.randomUUID()

  // MD5加密uid
  const uidMd5 = md5(uid)

  const v = `${_time + uidMd5}00`

  // 计算smsk_web
  const smsk_web = (await md5(`smsk_web_${v}`)).substring(0, 14)

  return `${v + smsk_web}0`
}

export function getTn(o: Record<string, any>) {
  // 获取并排序对象的所有键
  const sortedKeys: string[] = Object.keys(o).sort()

  // 用于存储处理后的值
  const resultList: string[] = []

  // 遍历排序后的键
  for (const key of sortedKeys) {
    let v: any = o[key]

    // 处理数字类型
    if (typeof v === 'number')
      v = String(v * 10000)

    // 处理对象类型（递归）
    else if (typeof v === 'object' && v !== null)
      v = getTn(v)

    resultList.push(v)
  }

  // 将所有结果连接成字符串
  return resultList.join('')
}

const SM_CONFIG = SKLAND_SM_CONFIG
const devices_info_url = `${SKLAND_SM_CONFIG.protocol}://${SKLAND_SM_CONFIG.apiHost}${SKLAND_SM_CONFIG.apiPath}`

export async function getDid() {
  // 生成 UUID 并计算 priId
  const uid = crypto.randomUUID()
  const priId = (await md5(uid)).substring(0, 16)

  const ep = await encryptRSA(uid, SM_CONFIG.publicKey)

  // 准备浏览器环境数据
  const browser = {
    ...BROWSER_ENV,
    vpw: crypto.randomUUID(),
    svm: Date.now(),
    trees: crypto.randomUUID(),
    pmf: Date.now(),
  }

  // 准备加密目标数据
  const desTarget: Record<string, string | number> = {
    ...browser,
    protocol: 102,
    organization: SM_CONFIG.organization,
    appId: SM_CONFIG.appId,
    os: 'web',
    version: '3.0.0',
    sdkver: '3.0.0',
    box: '', // 首次请求为空
    rtype: 'all',
    smid: await getSmId(),
    subVersion: '1.0.0',
    time: 0,
  }

  // 计算并添加 tn
  desTarget.tn = await md5(getTn(desTarget))

  // DES 加密
  const desResult = await encryptObjectByDESRules(desTarget, DES_RULE)

  // GZIP 压缩
  const gzipResult = await gzipObject(desResult)

  // AES 加密
  const aesResult = await encryptAES(gzipResult, priId)

  const body = {
    appId: 'default',
    compress: 2,
    data: aesResult,
    encode: 5,
    ep,
    organization: SM_CONFIG.organization,
    os: 'web',
  }

  // 发送请求
  const response = await fetch(devices_info_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const resp = await response.json()
  if (resp.code !== 1100) {
    console.log(resp)
    throw new Error('did计算失败，请联系作者')
  }

  return `B${resp.detail.deviceId}`
}
