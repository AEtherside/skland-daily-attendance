# Node.js 版本

Node.js 环境运行的森空岛自动签到服务，可以使用 Github Action 每日自动执行。~~或者是 Docker 进行每日自动执行（未制作）~~

## 特点

- 💰 完全免费，无需服务器，但是需要注意因为不活跃而被 Github 自动禁用
- 🧵 使用 GitHub Actions 定时执行，出现错误需要手动重试

## 使用

[Fork 本项目](https://github.com/enpitsuLin/skland-daily-attendance/fork)

## 配置

### 获取凭据

登录 [森空岛网页版](https://www.skland.com/) 后，打开 https://web-api.skland.com/account/info/hg 记下 content 字段的值

或者登录 [鹰角网络通行证](https://user.hypergryph.com/login) 后打开 https://web-api.hypergryph.com/account/info/hg 记下 content 字段的值

### 添加至仓库 Secrets

在 Fork 的仓库中，进入 Settings -> Secrets and variables -> Actions -> New repository secret

建立名为 `SKLAND_TOKEN` 的 secret，值为上一步获取 content，最后点击 Add secret，如果需要多账号支持，请使用半角逗号`,`分割

### 消息推送

自行设置 `SERVERCHAN_SENDKEY`, `BARK_URL`, `MESSAGE_PUSHER_URL` 的 secret，值为对应的服务推送需要的 url 或者密钥。

### 错误重试

自行设置 `MAX_RETRIES` 的 secret，值为错误重试次数，默认 3 次。

## 启动 Github Action


> Actions 默认为关闭状态，Fork 之后需要手动执行一次，若成功运行其才会激活。

返回项目主页面，点击上方的`Actions`，再点击左侧的`attendance`，再点击`Run workflow`

至此，部署完毕。

> ~~注意：github actions 会对60天没有活动的仓库自动禁用，你可能要主动关注一下 github actions 的运行情况（一般会发邮件通知 actions 执行失败）~~
> 本仓库使用了 `Actions` 自动活跃工作流，需要手动执行一次，之后就不用管 `Actions` 了

## Docker 运行

🕊 咕咕咕
