# QuantPivot 部署

本仓库通过本地构建和 Wrangler 发布到公司 Cloudflare 账户，无需绑定 Cloudflare Git 集成。

- 网页入口：https://mail.alpha-basis.com
- 备用入口：https://mailflare.luca1040540723.workers.dev
- 邮件域名：`alpha-basis.com`
- 初始管理员邮箱：`admin@alpha-basis.com`
- Worker / D1：`mailflare`
- R2：`mailflare-raw`
- 队列：`mailflare-inbound`、`mailflare-outbound`
- Durable Object：`RealtimeHub`

账户、域名路由和 D1 ID 固定在 `wrangler.jsonc`。根域网站及通配符 DNS 记录保持原状，网页邮箱使用新增的 `mail` 子域名。

## 本地构建与发布

```sh
mise trust
mise install
mise run install
mise run build
mise run dry-run
mise run migrate
mise run deploy
```

首次使用 Wrangler 时执行 `mise run wrangler -- login`，并确认登录用户拥有目标公司账户的权限。部署必须上传 `worker.ts`，以同时包含 HTTP、邮件、队列和定时任务处理器；不要使用生成的 Next Worker 作为入口。

`mise run typecheck` 是独立检查。当前上游版本配置了 `ignoreBuildErrors`，因此构建成功不代表 TypeScript 检查全部通过。

## 密钥和邮件

`CF_TOKEN` 已通过 Cloudflare Worker 的 Secret 配置保存，不在仓库内。权限限定为公司账户的邮件服务以及 `alpha-basis.com` 的 Zone、DNS、Email Routing 配置。`keep_vars` 保留远端变量；密钥不会通过 Git 分发。

Email Routing 将管理员地址及 catch-all 转交 `mailflare` Worker，由应用解析和分发。发送使用 Cloudflare Email Sending，退信域为 `cf-bounce.alpha-basis.com`，DKIM selector 为 `cf-bounce`。MX、SPF、DKIM、DMARC 均已配置。

初始管理员凭据另行安全交付。首次登录后在账户设置中修改密码、填写恢复邮箱并启用两步验证。首个管理员创建后，公开注册接口关闭。

## 更新

当前采用手动构建发布。不要在未审查的情况下运行上游 Dashboard Update 工作流：其 `git read-tree --reset -u` 会用上游树替换仓库内容，覆盖本仓库部署配置。更新时合并上游改动并保留 `mise.toml`、`wrangler.jsonc` 和本说明，再执行上述构建、迁移和发布流程。

发送额度以公司 Cloudflare Email Sending 控制台为准；部署验收时为每日 200 封。共享邮箱及团队账户功能受上游 Team license 限制。
