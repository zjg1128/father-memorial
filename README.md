# 郑明富纪念馆

Memorializing Father's Life Online.

这是一个纯静态纪念网站，可以直接通过 GitHub Pages 发布。

## 本地查看

直接打开 `index.html` 即可浏览网站。

## 内容管理

- `site-data.js`：网站文字内容
- `album-data.js`：相册数据
- `images/`：照片文件
- `admin.html`：本地管理页面，可编辑文字、上传临时照片并导出数据

注意：`admin.html` 是静态管理工具，没有账号登录和服务器权限。正式公开发布时，可以选择不公开管理员页面，或仅把它作为本地维护工具使用。

## GitHub Pages 发布

仓库创建后，在 GitHub 仓库页面进入：

`Settings` -> `Pages` -> `Build and deployment` -> `Deploy from a branch`

选择 `main` 分支和 `/ (root)` 目录，然后保存。
