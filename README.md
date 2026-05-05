# 郑明富纪念馆

Memorializing Father's Life Online.

这是一个纯静态纪念网站，可以直接通过 GitHub Pages 发布。

## 本地查看

直接打开 `index.html` 即可浏览网站。

## 内容管理

- `site-data.js`：网站文字内容，这是网页正式文字的唯一数据源
- `album-data.js`：相册数据
- `images/cover/`：封面和肖像照片
- `images/album/life/`、`images/album/family/`、`images/album/group/`、`images/album/old/`：按类别保存的相册照片
- `admin.html`：本地管理页面，可编辑文字、上传临时照片并导出数据
- `cloudflare-worker/`：点灯和亲友寄语的 Cloudflare D1 数据库后端

注意：`admin.html` 是静态管理工具，没有账号登录和服务器权限。正式公开发布时，可以选择不公开管理员页面，或仅把它作为本地维护工具使用。

访客寄语保存在 Cloudflare D1 数据库中。管理员在 `admin.html` 的“访客寄语管理”里输入本机 `.admin-token.txt` 中的密钥后，可以读取、隐藏、恢复、修改或删除寄语。

以后修改文字时，只改 `site-data.js` 或通过 `admin.html` 导出新的 `site-data.js`。`index.html` 只保留页面结构和加载占位，避免两处文字不一致。

## 点灯和亲友寄语数据库

网站前端会读取 `cloudflare-config.js` 里的 API 地址，当前配置为：

`https://api.mingfu.ccwu.cc`

Cloudflare D1 的建表、部署和自定义域名说明在 `cloudflare-worker/README.md`。

## GitHub Pages 发布

仓库创建后，在 GitHub 仓库页面进入：

`Settings` -> `Pages` -> `Build and deployment` -> `Deploy from a branch`

选择 `main` 分支和 `/ (root)` 目录，然后保存。
