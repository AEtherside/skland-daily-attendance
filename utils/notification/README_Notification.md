# Notification System / 通知系统

本文档描述了重构后的通知系统架构设计。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        业务逻辑层                                │
│                   (tasks/attendance.ts)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 调用
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MessageCollector (适配器)                     │
│                     (utils/message.ts)                          │
│              保留旧 API，内部委托给 NotificationManager           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 委托
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NotificationManager                           │
│                     (manager.ts)                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  NotificationData                        │   │
│  │  • meta: { timestamp, executionResult, hasError }        │   │
│  │  • accounts: { total, successful, skipped, failed, ... } │   │
│  │  • games: [{ gameId, gameName, succeeded, ... }]         │   │
│  │  • logs: [{ accountNumber, level, message }]             │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 渲染 & 分发
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       模板系统                                   │
│                    (templates/)                                 │
│                                                                 │
│  • renderTemplate() - 渲染字符串模板或函数模板                    │
│  • defaultBarkTemplates - Bark 默认模板                          │
│  • defaultStatocystsTemplates - Statocysts 默认模板              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────┬───────────────────┬──────────────────────────┐
│  Bark Adapter    │ Statocysts Adapter │   (可扩展更多渠道)        │
│  (channels/)     │   (channels/)      │                          │
└──────────────────┴───────────────────┴──────────────────────────┘
```

## 目录结构

```
utils/notification/
├── types.ts              # 核心类型定义
├── manager.ts            # NotificationManager 类
├── index.ts              # 主入口导出
├── templates/
│   ├── index.ts          # 模板导出
│   ├── utils.ts          # 模板渲染工具函数
│   └── default.ts        # 默认模板（复刻原格式）
└── channels/
    ├── index.ts          # 渠道导出
    ├── bark.ts           # Bark 推送适配器
    └── statocysts.ts     # Statocysts 适配器
```

## 核心概念

### 1. NotificationData（通知数据模型）

所有业务数据的结构化表示，与展示逻辑分离：

```typescript
interface NotificationData {
  meta: {
    timestamp: Date
    executionResult: 'success' | 'failed' | 'skipped'
    hasError: boolean
  }
  accounts: {
    total: number
    successful: number
    skipped: number
    failed: number
    failedIndexes: number[]
  }
  games: Array<{
    gameId: number
    gameName: string
    total: number
    succeeded: number
    alreadyAttended: number
    failed: number
  }>
  logs: Array<{
    accountNumber: number
    level: 'info' | 'error' | 'warning'
    message: string
  }>
}
```

### 2. 渠道配置（Channel Config）

每个通知渠道独立配置：

```typescript
// Bark 渠道
interface BarkChannelConfig {
  type: 'bark'
  enabled: boolean
  tokens: string[]
  sendOn?: ['success', 'failed', 'skipped']  // 发送条件
  templates: {
    title: string | TemplateFunction
    subtitle: string | TemplateFunction
    body: string | TemplateFunction
  }
  // Bark 特有参数
  group?: string
  icon?: string
  level?: 'active' | 'timeSensitive' | 'passive'
  url?: string
  sound?: string
}

// Statocysts 渠道
interface StatocystsChannelConfig {
  type: 'statocysts'
  enabled: boolean
  urls: string[]
  sendOn?: ['success', 'failed']
  templates: {
    title: string | TemplateFunction
    body: string | TemplateFunction
  }
}
```

### 3. 模板系统

支持两种模板类型：

**字符串模板**（使用 `{{path}}` 插值语法）：
```typescript
const template = "账号总数: {{accounts.total}}, 成功: {{accounts.successful}}"
```

**函数模板**（完全自定义逻辑）：
```typescript
const template: TemplateFunction = (data) => {
  if (data.meta.executionResult === 'failed') {
    return `失败 ${data.accounts.failed} 个账号`
  }
  return `成功 ${data.accounts.successful} 个账号`
}
```

## 使用方式

### 方式一：使用旧 API（向后兼容）

现有代码无需修改：

```typescript
import { createMessageCollector } from '~/utils'

const messageCollector = createMessageCollector({
  notificationUrls: ['...'],
  barkTokens: ['...'],
})

messageCollector.notify('消息内容')
messageCollector.info('同时输出到控制台和通知')
messageCollector.setResult('success')
await messageCollector.push()
```

### 方式二：直接使用 NotificationManager（推荐）

更灵活的控制：

```typescript
import {
  createNotificationManager,
  createBarkChannel,
  createStatocystsChannel,
} from '~/utils/notification'

const manager = createNotificationManager({
  channels: [
    createBarkChannel(['bark-token-1', 'bark-token-2'], {
      sendOn: ['success', 'failed', 'skipped'],
      group: 'My App',
      // 可自定义模板
      templates: {
        title: '自定义标题',
        subtitle: (data) => `${data.accounts.successful}/${data.accounts.total}`,
        body: (data) => `详细内容...`,
      },
    }),
    createStatocystsChannel(['url1', 'url2'], {
      sendOn: ['success', 'failed'],
    }),
  ],
})

// 更新数据
manager.updateAccountStats({ total: 3, successful: 2, failed: 1 })
manager.updateGameStats(1, '明日方舟', { succeeded: 5, failed: 0 })
manager.addLog({ accountNumber: 1, level: 'info', message: '签到成功' })
manager.setResult('success')

// 推送通知
await manager.push()
```

### 方式三：通过 MessageCollector 获取 Manager

混合使用：

```typescript
const messageCollector = createMessageCollector({ barkTokens })
const manager = messageCollector.getManager()

// 使用 manager 进行结构化数据操作
manager.updateAccountStats({ total: 5 })
```

## 扩展新渠道

### 步骤 1：定义渠道配置类型

在 `types.ts` 中添加：

```typescript
interface MyChannelConfig extends BaseChannelConfig {
  type: 'my-channel'
  apiKey: string
  templates: {
    title: TemplateDef
    body: TemplateDef
  }
}

// 更新联合类型
type NotificationChannelConfig =
  | BarkChannelConfig
  | StatocystsChannelConfig
  | MyChannelConfig  // 新增
```

### 步骤 2：创建渠道适配器

创建 `channels/my-channel.ts`：

```typescript
import type { ChannelAdapter, MyChannelConfig, NotificationData, RenderedNotification } from '../types'
import { renderTemplate } from '../templates/utils'

export const myChannelAdapter: ChannelAdapter<MyChannelConfig> = {
  type: 'my-channel',

  async send(config, rendered) {
    // 实现发送逻辑
    await fetch('https://api.my-channel.com/send', {
      method: 'POST',
      headers: { 'Authorization': config.apiKey },
      body: JSON.stringify({
        title: rendered.title,
        content: rendered.body,
      }),
    })
  },
}

export function createMyChannel(apiKey: string, options = {}): MyChannelConfig {
  return {
    type: 'my-channel',
    enabled: true,
    apiKey,
    templates: options.templates ?? defaultMyChannelTemplates,
    sendOn: options.sendOn ?? ['success', 'failed'],
  }
}

export function renderMyChannelNotification(
  config: MyChannelConfig,
  data: NotificationData,
): RenderedNotification {
  return {
    title: renderTemplate(config.templates.title, data),
    body: renderTemplate(config.templates.body, data),
  }
}
```

### 步骤 3：注册到 Manager

在 `manager.ts` 的 `sendToChannel` 方法中添加：

```typescript
case 'my-channel': {
  const rendered = renderMyChannelNotification(channel as MyChannelConfig, this.data)
  await myChannelAdapter.send(channel as MyChannelConfig, rendered)
  break
}
```

### 步骤 4：导出

在 `channels/index.ts` 中添加：

```typescript
export * from './my-channel'
```

## 默认模板行为

### Bark

| 字段 | 默认值 |
|------|--------|
| title | `森空岛自动签到` |
| subtitle | 根据 `executionResult` 动态生成：`成功` / `失败❗` / `重复签到` |
| body | 完整的执行报告（Markdown 格式） |
| group | `Skland Notification` |
| level | `timeSensitive` |
| url | `skland://` |

### Statocysts

| 字段 | 默认值 |
|------|--------|
| title | `【森空岛每日签到】` |
| body | 完整的执行报告 |

## 发送条件（sendOn）

控制每个渠道在什么执行结果下发送通知：

| 渠道 | 默认 sendOn | 说明 |
|------|-------------|------|
| Bark | `['success', 'failed', 'skipped']` | 包括重复签到 |
| Statocysts | `['success', 'failed']` | 不发送重复签到 |

自定义示例：

```typescript
createBarkChannel(['token'], {
  sendOn: ['failed'],  // 只在失败时发送
})
```

## 向后兼容性

重构后的系统完全向后兼容：

| 旧 API | 状态 |
|--------|------|
| `createMessageCollector()` | ✅ 保留 |
| `messageCollector.log()` | ✅ 保留 |
| `messageCollector.notify()` | ✅ 保留 |
| `messageCollector.info()` | ✅ 保留 |
| `messageCollector.setResult()` | ✅ 保留 |
| `messageCollector.push()` | ✅ 保留 |
| `messageCollector.collect()` | ⚠️ 已弃用，但仍可用 |

## 设计优势

1. **数据与展示分离**：业务逻辑只需维护数据，不关心如何展示
2. **高度可定制**：用户可自定义标题、图标、声音等
3. **易于扩展**：新增渠道只需实现适配器
4. **便于测试**：可导出 `NotificationData` 进行单元测试
5. **渐进式迁移**：可逐步从旧 API 迁移到新 API
