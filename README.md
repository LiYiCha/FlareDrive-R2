## FlareDrive-R2 使用文档

### 🌟 项目简介

FlareDrive-R2 是基于 Cloudflare R2 + Workers 构建的在线网盘系统，支持：
- 文件上传/下载/分享
- 多用户权限管理
- 目录级访问控制
- 静态文件托管

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

### 3. 配置环境变量

![QQ_1744352357624](docs/secret.png)

在 Cloudflare Pages 项目中，进入 **Settings → Environment Variables** 添加以下变量：

| 变量名         | 示例值                                                | 是否必要 | 说明                                           |
| -------------- | ----------------------------------------------------- | -------- | ---------------------------------------------- |
| `PUBURL`       | `https://pub-kdsjfhlasnwiuweia4387rfho85tnof4.r2.dev` | ✅ 必填   | R2 公共存储桶地址                              |
| `admin:123456` | `*`                                                   | ✅ 必填   | 管理员账号，格式为 `用户名:密码`               |
| `GUEST`        | `public/`                                             | ❌ 可选   | 游客写入的默认目录                             |
| `user1:123456` | `user1/,shared/`                                      | ❌ 可选   | 普通用户及其可写入目录，支持多个目录，格式一致 |

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

### 🔧 故障排查

1. 文件上传失败：
   - 检查 R2 存储桶是否已绑定
   - 确认用户有目标目录的写入权限

2. 样式未更新：
   - 清除浏览器缓存
   - 确认修改已提交并重新部署

---

### 🌐 域名配置与绑定指南（重要）

1. **网盘前端与管理后台域名（Pages 自定义域）**：
   - 在 Cloudflare Pages 项目的 **Custom domains (自定义域)** 中绑定你的访问域名（如 `cicha.de5.net`）。
   - 绑定后，浏览器直接打开 `https://cicha.de5.net` 即可访问网盘完整功能。

2. **R2 存储桶直链域名（PUBURL 配置）**：
   - ⚠️ **切勿将同一个域名（如 `cicha.de5.net`）同时绑定到 R2 存储桶**，否则会导致 DNS 解析冲突覆盖 Pages 服务！
   - 如果需要为 R2 开启独立的直链加速域名，请分配一个**不同的子域名**（例如 `r2.de5.net` 或 `file.de5.net`）绑定到 R2 存储桶的「自定义域」中；
   - 此时在 Pages 环境变量中将 `PUBURL` 设置为该独立域名（如 `https://r2.de5.net`）；
   - **简便省心模式**：如果不配置独立的 R2 自定义域名，可直接使用 R2 生成的公共开发 URL（`https://pub-xxx.r2.dev`）填入 `PUBURL`，系统已内置断点续传与 CDN 加速回退。

---

### 📱 安卓端版本更新模块集成 (`:updater`)

本项目附带了原生 Android 更新模块，支持多源配置（Cloudflare R2 + GitHub Releases）与启动/点击更新模式记忆。

1. **在网盘中发布新版本**：
   - 管理员登录网盘后台，上传 APK 文件至允许公开访问的目录（如 `public/`）；
   - 进入后台「应用更新管理」面板，输入版本信息并选择该 APK，点击发布即可全球生效。

2. **Android 客户端调用**：
   ```kotlin
   val updater = com.updater.Updater.Companion.Builder(context)
       .setAppId("your.package.name")
       // 优先使用 Cloudflare Pages 网盘源
       .addCloudflareSource("官方节点", "https://cicha.de5.net", isDefault = true)
       // 备用 GitHub Releases 源
       .addGitHubSource("GitHub 节点", "https://github.com/LiYiCha/Sesame-TK")
       .build()

   // 启动时静默检查（根据用户设置自动判断，默认关闭）：
   updater.checkUpdateOnStartup(this)

   // 用户手动点击检查更新：
   updater.checkUpdateManual(this)
   ```


