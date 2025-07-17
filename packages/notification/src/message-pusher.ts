import { ofetch } from 'ofetch'

export async function messagePusher(url: string, title: string, content: string) {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    console.error('Wrong type for MessagePusher URL.')
    return
  }

  const payload = {
    title,
    content,
    description: content,
  }
  try {
    const data = await ofetch(
      url,
      {
        method: 'POST',
        body: payload,
      },
    )
    console.debug(data)
  }
  catch (error) {
    console.error(`[MessagePusher] Error: ${error}`)
  }
}
