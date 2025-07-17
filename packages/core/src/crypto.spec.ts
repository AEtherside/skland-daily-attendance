import { createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { BROWSER_ENV, DES_RULE } from './constant'
import { encryptAES, encryptDES, encryptObjectByDESRules, hmacSha256, md5 } from './crypto'

describe('crypto', () => {
  it('md5', async () => {
    const message = '123456'
    const expected = createHash('md5')
      .update(message, 'utf-8')
      .digest('hex')

    expect(await md5(message)).toBe(expected)
  })

  it('hmacSha256', async () => {
    const key = '1234567890123456'
    const data = '123456'
    const expected = createHmac('sha256', key)
      .update(data, 'utf-8')
      .digest('hex')
    expect(await hmacSha256(key, data)).toBe(expected)
  })

  it('encryptAES', async () => {
    const message = '123456'
    const key = '1234567890123456'
    const expected = '172000e84d64a30f559989a6b9f6082d'
    expect(await encryptAES(message, key)).toBe(expected)
  })

  it('encryptDES', async () => {
    const message = '123456'
    const key = '12345678'
    const expected = 'uAoXvewt7nk='
    expect(await encryptDES(message, key)).toBe(expected)
  })

  it('encryptObjectByDESRules', async () => {
    const object = BROWSER_ENV

    const rules = DES_RULE

    const expected = {
      ab: 'jYTfqbaQNrY=',
      an: '7pMB/N4HgyQ=',
      as: 'ZiEGW6ynU0Q=',
      bj: 'Fd5zMeCbJY2nc0J7tHO+PhlIlRR63RY8fYNs9YznImp6jkEBiv0a/tEKhl595d4tcrzH6sfKUs4nKN0nXy6W7J2x+LUZLuaw7FVBddNfZ3O2ToGM9rykP902i7Vt2WXFIk2V2VvLCCiW1v0CkqsLCDzGAvwx5WtxoEbG/lmeDKo=',
      cf: '28/tqKZHZlQvtdne1LRJi507hr012/kc',
      gm: 'HvYa39S0OS4=',
      hf: '5Ff2HmUkil1XYnjmjWlu/K55KTcmUZpP',
      kq: '/DXc2+x/RAQSFJ/sKmDA4aT5QTgP9gzchpbk1IOIfWARsk2FyMpkFBk0Ys1KvCH8sjmMy+0439V4WOCYWmcgAhYmqlXrq33pH8SJKlYvOdUAS9ps75Mp3UTdJurGvbJQNWLlBp0UxQk0Z6A6Lg07Zu8t6PAbcSoGyaa826BG0Mo=',
      yk: 'I6evoagk0jL0RCGjelJAmw==',
      zx: 'gxHeT3BY9PJ+tysf0WFAQ+4iqjE4Jw1gHFwaMqRgMKbMWRpsOZ58yQ==',
    }

    expect(await encryptObjectByDESRules(object, rules)).toEqual(expected)
  })
})
