## FlareDrive-R2 使用文档

### 🌟 项目简介

FlareDrive-R2 是基于 Cloudflare R2 + Workers 构建的在线网盘系统，支持：
- 文件上传/下载/分享
- 多用户权限管理
- 目录级访问控制
- 静态文件托管
- **新增：App 版本多包发布及更新管理后台**
- **新增：配套本地 Android 端更新库模块**

> 📌 本项目修改自 [Cloudflare-R2-oss](https://github.com/willow-god/FlareDrive-R2)，实现了一些特征功能。

### 🚀 快速部署

### 前置要求

- Cloudflare 账号
- 已开通 R2 服务

### 部署步骤

### 1. 准备存储桶

前往 Cloudflare R2 控制台：

1. 新建存储桶（建议名称全小写）

   ![create-bucket](docs/create-bucket.png)

2. 创建完成后，点开设置页面，在存储桶设置中启用「公开访问」

   ![r2.dev](docs/r2.dev.png)

3. 复制“公共存储桶 URL”，格式如下：

   ```txt
   https://pub-kdsjfhlasnwiuweia4387rfho85tnof4.r2.dev
   ```

### 2. 部署到 Cloudflare Pages

> 💡 **为什么是 Pages 而不是 Worker？**  
> 本项目是 **Pages Full-Stack (Jamstack + Functions)** 架构：静态前端（HTML/Vue/CSS）与后端 API（`functions/` 目录云函数）深度整合。Cloudflare Pages 会自动分发静态文件到全球 CDN 并编译后端 API 路由。若部署为纯 Worker，将无法直接托管前端网页。

1. **推送代码到 GitHub**：将本项目推送到你个人的 GitHub 仓库（公开或私有均可）。
2. **连接 GitHub 到 Cloudflare**：
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
   - 点击左侧导航栏 **Workers 和 Pages (Workers & Pages)** -> **创建 (Create application)** -> 选择 **Pages** 选项卡。
   - 点击 **连接到 Git (Connect to Git)**，授权并选中你的 GitHub 仓库。
3. **构建设置（Build Settings）**：
   - **Framework preset (框架预设)**：选择 `None`（无）
   - **Build command (构建命令)**：**完全留空，不需要填任何命令**
   - **Build output directory (构建输出目录)**：填 `/` 或 `.`（即当前仓库根目录）
   - 点击 **保存并部署 (Save and Deploy)**。

### 3. 配置环境变量

进入已创建的 Pages 项目 -> **设置 (Settings)** -> **环境变量 (Environment variables)**，添加以下变量：

| 变量名 | 示例值 | 是否必要 | 说明 |
| :--- | :--- | :--- | :--- |
| `GUEST` | `*` 或 `apks,public` | ⚠️ **更新必备** | **访客公开读取白名单**。若提供安卓端免登更新下载，必须设为 `*` 或包含你的 APK 目录（如 `apks`），否则安卓下载会报 401 权限不足！ |
| `PUBURL` | `https://pub-xxx.r2.dev` | ❌ 可选 | R2 公共存储桶直链或自定义下载域名。未配置时系统会自动回退直连 R2 存储桶并支持 Range 断点续传 |
| `ADMIN_USERNAME` | `admin` | ✅ 推荐 | 新版管理员账号（默认 `admin`） |
| `ADMIN_PASSWORD_HASH` | `8d969eef6ecad...` | ✅ 推荐 | 新版管理员密码的 **SHA-256 哈希值**（如明文 123456 的哈希） |
| `JWT_SECRET` | `your_secret_32_chars` | ✅ 必要 | JWT Token 签名密钥，长度建议不少于 32 位 |
| `QUOTA_BYTES` | `10737418240` | ❌ 可选 | 网盘总配额容量（字节，默认 10GB） |
| `TURNSTILE_SITE_KEY` | `0x4AAAAAA...` | ❌ 可选 | Cloudflare Turnstile 验证码 Site Key（开启人机校验） |
| `TURNSTILE_SECRET_KEY`| `0x4AAAAAA...` | ❌ 可选 | Cloudflare Turnstile 验证码 Secret Key |

### 4. 绑定 R2 存储桶

进入 Pages 项目设置：
1. 点击 **设置 (Settings)** -> **函数 (Functions)**。
2. 找到 **R2 存储桶绑定 (R2 bucket bindings)**，点击 **添加绑定 (Add binding)**。
3. **变量名称 (Variable name)** 严格填写为：
   ```txt
   BUCKET
   ```
4. **R2 存储桶** 下拉选中你第 1 步创建好的存储桶。

### 5. 绑定自定义域名（强烈推荐，国内访问极速）

> ⚠️ **强烈提醒**：Cloudflare 默认分配的 `*.pages.dev` 与 `*.r2.dev` 域名在国内部分地区和运营商存在 SNI 阻断与连接限制。强烈建议绑定自己的域名！

1. 进入 Pages 项目页面，点击 **自定义域 (Custom domains)** 选项卡。
2. 点击 **设置自定义域 (Set up a custom domain)**，输入你的二级域名（例如 `pan.yourdomain.com`）。
3. Cloudflare 会自动完成 DNS 记录添加并自动配置终身免费的 SSL/HTTPS 证书。
4. 在安卓端初始化 Updater 时，直接将 `baseHost` 传入此自定义域名即可享受极速 CDN 下载体验！

### 6. 重新部署生效

完成环境变量配置和 R2 绑定后：进入 Pages 控制台中的 **Deployments** 页面，在最近一次构建记录右侧点击 `...` -> **重试部署 (Retry deployment)**，即可让所有配置立即生效。

---

### 💻 本地模拟与测试开发

如果您想在本地运行项目进行功能测试或二次开发，请按照以下步骤操作：

1. **安装依赖**：
   确保本地安装了 Node.js 环境，在项目根目录下执行安装依赖：
   ```bash
   npm install
   ```

2. **配置本地开发环境变量**：
   在项目根目录下新建一个名为 `.dev.vars` 的文件，写入您的本地测试环境变量（Wrangler 本地运行时会自动加载此文件）：
   ```txt
   PUBURL=http://localhost:8788
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
   JWT_SECRET=local_jwt_secret_key_1234567890
   ```
   > 📌 上述哈希密码对应明文 `123456`。

3. **启动本地开发服务器**：
   在根目录下运行以下命令：
   ```bash
   npm run dev
   ```
   该命令会自动启动 `wrangler pages dev`，在本地 `http://localhost:8788` 模拟 Pages 环境，并自动在本地绑定名为 `BUCKET` 的本地模拟 R2 存储桶。

4. **进行测试**：
   * 打开浏览器访问 `http://localhost:8788` 即可调试 Vue 网页控制台。
   * 管理员登录，上传 APK，在应用更新面板发布更新，提取 MD5 进行测试。
   * 安卓端调用更新时，若使用安卓模拟器测试，可以将 Host 设为 `.setBaseHost("http://10.0.2.2:8788")`（在安卓模拟器中指向开发主机的 `localhost:8788`）即可直接进行真机/模拟器本地联调测试。

---

### 📱 安卓端更新模块集成 (`:updater`)

项目附带了一个独立的 Kotlin 安卓库模块 `:updater`。

1. **引入模块**：在您 Android 项目的 `settings.gradle` 中加入：
   ```gradle
   include ':updater'
   ```
2. **添加依赖**：在您宿主 App 的 `build.gradle` 中加入：
   ```gradle
   implementation project(':updater')
   ```
3. **调用更新**：
   ```kotlin
   com.updater.Updater.Builder(context)
       .setBaseHost("https://your-flaredrive-domain.com") // 您的网盘公开域名
       .setAppId("your.package.name") // 宿主 App 包名
       .build()
       .checkAndShowUpdateDialog(this)
   ```

---

### ⚙️ 自定义配置

#### 前端样式修改

请直接修改以下文件：

1. **背景图片**  
   修改文件：`assets/App.vue`  
   ```vue
   backgroundImageUrl: "/assets/bg-light.webp"
   ```
   
2. **页脚链接**  
   修改文件：`assets/Footer.vue`  
   ```html
   homeUrl: "https://www.liushen.fun/",
   blogUrl: "https://blog.liushen.fun/"
   ```

---


