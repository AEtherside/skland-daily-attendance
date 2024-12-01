import CryptoJSW from '@originjs/crypto-js-wasm'

export async function md5(string: string) {
  await CryptoJSW.MD5.loadWasm()
  return CryptoJSW.MD5(string).toString()
}

export async function hmacSha256(key: string, data: string) {
  await CryptoJSW.HmacSHA256.loadWasm()
  return CryptoJSW.HmacSHA256(data, key).toString()
}

/**
 * AES CBC 加密
 */
export async function encryptAES(message: string, key: string) {
  await CryptoJSW.AES.loadWasm()
  const iv = '0102030405060708'

  // 确保输入数据是 WordArray 类型并进行手动填充
  let data = CryptoJSW.enc.Utf8.parse(message)
  // 添加一个 \x00 字节
  data = data.concat(CryptoJSW.enc.Utf8.parse('\x00'))
  // 补齐到 16 字节的倍数
  while (data.sigBytes % 16 !== 0)
    data = data.concat(CryptoJSW.enc.Utf8.parse('\x00'))

  const encrypted = CryptoJSW.AES.encrypt(
    data,
    CryptoJSW.enc.Utf8.parse(key),
    {
      iv: CryptoJSW.enc.Utf8.parse(iv),
      mode: CryptoJSW.mode.CBC,
      padding: CryptoJSW.pad.NoPadding,
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
export async function encryptDES(message: string | number, key: string) {
  await CryptoJSW.TripleDES.loadWasm()
  // 将输入转换为字符串
  const inputStr = padData(String(message))

  // 创建 key
  const keyWordArray = CryptoJSW.enc.Utf8.parse(key!)

  // 创建输入数据
  const dataWordArray = CryptoJSW.enc.Utf8.parse(inputStr)

  // 使用 TripleDES 加密 (ECB 模式)
  const encrypted = CryptoJSW.TripleDES.encrypt(dataWordArray, keyWordArray, {
    mode: CryptoJSW.mode.ECB,
    padding: CryptoJSW.pad.NoPadding,
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

export async function encryptRSA(message: string, publicKey: string) {

  await CryptoJSW.RSA.loadWasm()

  const formatPublickey = publicKey.match(/.{1,64}/g)?.join('\n') || ''
  const pk = `-----BEGIN PUBLIC KEY-----\n${formatPublickey}\n-----END PUBLIC KEY-----`

  const encrypted = CryptoJSW.RSA.encrypt(message, {
    encryptPadding: 'PKCS1V15',
    key: pk,
    isPublicKey: true,
  })
 
  if (!encrypted)
    throw new Error('RSA encryption failed')
  return btoa(String.fromCharCode(...encrypted))
}
