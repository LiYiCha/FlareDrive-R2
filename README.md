## FlareDrive-R2 使用文档

### 🌟 项目简介

FlareDrive-R2 是基于 Cloudflare R2 + Workers 构建的在线网盘系统，支持：
- 文件上传/下载/分享
- 多用户权限管理与目录级访问控制
- 静态文件托管与直链加速
- **网盘前台交互**：空白处右键菜单、定向拖拽上传至目标文件夹/面包屑、PC 拖拽移动与树形弹窗移动
- **独立管理后台**：前后端彻底物理隔离、S3 A/B 类真实操作与流量/访客实时审计流水
- **App 版本管理分发**：支持不同 Android App 在 `update/apk/` 下创建独立子目录、拖拽 APK 自动提取包信息与 MD5，对接客户端更新检查

> 📌 本项目修改自 [Cloudflare-R2-oss](https://github.com/ljxi/Cloudflare-R2-oss)，实现了更加美观的前端页面，本人并不擅长`CF Worker`开发，所以如果有功能方面的需求，请在上游仓库提出。

### 🚀 快速部署

### 前置要求

- Cloudflare 账号
- 已开通 R2 服务

### 部署步骤

### 1. 准备存储桶

前往 Cloudflare R2 控制台：

1. 新建存储桶（建议名称全小写）

   ![QQ_1744351903148](docs/create-bucket.png)

2. 创建完成后，点开设置页面，在存储桶设置中启用「公开访问」

   ![QQ_1744352059947](docs/r2.dev.png)

3. 复制“公共存储桶 URL”，格式如下：

```txt
https://pub-kdsjfhlasnwiuweia4387rfho85tnof4.r2.dev
```

### 2. 部署 Pages 服务

1. Fork 本项目仓库到你的 GitHub
2. 打开 Cloudflare Pages，新建一个站点
3. 点击「连接到 Git」并选择你的仓库
4. 保持默认的构建设置即可，第一次构建不会显示内容，为正常现象

### 3. 配置环境变量 (Environment Variables)

![QQ_1744352357624](docs/secret.png)

在 Cloudflare Pages 项目中，进入 **Settings → Environment Variables** 添加以下变量：

| 变量名 | 示例值 | 是否必要 | 说明 |
| --- | --- | --- | --- |
| `PUBURL` | `https://pub-kdsjfhlasnwiuweia4387rfho85tnof4.r2.dev` | ✅ 必填 | R2 公共存储桶直链地址（支持 r2.dev 或绑定自定义域名） |
| `admin_123456` | `*` | ✅ 必填 | 管理员账号密码与权限，格式统一为 `用户名_密码`，值为 `*`（全局权限） |
| `JWT_SECRET` | `your_random_secret_token_12345` | ✅ 必填 | 登录 Token 签名密钥（用于生成及校验管理员加密 JWT，切勿泄露） |
| `ALLOW_PUBLIC_UPDATE` | `true` 或 `false` | ❌ 可选 | 软件更新目录公开下载开关。**默认 true（允许匿名直链下载）**；设为 `false` 可严禁访客下载更新包（避免被未授权拉取） |
| `GUEST` | `public,share` | ❌ 可选 | 访客免登录公开访问与下载的目录列表（支持逗号分隔，系统内置斜杠自动容错，如 `public` 或 `update`） |
| `PUBLIC_PATHS` | `download,apk` | ❌ 可选 | 补充免鉴权公开直链目录（等同于 GUEST 的只读免登访问白名单，支持逗号分隔） |
| `user1_123456` | `user1/,shared/` | ❌ 可选 | 普通用户及其可读写目录，格式为 `用户名_密码` |
| `CF_ACCOUNT_ID` | `d123456789abcdef` | ❌ 可选 | Cloudflare Account ID（仅用于启用 S3 跨桶高级运维管理） |
| `AWS_ACCESS_KEY_ID` | `r2_s3_token_id` | ❌ 可选 | R2 的 S3 API Access Key ID（配合跨桶高级运维） |
| `AWS_SECRET_ACCESS_KEY` | `r2_s3_token_secret` | ❌ 可选 | R2 的 S3 API Secret Access Key（配合跨桶高级运维） |

<p style="color: red !important; font-weight: bold;">
  ⚠️ 请勿开启 R2 存储桶的公开读写权限！直链下载仅需开启 Public Access (只读)，写入必须走 Worker 鉴权，避免存储资源被恶意刷爆。
</p>

### 4. 绑定存储与数据库 (R2 & KV Bindings)

在 Cloudflare Pages 项目设置中完成以下两项核心绑定：

#### ① 绑定 R2 存储桶 (必需)
1. 进入 Pages 项目设置中的 **Settings → Functions → R2 bucket bindings**；
2. 点击「Add binding」，变量名称统一填写为：
   ```
   BUCKET
   ```
3. 下拉选择您的 R2 存储桶并保存。

#### ② 绑定 KV 数据库命名空间 (强烈推荐)
系统内置了基于 Cloudflare KV 的**防暴力破解安全风控**与**真实 S3 操作指标统计**：
1. 在 Cloudflare 控制台进入 **Storage & Databases → KV**，新建一个命名空间（如 `flaredrive-kv`）；
2. 回到 Pages 项目设置中的 **Settings → Functions → KV namespace bindings**；
3. 点击「Add binding」，变量名称统一填写为：
   ```
   KV
   ```
4. 下拉选择刚才创建的 KV 命名空间。
   - **安全防刷**：登录接口自动开启 IP 级频率限制（密码连续输错 5 次自动封禁该 IP 15 分钟）。
   - **数据看板**：后台自动通过 `_middleware` 异步采集真实的 S3 A 类操作数、S3 B 类操作数、API 请求总数、真实传输流量及最新访客 IP/地域流水（杜绝虚构数据，零延迟开销）。
   - *（注：若未绑定 KV，系统将自动跳过实时计数与防爆破，不影响网盘基本文件上传下载）。*

### 5. 管理后台访问方式 (隐蔽防探查)

系统前台默认完全对普通访客隐藏后台与登录入口，前后台代码彻底物理分离：
1. **独立后台入口**：直接访问 `/admin.html`，未登录时展示全屏独立管理员鉴权中心；登录后解锁完整运维控制台。
2. **暗号访问**：在网盘网址后追加 `?admin=1` 或 `?console=manage` 亦可自动跳转至管理员登录中心。
3. **状态徽标**：点击页面最下方页脚的 `Cloudflare Edge Connected` 状态徽标亦可快速激活登录/进入控制台。
4. **后台核心功能**：
   - **存储用量与全桶校准**：显示存储容量与文件统计，支持一键发起全量重新校准。
   - **真实指标与审计流水**：实时采集 API 请求数、S3 A/B 类操作数、真实传输流量，并以表格展示最近 30 条实时访客 IP、归属地域、请求路径、传输字节与状态码。
   - **防恶意刷量配置**：提供 Cloudflare Edge Cache 与 WAF 规则安全建议。

### 6. 重新部署项目

完成所有设置后，回到 Pages 控制台，点击「Deployments」页面右上角的「Trigger Redeploy」以重新部署服务。

### 7. Android App 版本更新与 APK 目录管理

后台内置了专为 Android 应用程序（如配套的 `updater/` 客户端模块）打造的在线版本发布与 APK 存储分发中心：

1. **不同 APK 独立子目录管理**：
   - 为避免不同应用的 APK 混在根目录导致命名冲突或文件混乱，系统默认在 `update/apk/{appId}/` 下为各个应用单独建立专属子目录（例如 `update/apk/com.example.app/`）。
   - 每个应用可关联多个不同构架或特性的安装包（如官方原版、Xposed 模块版、arm64-v8a 架构包等），各安装包还支持指定「包独立子目录」（如 `v2.0`、`arm64`），实现多层级规范归档。
2. **拖拽上传与智能解析**：
   - 在安装包卡片直接拖入或选择 `.apk` 文件，系统自动异步上传至指定子目录下。
   - 自动提取文件名、计算文件大小及 MD5 哈希校验码，并自动生成 `/raw/update/apk/...` 标准直链地址。
3. **客户端检查更新接口**：
   - 请求地址：`GET /api/update?app_id={your_app_id}`（同时兼容 `GET /api/update/check?appId={your_app_id}`）
   - 返回最新版本号、Version Code、更新日志、是否强制更新以及各关联安装包的直链与 MD5 校验值。
4. **下载鉴权与环境变量控制 (解决 401 权限问题)**：
   - 默认策略：更新安装包（`/raw/update/...`）**默认开启免登录公开下载**与 CDN 强缓存加速，终端 App 可即刻静默检测与断点续传。
   - 环境变量开关：在 Cloudflare Pages 设置环境变量 `ALLOW_PUBLIC_UPDATE = false` 可一键关闭自动公开；关闭后可通过 `GUEST = update` 或 `PUBLIC_PATHS = update` 独立管控白名单。
   - 容错规范化：系统已内置斜杠自动规范化，无论在环境变量写 `update`、`/update` 还是 `/update/` 均能精准识别，彻底告别 401 鉴权拦截。
5. **版本说明富文本 Markdown 渲染**：
   - 发布更新时的「更新日志/版本说明」全面支持标准 Markdown 语法（标题、加粗、斜体、列表、代码块与超链接）。
   - 配套的 Android `updater` 客户端内置了 `MarkdownUtils`，在系统更新弹窗与下载管理中心内直接以富文本原生呈现，超链接支持原生点击跳转浏览器。

### ⚙️ 自定义配置

#### 前端样式修改

由于 Wrangler 部署无法使用传统环境变量注入，我偷懒了，不想写环境变量，但是仍然可以简单的进行修改，请直接修改以下文件：

1. **背景图片**  
   修改文件：`assets/App.vue`  
   
   ```vue
   // 约第 213 行
   export default {
     data: () => ({
       ...
       backgroundImageUrl: "/assets/bg-light.webp"
     }),
   }
   ```
   
2. **页脚链接**  
   修改文件：`assets/Footer.vue`  
   
   ```html
   // 约第四十行
   <script>
   export default {
     name: "Footer",
     data() {
       return {
         homeUrl: "https://www.liushen.fun/",
         blogUrl: "https://blog.liushen.fun/",
         githubUrl: "https://github.com/willow-god",
         emailUrl: "mailto:01@liushen.fun"
       };
     }
   };
   </script>
   ```

#### 权限配置技巧

- 使用 `*` 作为值表示拥有所有目录权限
- 目录名必须以 `/` 结尾
- 避免在值的前后添加多余逗号（如 `,dir1/,` 会错误授予全部权限）

#### 网盘前台操作特性

- **空白处右键菜单**：在文件列表空白区域点击右键，呼出操作面板（📸拍照上传、🖼️图片/视频、📄其他文件、📁新建文件夹、🔄刷新、📋粘贴）。
- **定向拖拽上传**：本地文件直接拖拽悬停至目标文件夹卡片或顶部面包屑路径上释放，即可直接上传至该目标子目录。
- **文件移动双模式**：
  - PC 端拖拽文件卡片悬停至目标文件夹后释放即可快速移动。
  - 触屏端或点击菜单中的「移动」，可在弹窗中点选目标文件夹确认移动。

### 🔧 故障排查

1. 文件上传失败：
   - 检查 R2 存储桶是否已绑定
   - 确认用户有目标目录的写入权限

2. 样式未更新：
   - 清除浏览器缓存
   - 确认修改已提交并重新部署
