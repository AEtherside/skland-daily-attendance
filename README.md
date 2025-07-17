# 森空岛签到

使用 TypeScript 实现的森空岛自动签到系统，支持多账号管理和多种推送通知方式。

核心支持在所有支持 [Web Cryptography](https://caniuse.com/cryptography) 的运行环境运行，包括浏览器、Node.js、Cloudflare Workers 等。

## 功能特点

- 🌟 支持多账号管理
- 🤖 自动定时执行签到任务
- 📱 支持多种推送通知方式
- 🔄 支持错误自动重试

## 部署方式

本项目提供两种部署方式，请根据个人需求选择：

1. [Cloudflare Workers 版本](./apps/cloudflare/README.md)
2. [GitHub Actions 版本](./apps/node//README.md)


## 注意事项

- 本项目仅用于学习和研究目的
- 请勿频繁调用 API，以免影响账号安全

## 相关项目

- [罗德岛远程指挥部](https://github.com/enpitsuLin/rhodes-headquarters) - 浏览器扩展，用于监控森空岛信息

## License

MIT
