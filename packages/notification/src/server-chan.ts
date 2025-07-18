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
  
    // 根据 sendkey 是否以 'sctp' 开头，选择不同的 API URL
  const url = String(sendkey).match(/^sctp(\d+)t/i) 
    ? `https://${sendkey.match(/^sctp(\d+)t/i)[1]}.push.ft07.com/send/${sendkey}.send`
    : `https://sctapi.ftqq.com/${sendkey}.send`
  
  try {
    // const resp = await axios.post(`https://sctapi.ftqq.com/${sendkey}.send`, payload);
    const data = await ofetch<{ code: number }>(
      url,
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
