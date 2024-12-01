import { createRequire } from 'node:module'
import CryptoJS from 'crypto-js'

// 使用 require 加载 JSEncrypt 防止包的错误
const require = createRequire(import.meta.url)
const JSEncrypt: typeof import('jsencrypt/lib/index.js').default = require('jsencrypt/lib/index.js').default

export function md5(string: string) {
  return CryptoJS.MD5(string).toString()
}

/**
 * AES CBC 加密
 */
export function encryptAES(message: string, key: string) {
  const iv = '0102030405060708'

  // 确保输入数据是 WordArray 类型并进行手动填充
  let data = CryptoJS.enc.Utf8.parse(message)
  // 添加一个 \x00 字节
  data = data.concat(CryptoJS.enc.Utf8.parse('\x00'))
  // 补齐到 16 字节的倍数
  while (data.sigBytes % 16 !== 0)
    data = data.concat(CryptoJS.enc.Utf8.parse('\x00'))

  const encrypted = CryptoJS.AES.encrypt(
    data,
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.NoPadding,
    },
  )

  return encrypted.ciphertext.toString()
}

function padData(data: string): string {
  const blockSize = 8
  const padLength = blockSize - (data.length % blockSize)
  return data + '\0'.repeat(padLength)
}

/**
 * DES ECB 加密
 */
export function encryptDES(message: string | number, key: string) {
  // 将输入转换为字符串
  const inputStr = padData(String(message))

  // 创建 key
  const keyWordArray = CryptoJS.enc.Utf8.parse(key!)

  // 创建输入数据
  const dataWordArray = CryptoJS.enc.Utf8.parse(inputStr)

  // 使用 TripleDES 加密 (ECB 模式)
  const encrypted = CryptoJS.TripleDES.encrypt(dataWordArray, keyWordArray, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
  })

  // 转换为 base64
  return encrypted.toString()
}

export interface DESRule {
  cipher?: string
  is_encrypt: number
  key?: string
  obfuscated_name: string
}

export function encryptObjectByDESRules(object: Record<string, string | number>, rules: Record<string, DESRule>) {
  const result: Record<string, string | number> = {}

  for (const i in object) {
    if (i in rules) {
      const rule = rules[i]
      if (rule.is_encrypt === 1)
        result[rule.obfuscated_name] = encryptDES(object[i], rule.key!)
      else
        result[rule.obfuscated_name] = object[i]
    }
    else {
      result[i] = object[i]
    }
  }

  return result
}

export function encryptRSA(message: string, publicKey: string) {

  const encrypt = new JSEncrypt()
  encrypt.setPublicKey(`-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`)
  const encrypted = encrypt.encrypt(message)
  if (!encrypted)
    throw new Error('RSA encryption failed')
  return encrypted
}
