import pako from 'pako'
import CryptoJS from 'crypto-js'
import forge from 'node-forge'

// DES_RULE 的类型定义
interface DESRule {
  cipher?: string
  is_encrypt: number
  key?: string
  obfuscated_name: string
}

const devices_info_url = 'https://fp-it.portal101.cn/deviceprofile/v4'

export const SM_CONFIG = {
  organization: 'UWXspnCCJN4sfYlNfqps',
  appId: 'default',
  publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmxMNr7n8ZeT0tE1R9j/mPixoinPkeM+k4VGIn/s0k7N5rJAfnZ0eMER+QhwFvshzo0LNmeUkpR8uIlU/GEVr8mN28sKmwd2gpygqj0ePnBmOW4v0ZVwbSYK+izkhVFk2V/doLoMbWy6b+UnA8mkjvg0iYWRByfRsK2gdl7llqCwIDAQAB',
  protocol: 'https',
  apiHost: 'fp-it.portal101.cn',
}

const DES_RULE: Record<string, DESRule> = {
  appId: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'uy7mzc4h',
    obfuscated_name: 'xx',
  },
  box: {
    is_encrypt: 0,
    obfuscated_name: 'jf',
  },
  canvas: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'snrn887t',
    obfuscated_name: 'yk',
  },
  clientSize: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'cpmjjgsu',
    obfuscated_name: 'zx',
  },
  organization: {
    cipher: 'DES',
    is_encrypt: 1,
    key: '78moqjfc',
    obfuscated_name: 'dp',
  },
  os: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'je6vk6t4',
    obfuscated_name: 'pj',
  },
  platform: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'pakxhcd2',
    obfuscated_name: 'gm',
  },
  plugins: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'v51m3pzl',
    obfuscated_name: 'kq',
  },
  pmf: {
    cipher: 'DES',
    is_encrypt: 1,
    key: '2mdeslu3',
    obfuscated_name: 'vw',
  },
  protocol: {
    is_encrypt: 0,
    obfuscated_name: 'protocol',
  },
  referer: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'y7bmrjlc',
    obfuscated_name: 'ab',
  },
  res: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'whxqm2a7',
    obfuscated_name: 'hf',
  },
  rtype: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'x8o2h2bl',
    obfuscated_name: 'lo',
  },
  sdkver: {
    cipher: 'DES',
    is_encrypt: 1,
    key: '9q3dcxp2',
    obfuscated_name: 'sc',
  },
  status: {
    cipher: 'DES',
    is_encrypt: 1,
    key: '2jbrxxw4',
    obfuscated_name: 'an',
  },
  subVersion: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'eo3i2puh',
    obfuscated_name: 'ns',
  },
  svm: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'fzj3kaeh',
    obfuscated_name: 'qr',
  },
  time: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'q2t3odsk',
    obfuscated_name: 'nb',
  },
  timezone: {
    cipher: 'DES',
    is_encrypt: 1,
    key: '1uv05lj5',
    obfuscated_name: 'as',
  },
  tn: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'x9nzj1bp',
    obfuscated_name: 'py',
  },
  trees: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'acfs0xo4',
    obfuscated_name: 'pi',
  },
  ua: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'k92crp1t',
    obfuscated_name: 'bj',
  },
  url: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'y95hjkoo',
    obfuscated_name: 'cf',
  },
  version: {
    is_encrypt: 0,
    obfuscated_name: 'version',
  },
  vpw: {
    cipher: 'DES',
    is_encrypt: 1,
    key: 'r9924ab5',
    obfuscated_name: 'ca',
  },
}

export const BROWSER_ENV = {
  plugins: 'MicrosoftEdgePDFPluginPortableDocumentFormatinternal-pdf-viewer1,MicrosoftEdgePDFViewermhjfbmdgcfjbbpaeojofohoefgiehjai1',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  canvas: '259ffe69', // 基于浏览器的canvas获得的值，不知道复用行不行
  timezone: -480, // 时区，应该是固定值吧
  platform: 'Win32',
  url: 'https://www.skland.com/', // 固定值
  referer: '',
  res: '1920_1080_24_1.25', // 屏幕宽度_高度_色深_window.devicePixelRatio
  clientSize: '0_0_1080_1920_1920_1080_1920_1080',
  status: '0011', // 不知道在干啥
}

function padData(data: string): string {
  const blockSize = 8
  const padLength = blockSize - (data.length % blockSize)
  return data + '\0'.repeat(padLength)
}

export async function _DES(o: Record<string, any>): Promise<Record<string, any>> {
  const result: Record<string, any> = {}

  for (const i in o) {
    if (i in DES_RULE) {
      const rule = DES_RULE[i]
      let res = o[i]

      if (rule.is_encrypt === 1) {
        // 将输入转换为字符串
        const inputStr = padData(String(res))

        // 创建 key
        const keyWordArray = CryptoJS.enc.Utf8.parse(rule.key!)

        // 创建输入数据
        const dataWordArray = CryptoJS.enc.Utf8.parse(inputStr)

        // 使用 TripleDES 加密 (ECB 模式)
        const encrypted = CryptoJS.TripleDES.encrypt(dataWordArray, keyWordArray, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.NoPadding,
        })

        // 转换为 base64
        res = encrypted.toString()
      }
      result[rule.obfuscated_name] = res || ''
    }
    else {
      result[i] = o[i]
    }
  }
  return result
}

export async function _AES(v: string, k: string): Promise<string> {
  const iv = '0102030405060708'

  // 确保输入数据是 WordArray 类型并进行手动填充
  let data = CryptoJS.enc.Utf8.parse(v)
  // 添加一个 \x00 字节
  data = data.concat(CryptoJS.enc.Utf8.parse('\x00'))
  // 补齐到 16 字节的倍数
  while (data.sigBytes % 16 !== 0)
    data = data.concat(CryptoJS.enc.Utf8.parse('\x00'))

  const key = CryptoJS.enc.Utf8.parse(k)
  const ivParams = CryptoJS.enc.Utf8.parse(iv)

  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: ivParams,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.NoPadding,
  })

  return encrypted.ciphertext.toString()
}

const stringify = (obj: any) => JSON.stringify(obj).replace(/":"/g, '": "').replace(/","/g, '", "')

export function GZIP(o: object): string {
  const jsonStr = stringify(o)
  const encoded = new TextEncoder().encode(jsonStr)
  const compressed = pako.gzip(encoded, {
    level: 2,
  })

  compressed.set([19], 9)

  return btoa(String.fromCharCode(...compressed))
}

export function get_tn(o: Record<string, any>): string {
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
      v = get_tn(v)

    resultList.push(v)
  }

  // 将所有结果连接成字符串
  return resultList.join('')
}

export async function get_smid() {
  const now = new Date()
  const _time = now.getFullYear()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0')

  // 生成UUID v4
  const uid = crypto.randomUUID()

  // MD5加密uid
  const uidMd5 = md5(uid)

  const v = `${_time + uidMd5}00`

  // 计算smsk_web
  const smsk_web = md5(`smsk_web_${v}`).substring(0, 14)

  return `${v + smsk_web}0`
}

export async function get_d_id() {
  // 生成 UUID 并计算 priId
  const uid = crypto.randomUUID()
  const priId = md5(uid).substring(0, 16)

  // 使用 node-forge 进行 RSA 加密
  const publicKey = forge.pki.publicKeyFromPem(
    `-----BEGIN PUBLIC KEY-----\n${SM_CONFIG.publicKey}\n-----END PUBLIC KEY-----`,
  )

  const encrypted = publicKey.encrypt(uid, 'RSAES-PKCS1-V1_5')
  const ep = forge.util.encode64(encrypted)

  // 准备浏览器环境数据
  const browser = {
    ...BROWSER_ENV,
    vpw: crypto.randomUUID(),
    svm: Date.now(),
    trees: crypto.randomUUID(),
    pmf: Date.now(),
  }

  // 准备加密目标数据
  const desTarget: any = {
    ...browser,
    protocol: 102,
    organization: SM_CONFIG.organization,
    appId: SM_CONFIG.appId,
    os: 'web',
    version: '3.0.0',
    sdkver: '3.0.0',
    box: '', // 首次请求为空
    rtype: 'all',
    smid: await get_smid(),
    subVersion: '1.0.0',
    time: 0,
  }

  // 计算并添加 tn
  desTarget.tn = md5(get_tn(desTarget))

  // DES 加密
  const desResult = await _DES(desTarget)

  // GZIP 压缩
  const gzipResult = GZIP(desResult)

  // AES 加密
  const aesResult = await _AES(gzipResult, priId)

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

// MD5实现函数
export function md5(string: string) {
  return CryptoJS.MD5(string).toString()
}
