# Cloudflare D1 数据库

这里是纪念网站“点一盏思念”和“亲友寄语”的 Cloudflare Worker + D1 后端。访客不用登录 GitHub，直接在网页上点灯和留言。

## 部署步骤

1. 登录 Cloudflare：

```bash
npx wrangler login
```

2. 创建 D1 数据库：

```bash
npx wrangler d1 create father_memorial
```

把命令输出中的 `database_id` 填入 `cloudflare-worker/wrangler.toml`，替换 `REPLACE_WITH_D1_DATABASE_ID`。

3. 创建数据表：

```bash
npx wrangler d1 execute father_memorial --config cloudflare-worker/wrangler.toml --remote --file=cloudflare-worker/schema.sql
```

4. 设置限流盐值，用于匿名防刷：

```bash
npx wrangler secret put RATE_LIMIT_SALT --config cloudflare-worker/wrangler.toml
```

5. 部署 Worker：

```bash
npx wrangler deploy --config cloudflare-worker/wrangler.toml
```

6. 在 Cloudflare Worker 里绑定自定义域名：

```text
api.mingfu.ccwu.cc
```

如果最终 API 域名不是 `https://api.mingfu.ccwu.cc`，请同步修改网站根目录的 `cloudflare-config.js`。

## 本地测试

```bash
npx wrangler dev --config cloudflare-worker/wrangler.toml
```

本地启动后，可临时把 `cloudflare-config.js` 改成 Wrangler 提供的本地地址进行测试。
