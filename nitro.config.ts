import { defineConfig } from 'nitro'

export default defineConfig({
  serverDir: './',
  experimental: {
    tasks: true,
  },
  scheduledTasks: {
    '0 1-4 * * *': ['attendance'],
  },
  runtimeConfig: {
    tokens: '',
    notificationUrls: '',
    maxRetries: '3',
    scheduleJitterSeconds: '',
    nitro: {
      envPrefix: 'SKLAND_',
    },
  },
  rolldownConfig: {
    output: {
      codeSplitting: {
        groups: [
          {
            name: 'unstorage',
            test: /node_modules\/unstorage\/dist\/drivers\/(?!redis)/,
          },
          {
            name: 'unstorage-drivers-redis',
            test: /node_modules\/unstorage\/dist\/drivers\/redis/,
          },
        ],
      },
    },
  },
})
