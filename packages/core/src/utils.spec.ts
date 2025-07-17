import { describe, expect, it } from 'vitest'
import { getDid } from './utils'

describe('getDid', () => {
  it('should return a valid did', async () => {
    const did = await getDid()
    expect(did).toBeDefined()
  })
})
