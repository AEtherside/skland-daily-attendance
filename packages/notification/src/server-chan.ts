import { ofetch } from 'ofetch'

export async function serverChan(sendkey: string, title: string, content: string) {
  if (typeof sendkey !== 'string') {
    console.error('Wrong type for serverChan token.')
    return
    // throw new Error("Wrong type for serverChan token.");
  }
  const payload = {
    title,
    desp: content,
  }
  try {
    // const resp = await axios.post(`https://sctapi.ftqq.com/${sendkey}.send`, payload);
    const data = await ofetch<{ code: number }>(
      `https://sctapi.ftqq.com/${sendkey}.send`,
      {
        method: 'POST',
        body: payload,
      },
    )
    if (data.code === 0) {
      console.log('[ServerChan] Send message to ServerChan successfully.')
    }
    else {
      console.log(`[ServerChan][Send Message Response] ${data}`)
    }
  }
  catch (error) {
    console.error(`[ServerChan] Error: ${error}`)
  }
}
