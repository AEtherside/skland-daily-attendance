export async function messagePusher(url: string, title: string, content: string) {
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      console.error('Wrong type for MessagePusher URL.')
      return -1
    }
  
    const payload = {
      title,
      content: content,
      description: content,
    }
    try {
      const resp = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      )
      const data = await resp.json()
      console.debug(data)
    }
    catch (error) {
      console.error(`[MessagePusher] Error: ${error}`)
      return -1
    }
  }
  