import { defineConfig } from 'nitro'

export default defineConfig({
  serverDir: './',
  experimental: {
    tasks: true,
  },
  scheduledTasks: {
    '30 0/2 * * *': ['attendance'],
  },
  runtimeConfig: {
    tokens: '',
    notificationUrls: '',
    maxRetries: '3',
    nitro: {
      envPrefix: 'SKLAND_',
    },
  },
})
