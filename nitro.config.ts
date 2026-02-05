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
    barkToken: '',
    maxRetries: '3',
    nitro: {
      envPrefix: 'SKLAND_',
    },
  },
  rolldownConfig: {
    output: {
      codeSplitting: {
        groups: [
          {
            name: "unstorage",
            test: /node_modules\/unstorage\/dist\/drivers\/(?!redis)/,
          },
          {
            name: "unstorage-drivers-redis",
            test: /node_modules\/unstorage\/dist\/drivers\/redis/,
          },
        ]
      }
    }
  }
})
