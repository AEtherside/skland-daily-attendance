import { defineEventHandler } from 'nitro/h3'

export default defineEventHandler(() => {
  return new Response(
    '<h1>Hello World</h1>',
    {
      headers: {
        'Content-Type': 'text/html',
      },
    },
  )
})
