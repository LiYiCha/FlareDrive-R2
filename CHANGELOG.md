# 更新日志 (Changelog)

所有本项目的版本更新与功能迭代记录都将记录在此文件中。

---

## [v0.1.1] - 2026-06-25 15:28 (GMT+8)

本次更新针对安全性审计（Code Review）中发现的数个高危及重大隐患进行了定向加固，提升了前端 Token 存储的防泄漏能力，修复了 S3 写入代理的兼容性，并提供了完整的本地零配置开发测试套件。

### 🔒 安全加固 (Security)
- **排除默认 JWT 密钥风险 (Critical)**：
  - 彻底移除了 `login.ts` 和 `auth.ts` 中硬编码的默认回退密钥 `"default_jwt_secret_key_123456"`。如果在 Cloudflare 部署或本地调试时未明确配置 `JWT_SECRET`，系统将直接报错或拒绝会话解析，避免了攻击者利用公开密钥伪造 JWT 获取管理员权限的风险。
- **前端同源防泄密校验 (Critical)**：
  - 在 `App.vue` 中对 Axios 请求拦截器与 window.fetch 劫持函数添加了**同源（Same-Origin）校验**。只有发往本网盘后端的请求才会携带 `Authorization: Bearer <Token>` 头部；对于发往第三方 CDN 或外部 API 的请求绝对不携带 Token，彻底封堵了由于引用第三方库/外部资源可能导致的 Token 凭证泄露风险。
- **分片上传全路由鉴权 (Critical)**：
  - 为文件分片合并、分片初始化等 POST 请求（`onRequestPost`）补齐了鉴权检查，避免未登录访客恶意向后端大量初始化垃圾分片。
- **存储桶与 S3 代理防线 (Critical)**：
  - 给 `/api/buckets` (列出桶) 和 `/api/write/s3` (S3代理接口) 增加了最高级别的鉴权限制，防止匿名访问者扫描获取云账号下所有存储桶，或者通过 S3 API 绕过前端直接写入/清空 R2 桶。

### 🐞 缺陷修复 (Bug Fixes)
- **自定义多账号登录逻辑修复 (Major)**：
  - 修复了 `login.ts` 在匹配明文环境变量多账号配置时存在的逻辑 Bug，纠正了比对和提取流程，使除了主 Admin 以外配置了不同 path 权限的普通帐号亦能从网页端正常登录。
- **脆弱下载路径与 HTTP GET 异常修复 (Major)**：
  - 移除了 `raw/[[path]].ts` 中依赖于字符串切割 `url.split("/raw/")` 的逻辑（该逻辑在域名或子文件夹含 "raw" 时会完全崩塌），改用路径指针分析；同时去除了 GET 方法下的 `body` 请求体转发，避免了特定 JS 运行环境抛出 TypeError。
- **S3 路径鉴权兼容修复**：
  - 修复了 S3 代理中由于路径不匹配导致的 401 误阻断问题，重构后会自动切分 R2 的 `bucket_name/key` 结构并验证文件 relative path，确保客户端畅通。
- **安卓前台服务连接溢出释放 (Android)**：
  - 在前台服务 `ForegroundDownloadService.kt` 的 `onDestroy` 中增加了 activeCalls 全连接取消与线程池大块回收，保证后台服务销毁后彻底断开多线程文件下载请求，不会造成后台隐式流量损耗。

### 💻 开发工具与文档 (DevTools & Docs)
- **本地开发环境变量模板 (.dev.vars)**：
  - 新建了根目录下的 `.dev.vars` 文件，预配置了本地 R2 绑定、测试 JWT 秘钥及默认测试密码，使得只需执行 `npm run dev` 即可开箱即用。
- **本地测试调试文档**：
  - 在 `README.md` 中新增了「💻 本地模拟与测试开发」专属章节，详细指导如何执行本地 Pages wrangler 模拟服务，以及在安卓模拟器中配置 `10.0.2.2:8788` 端口进行端到端极速联调。

---

## [v0.1.0] - 2026-06-17 22:12 (GMT+8)

本次更新为大版本迭代，主要新增了 **App 版本多包发布后台**、**安全登录与防爆破验证**、**CDN 深度缓存与请求数节约架构**、以及**配套 Android 独立更新库模块**。

### 🚀 新增功能 (Features)
- **App 更新管理后台 (Admin Update Management)**：
  - 在网盘控制台内置了图形化版本发布看板，允许为同一个应用版本绑定发布多个相关联的安装包（例如：官方原版 APK、注入了 Xposed 模块的免 Root 版 APK、独立 Xposed 插件模块等）。
  - **APK 快速关联与 ETag MD5 提取**：在发布面板关联已上传的 APK 文件时，前端自动提取文件大小并**自动解析 R2 ETag 得到 MD5 校验码**，完全避免了后端或前端为计算哈希而再次读取/下载大文件所造成的流量开销。
- **自定义安全登录框 (Custom JWT Auth)**：
  - 废弃了原生 Basic Auth 的浏览器系统级弹窗，改用全新的**毛玻璃渐变微动效登录对话框**。
  - 支持“记住账号密码”复选框，凭证签名 Session Token (JWT) 分别持久化至 `localStorage`（记住）或 `sessionStorage`（会话内，浏览器关闭即销毁）。
  - 登录弹窗内置“忘记密码”提示，指引管理员登录 Cloudflare 环境变量后台自救。
- **人机安全验证 (Cloudflare Turnstile)**：
  - 支持在登录接口开启 Cloudflare Turnstile 验证码校验，自动拒绝所有没有 Turnstile Token 的爬虫和撞库脚本，保障后台接口不被爆破。
- **IP 级登录频率控制**：
  - 同一个 IP 1分钟内尝试登录失败超过 5 次，将自动封锁 15 分钟，返回 `429 Too Many Requests`。
- **网盘容量统计进度条**：
  - 网盘主界面顶部新增渐变容量进度条（已用 X GB / 共 Y GB）。
- **安卓端独立更新模块 (`:updater`)**：
  - 独立的 Kotlin 安卓库模块，内置异步版本检测、系统通知栏前台断点续传（OkHttp Range 块请求）、SQLite 任务断点同步、子线程 MD5 安全性校验以及适配 Android 7.0~14 的 `FileProvider` 安全调用安装。
  - **零无关依赖设计**：剥离了 Gson、Material、AppCompat 及 ConstraintLayout 等大体量支持库，使用 native view 布局，防网络问题导致编译中断。

### ⚡ 性能与额度优化 (Performance & Savings)
- **容量增量更新**：摒弃了遍历整个存储桶的 O(N) 统计方法，改为在文件上传、分片合并、删除等关键 API 触发时进行**增量加减**运算，写入 R2 统计 JSON；主页加载时读取该 JSON 仅消耗 O(1) 的 R2 读额度。
- **缓存穿透式计数**：在 Worker 内存中进行 Class B 请求累加，分批异步刷入存储，将 Class A 写入操作的调用频率降低了 98%。
- **CDN 静态强缓存拦截**：对于具有游客读取权限（`GUEST`）的公共文件（例如发布的 APK），Worker 返回时注入 `Cache-Control: public, max-age=31536000, immutable`，引导 CDN 边缘拦截重复下载（显示 `CF-Cache-Status: HIT`），完全不消耗 R2 读取次数与出网流量。

### 🔧 变更与调整 (Changes)
- **后端 API 重构**：
  - 新增 `/api/login` 接口。
  - 新增 `/api/config` 接口（导出前端人机校验配置）。
  - 新增 `/api/storage/usage` 与 `/api/storage/recalculate`。
  - 新增 `/api/update`（版本检测，带 CDN 缓存）与 `/api/admin/update/publish`（版本发布与删除）。
  - 调整 `/api/children`、`/api/write/items` 等接口，移除 `WWW-Authenticate` 校验头。
