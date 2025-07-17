import { useContext } from './context'

export async function retry<T>(fn: () => Promise<T>, retries?: number): Promise<T> {
  const { config } = useContext()
  retries = retries ?? config.MAX_RETRIES
  try {
    return await fn()
  }
  catch (error) {
    if (retries > 0) {
      console.log(`操作失败，剩余重试次数: ${retries}`)
      await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY))
      return retry(fn, retries - 1)
    }
    throw error
  }
}

export function pick(obj: Record<string, any>, keys: string[]) {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {} as Record<string, any>)
}
