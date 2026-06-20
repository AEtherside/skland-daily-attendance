# 森空岛签到

使用 TypeScript 实现的森空岛自动签到服务，支持多账号管理和多种推送通知方式。

基于 Nitro 构建，支持 Node.js、Cloudflare Workers 等环境部署。

## 功能特点

- 🌟 支持多账号管理
- 🤖 自动定时执行签到任务
- 📱 支持多种推送通知方式
- 🔄 支持错误自动重试
- 💾 支持多种持久化存储方案
- 🚀 支持多平台部署（Cloudflare Workers、GitHub Actions、Docker 等）

## 快速开始

基于 Nitro 构建，使用 Scheduled Tasks 实现定时任务来签到，查看 [Nitro 文档](https://nitro.build/guide/tasks#platform-support) 了解支持的平台。

### Cloudflare Workers 部署

通过一键部署到 Cloudflare Workers，只需要[配置对应的环境变量](#配置说明)即可。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/AEtherside/skland-daily-attendance)

### GitHub Actions 部署

通过 GitHub Actions 可以实现自动定时签到，无需额外的服务器资源。

<details>
<summary>展开查看详细步骤</summary>

#### 快速开始

1. **Fork 本仓库**

   点击页面右上角的 Fork 按钮，将仓库 fork 到你的账号下。

2. **配置 GitHub Secrets**

   进入你 fork 的仓库，依次点击 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`，添加以下必要的密钥：

   | Secret 名称 | 说明 | 是否必填 |
   |------------|------|---------|
   | `SKLAND_TOKENS` | 森空岛凭据，多个账号用逗号分隔 | 必填 |
   | `SKLAND_NOTIFICATION_URLS` | 通知 URL，多个 URL 用逗号分隔 | 可选 |
   | `SKLAND_MAX_RETRIES` | 最大重试次数，默认为 3 | 可选 |
   | `SKLAND_ANONYMOUS` | 隐藏角色名，设置任意值即可开启（推荐使用 `true` 或 `1`），默认关闭 | 可选 |

   <details>
   <summary>关于 SKLAND_ANONYMOUS 配置</summary>

   **作用**：隐藏角色名，设置任意值即可开启（推荐使用 `true` 或 `1`），默认关闭

   **效果**：
   ```
   开始处理...
   【明日方舟】官服角色 博士 #[数字占位符] 今天已经签到过了
   【明日方舟：终末地】官服角色 管理员 lv.[等级占位符] 今天已经签到过了
   ```
   </details>

3. **启用 GitHub Actions**

   进入仓库的 `Actions` 标签页，如果看到提示，点击 `I understand my workflows, go ahead and enable them` 启用工作流。

4. **执行签到**

   GitHub Actions 会在每天 16:00 (UTC) 自动执行签到任务。你也可以手动触发：

   - 进入 `Actions` 标签页
   - 选择 `attendance` 工作流
   - 点击右侧的 `Run workflow` 按钮
   - 点击绿色的 `Run workflow` 确认执行

#### 工作流说明

- **attendance** (`.github/workflows/schedule.yml`)
  - 自动签到工作流，每天 16:00 (UTC) 定时执行
  - 支持手动触发和通过 `workflow_call` 被其他工作流调用
  - 定时执行时会自动调用 `liskin/gh-workflow-keepalive@v1` 防止仓库长期无活动导致 GitHub Actions 被自动停用

#### 注意事项

- GitHub Actions 免费额度为每月 2000 分钟，本项目的签到任务约消耗 1-2 分钟/次
- 确保仓库为 Public 或拥有 GitHub Actions 的私有仓库配额
- 如果长时间（60天）没有任何提交，GitHub 会自动停用 Actions，`workflow-keepalive` 会在每次定时执行时通过 GitHub API 重新启用工作流，无需产生额外的 commit

</details>

### Docker 部署

本项目提供了 Docker 和 Docker Compose 配置，方便快速部署。Docker 镜像已发布到 [GitHub Container Registry](https://github.com/aetherside/skland-daily-attendance/pkgs/container/skland-daily-attendance)。

<details>
<summary>展开查看详细步骤</summary>

#### 使用预构建镜像（推荐）

直接拉取并运行已构建的镜像：

```bash
docker pull ghcr.io/aetherside/skland-daily-attendance:main
```

然后使用 Docker Compose：

1. 创建 `docker-compose.yml` 文件：

```yaml
services:
  skland-attendance:
    image: ghcr.io/aetherside/skland-daily-attendance:main
    container_name: skland-attendance
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/.data
```

2. 创建 `.env` 文件并配置环境变量：

```bash
# 必填：森空岛凭据，多个用逗号分隔
SKLAND_TOKENS=your-token-1,your-token-2

# 可选：通知 URL
SKLAND_NOTIFICATION_URLS=your-notification-url

# 可选：最大重试次数（默认为 3）
SKLAND_MAX_RETRIES=3

# 可选：隐藏角色名（设置任意值即可开启，推荐使用 true 或 1）
SKLAND_ANONYMOUS=true

# 可选：持久化存储配置（使用 Upstash Redis）
# KV_REST_API_URL=https://your-upstash-redis.upstash.io
# KV_REST_API_TOKEN=your-token

# 可选：使用 Redis
# REDIS_URL=rediss://default:password@your-redis-host:6379

# 可选：使用 AWS S3 兼容存储
# S3_ACCESS_KEY_ID=your-access-key
# S3_SECRET_ACCESS_KEY=your-secret-key
# S3_BUCKET=your-bucket-name
# S3_REGION=us-east-1
# S3_ENDPOINT=https://your-s3-endpoint.com

# 可选：禁用持久化存储
# DISABLE_KV=false
```

3. 启动服务：

```bash
docker compose up -d
```

4. 查看日志：

```bash
docker compose logs -f
```

5. 停止服务：

```bash
docker compose down
```

#### 使用本地构建镜像

如果需要自定义构建，可以使用源码构建：

1. 构建镜像：

```bash
docker build -t skland-attendance .
```

2. 运行容器：

```bash
docker run -d \
  --name skland-attendance \
  --restart unless-stopped \
  -e SKLAND_TOKENS="your-token-1,your-token-2" \
  -e SKLAND_NOTIFICATION_URLS="your-notification-url" \
  -v $(pwd)/data:/app/.data \
  skland-attendance
```

#### Docker 部署注意事项

- 默认使用本地文件存储，数据会持久化到 `./data` 目录
- 如果需要使用 Redis 持久化，可以取消注释 `docker-compose.yml` 中的 Redis 服务配置
- 容器会按照 `nitro.config.ts` 中配置的定时任务自动执行签到（默认每 2 小时执行一次）
- 如需调整定时任务频率，请修改 `nitro.config.ts` 中的 `scheduledTasks` 配置后重新构建镜像

</details>

## 配置说明

### 1. 配置凭据

登录 [森空岛网页版](https://www.skland.com/) 后，打开 https://web-api.skland.com/account/info/hg 记下 `content` 字段的值。

或者登录 [鹰角网络通行证](https://user.hypergryph.com/login) 后，打开 https://web-api.hypergryph.com/account/info/hg 记下 `content` 字段的值（推荐）。

将获取的凭据设置到环境变量 `SKLAND_TOKENS` 中，多个凭据用逗号分隔。

```bash
SKLAND_TOKENS=your-token-1,your-token-2
```

### 2. 配置消息通知（可选）

通过 [Statocysts](https://github.com/octoplorer/statocysts) 支持多种通知方式，将对应格式的通知 URL 设置到环境变量 `SKLAND_NOTIFICATION_URLS` 中，多个 URL 用逗号分隔。

```bash
SKLAND_NOTIFICATION_URLS="Statocysts 格式通知 URL"
```

### 3. 配置持久化存储（可选）

项目支持使用持久化存储来记录每日签到状态。

因为每次计划任务执行不一定签到成功，所以本服务在除了 GitHub Actions 的情况下使用时，会通过每 2 小时执行的计划任务保证当天的签到任务成功，所以需要持久化存储对应日期的签到状态避免成功后重复签到。

> [!WARNING]
> 因为项目默认使用 2 小时的计划任务执行签到任务，所以在使用中不需要那么高的频率来执行签到任务，需要在 `nitro.config.ts` 中手动调整计划任务的执行频率。
> 如果是 Cloudflare Workers 环境，同样需要调整 Worker 的 cron 定时器。

项目支持多种 KV 存储方式，根据不同的部署环境选择合适的存储方案：

#### Upstash Redis（推荐用于 Serverless 环境）

```bash
KV_REST_API_URL=https://your-upstash-redis.upstash.io
KV_REST_API_TOKEN=your-token
```

或使用 Upstash 环境变量：

```bash
UPSTASH_REDIS_REST_URL=https://your-upstash-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

#### Redis

```bash
REDIS_URL=rediss://default:password@your-redis-host:6379
```

或使用通用 KV URL：

```bash
KV_URL=rediss://default:password@your-redis-host:6379
```

#### AWS S3 兼容存储

```bash
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ENDPOINT=https://your-s3-endpoint.com  # 可选，用于兼容 S3 的存储服务
```

#### Cloudflare KV

在 Cloudflare Workers 环境中会自动检测并使用，需要在 Cloudflare Dashboard 中创建名为 `KV` 的 KV 命名空间并绑定到项目。

#### Deno KV

在 Deno Deploy 环境中会自动检测并使用，无需额外配置。

#### 本地文件存储（默认）

如果未配置以上任何存储方式，将自动使用本地文件存储，数据保存在 `.data/kv` 目录下。

#### 禁用持久化存储

如果不需要持久化功能，可以设置：

```bash
DISABLE_KV=true
```

### 4. 其他配置

#### 重试次数

可以通过环境变量 `SKLAND_MAX_RETRIES` 设置签到失败时的最大重试次数，默认为 3 次。

```bash
SKLAND_MAX_RETRIES=5
```

#### 隐藏角色名

可以通过环境变量 `SKLAND_ANONYMOUS` 隐藏角色名，设置任意值即可开启（推荐使用 `true` 或 `1`），默认关闭。

```bash
SKLAND_ANONYMOUS=true
```

## 注意事项

- 本项目仅用于学习和研究目的
- 请勿频繁调用 API，以免影响账号安全

## 相关项目

- [罗德岛远程指挥部](https://github.com/enpitsuLin/rhodes-headquarters) - 浏览器扩展，用于监控森空岛信息

## License

MIT
