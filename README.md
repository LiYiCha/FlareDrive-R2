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

### 2. 部署 Pages 服务

1. Fork 本项目仓库到你的 GitHub
2. 打开 Cloudflare Pages，新建一个站点
3. 点击「连接到 Git」并选择你的仓库
4. 保持默认的构建设置即可，第一次构建不会显示内容，为正常现象

### 3. 配置环境变量

![secret](docs/secret.png)

在 Cloudflare Pages 项目中，进入 **Settings → Environment Variables** 添加以下变量：

| 变量名 | 示例值 | 是否必要 | 说明 |
| --- | --- | --- | --- |
| `PUBURL` | `https://pub-xxx.r2.dev` | ✅ 必填 | R2 公共存储桶地址（自定义域名） |
| `admin:123456` | `*` | ⚠️ 兼容 | 原版管理员配置，格式为 `用户名:密码` |
| `ADMIN_USERNAME` | `admin` | ✅ 推荐 | 新版管理员账号（默认 `admin`） |
| `ADMIN_PASSWORD_HASH` | `8d969eef6ecad...` | ✅ 推荐 | 新版管理员密码的 **SHA-256 哈希值** |
| `JWT_SECRET` | `your_secret_32_chars` | ✅ 必要 | JWT Token 签名密钥，启用 JWT 登录态所用 |
| `GUEST` | `public/` | ❌ 可选 | 游客写入的默认目录 |
| `QUOTA_BYTES` | `10737418240` | ❌ 可选 | 网盘总配额容量（字节，默认 10GB） |
| `TURNSTILE_SITE_KEY` | `0x4AAAAAA...` | ❌ 可选 | Cloudflare Turnstile 验证码 Site Key（开启人机校验） |
| `TURNSTILE_SECRET_KEY`| `0x4AAAAAA...` | ❌ 可选 | Cloudflare Turnstile 验证码 Secret Key |

<p style="color: red !important; font-weight: bold;">
  ⚠️ 请勿开启 R2 存储桶的公开读写权限！否则你的存储资源可能会被恶意刷爆。
</p>

### 4. 绑定 R2 存储桶

部署完成后：

1. 进入 Cloudflare Pages 项目设置
2. 点击「R2 存储桶」
3. 添加一个绑定，变量名填写为：

```
BUCKET
```

并选择你的 R2 存储桶。

### 5. 重新部署项目

完成所有设置后，回到 Pages 控制台，点击「Deployments」页面右上角的「Trigger Redeploy」以重新部署服务。

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


