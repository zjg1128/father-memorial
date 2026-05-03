# 永久保存发布流程

这套工具会把纪念网站保存到两个长期存储层：

- IPFS：通过 Pinata pinning 固定网站目录，得到一个 CID。
- Arweave：通过 ArDrive Turbo 把完整网站 ZIP 永久上传到 Arweave。

## 1. 安装依赖

```powershell
npm install
```

## 2. 生成永久归档包

```powershell
npm run archive:permanent
```

生成内容：

- `permanent-output/site/`：准备上传的网站目录
- `permanent-output/father-memorial-site.zip`：完整网站压缩包
- `permanent-output/manifest.json`：归档时间、SHA256、来源等信息

如果你更喜欢 PowerShell，也可以运行：

```powershell
powershell -ExecutionPolicy Bypass -File tools/permanent/create-archive.ps1
```

## 3. Pin 到 IPFS

在 Pinata 创建 API JWT 后执行：

```powershell
$env:PINATA_JWT="你的 Pinata JWT"
npm run pin:ipfs
```

成功后会生成：

- `permanent-output/ipfs-pinata-result.json`

里面包含：

- `IpfsHash`：IPFS CID
- `gatewayUrl`：公共网关访问地址
- `pinataGatewayUrl`：Pinata 网关访问地址

## 4. 上传到 Arweave

准备一个 Arweave JWK 钱包文件，并确保它能使用 ArDrive Turbo 上传。然后执行：

```powershell
$env:ARWEAVE_WALLET_FILE="D:\path\to\arweave-wallet.json"
npm run upload:arweave
```

成功后会生成：

- `permanent-output/arweave-turbo-result.json`

里面包含：

- `id`：Arweave 交易 / data item ID
- `arweaveUrl`：永久访问地址

## 重要提醒

- 不要把 `PINATA_JWT`、Arweave 钱包文件、`.env` 上传到 GitHub。
- IPFS 的“长期可访问”依赖 pinning 服务持续固定内容，建议至少使用两个 pinning 服务或自己运行一个 IPFS 节点。
- Arweave 是一次付费、长期保存，适合保存 `father-memorial-site.zip` 这种完整归档。
- 上传完成后，把 `ipfs-pinata-result.json` 和 `arweave-turbo-result.json` 里的地址另存到家人能看到的位置。

## 参考文档

- Arweave / ar.io Upload Data: https://docs.arweave.net/build/upload
- Turbo SDK: https://docs.ar.io/sdks/turbo-sdk
- Pinata Pin File to IPFS: https://docs.pinata.cloud/api-reference/endpoint/ipfs/pin-file-to-ipfs
- IPFS Pinning: https://docs.ipfs.tech/quickstart/pin/
