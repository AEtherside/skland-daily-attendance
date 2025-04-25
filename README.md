# 森空岛签到

使用 github action 定时执行森空岛各版面登岛检票和明日方舟每日签到任务

> [!CAUTION]
> ~~从 2024 年 8 月 13 日起，基于 api 请求的自动签到已全面拉闸，有强烈需求的可以使用 https://github.com/MaaXYZ/MaaAssistantSkland~~
>
> ~~后续如果有逆向解参数或者黑盒调用方式解决风控的自动签到大概率不会开源~~
> 鹰角解除了方舟每日签到的风控，换来的是登岛检票的接口被风控，可喜可贺可喜可贺，所以本项目准备就不提供登岛检票功能了

## 使用

### Fork 项目

点击本仓库右上角 `Fork` 到自己的账号下

### 获取凭据

登录 [森空岛网页版](https://www.skland.com/) 后，打开 https://web-api.skland.com/account/info/hg 记下 content 字段的值

或者登录 [鹰角网络通行证](https://user.hypergryph.com/login) 后打开 https://web-api.hypergryph.com/account/info/hg 记下 content 字段的值

### 添加 Cookie 至 Secrets

点击Settings -> 点击选项卡 Secrets and variables -> 点击Actions -> New repository secret

建立名为 `SKLAND_TOKEN` 的 secret，值为上一步获取 content，最后点击 Add secret，如果需要多账号支持，请使用半角逗号`,`分割

#### 推送服务

- 支持 server 酱推送每日签到信息，建立名为 `SERVERCHAN_SENDKEY` 的 secret 填入你 server 酱的推送密钥

- 支持 bark 推送每日签到信息，建立名为 `BARK_URL` 的 secret 填入你 bark 的推送地址，例如 `https://api.day.app/xxxxxxxxxx/`，支持自建服务器

- 支持 message-pusher 推送每日签到信息，建立名为 `MESSAGE_PUSHER_URL` 的 secret 填入你 Webhook 地址，例如 `https://msgpusher.com/webhook/xxxxx`，支持自建服务器
  - 抽取规则
  ```json
  {
    "title": "title",
    "description": "content",
    "content": "content"
  }
  ```
  - 构建规则
  ```json
  {
    "title": "$title",
    "description": "$description",
    "content": "$content"
  }
  ```
#### 错误重试
- 支持定义变量 `MAX_RETRIES` 来自定义重试次数（需为纯数字，如果读取错误，则自动切换为默认值，默认值为3，各账号的重试次数不共享，即每个账号拥有3次重试次数）

<details>
  <summary>最终可能有的 secrets 如下</summary>

| Name               | Secret                                                           |
| ------------------ | ---------------------------------------------------------------- |
| SKLAND_TOKEN \*    | 森空岛 token <br>多账号使用半角逗号`,`分割                        |
| MAX_RETRIES | 重试次数（纯数字，默认3次，次数不共享） |
| SERVERCHAN_SENDKEY | Server 酱推送密钥，可选                                          |
| BARK_URL           | Bark 推送地址，可选                                              |
| MESSAGE_PUSHER_URL | Message Pusher 推送地址，可选                                    |
</details>

### 启动 Github Action

> Actions 默认为关闭状态，Fork 之后需要手动执行一次，若成功运行其才会激活。

返回项目主页面，点击上方的`Actions`，再点击左侧的`attendance`，再点击`Run workflow`

至此，部署完毕。

> 注意：github actions 会对60天没有活动的仓库自动禁用，你可能要主动关注一下 github actions 的运行情况（一般会发邮件通知 actions 执行失败）

### 本仓库使用了 `Actions` 自动活跃工作流，需要手动执行一次，之后就不用管 `Actions` 了

## ~~广告~~

推荐一款浏览器扩展——[罗德岛远程指挥部](https://github.com/enpitsuLin/rhodes-headquarters) 能在浏览器上监控博士您岛上的最新信息
