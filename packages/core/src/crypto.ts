import * as mima from 'mima-kit'

export async function md5(string: string) {
  return mima.md5(mima.UTF8(string)).to(mima.HEX)
}

export async function hmacSha256(key: string, data: string) {
  const hmac256 = mima.hmac(mima.sha256)
  return hmac256(mima.UTF8(key), mima.UTF8(data)).to(mima.HEX)
}

/**
 * AES CBC 加密
 */
export async function encryptAES(message: string, key: string) {
  const iv = new TextEncoder().encode('0102030405060708')

  const data = new TextEncoder().encode(message)

  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  )

  // 加密
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv,
    },
    cryptoKey,
    data,
  )

  // 转换为十六进制字符串
  return mima.HEX(new Uint8Array(encrypted))
}

function padData(data: string): string {
  const blockSize = 8
  const padLength = blockSize - (data.length % blockSize)
  return data + '\0'.repeat(padLength)
}

/**
 * DES ECB 加密
 */
export async function encryptDES(message: string | number, key: string) {
  const inputStr = padData(String(message))
  // @ts-expect-error 3DES 64 位密钥长度
  const TripleDES = mima.t_des(64)

  const ECBTripleDES = mima.ecb(TripleDES, mima.NO_PAD)
  const cipher = ECBTripleDES(mima.UTF8(key))

  return cipher.encrypt(mima.UTF8(inputStr)).to(mima.B64)
}

export interface DESRule {
  cipher?: string
  is_encrypt: number
  key?: string
  obfuscated_name: string
}

export async function encryptObjectByDESRules(object: Record<string, string | number>, rules: Record<string, DESRule>) {
  const result: Record<string, string | number> = {}

  for (const i in object) {
    if (i in rules) {
      const rule = rules[i]
      if (rule.is_encrypt === 1)
        result[rule.obfuscated_name] = await encryptDES(object[i], rule.key!)
      else
        result[rule.obfuscated_name] = object[i]
    }
    else {
      result[i] = object[i]
    }
  }

  return result
}

/**
 * 从PEM格式的公钥中提取RSA参数的n和e (BigInt形式)
 */
export async function extractJWKFromPEM(publicKeyPEM: string) {
  // 移除PEM头尾和换行，并进行base64解码
  const pemContents = publicKeyPEM
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '')

  const binaryDer = atob(pemContents)
  const derBuffer = new Uint8Array(binaryDer.length)
  for (let i = 0; i < binaryDer.length; i++) {
    derBuffer[i] = binaryDer.charCodeAt(i)
  }

  // 使用 Web Crypto API 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    derBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt'],
  )

  // 导出为JWK格式
  const jwk = await crypto.subtle.exportKey('jwk', cryptoKey)

  return {
    n: base64URLToBigInt(jwk.n!),
    e: base64URLToBigInt(jwk.e!),
  }
}

export function base64URLToBigInt(base64url: string): bigint {
  // 1. Base64URL 转 Base64
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64url.length / 4) * 4, '=')

  // 2. Base64 解码为二进制字符串
  const binaryStr = atob(base64)

  // 3. 转换为 BigInt
  let result = 0n
  for (let i = 0; i < binaryStr.length; i++) {
    result = (result << 8n) | BigInt(binaryStr.charCodeAt(i))
  }

  return result
}

export async function encryptRSA(message: string, publicKey: string) {
  const { n, e } = await extractJWKFromPEM(publicKey)
  const key = mima.rsa({ n, e })
  const cliper = mima.pkcs1_es_1_5(key)

  const encrypted = cliper.encrypt(mima.UTF8(message)).to(mima.B64)

  return encrypted
}
