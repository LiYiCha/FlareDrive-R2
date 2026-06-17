# FlareDrive-R2 App Updater Android 模块集成指南

这是一个专为 Cloudflare Pages + R2 存储平台量身定制的 **Android 原生应用更新模块**。它作为一个完全独立的 Android Library 模块进行打包，提供了轻量、稳定、高兼容性的整套更新方案。

---

## ✨ 功能特性

1. **多包联发 (Release Groups)**：支持一次更新发布中包含多个关联的安装包（如：原版 APK、LSPatch 便携版 APK、Xposed 插件包），用户可在界面中统一查看、按需下载。
2. **断点续传**：基于 OkHttp 并采用 HTTP `Range` 头请求，支持下载暂停、恢复与网络异常重试，有效节约网络带宽与 Cloudflare R2 请求次数。
3. **轻量且低耦**：移除了对重型三方库（如 Gson、AppCompat、Material Design）的依赖，改用原生 Activity 布局、JSON 解析和基础 Ktx，体积极小，避免依赖冲突。
4. **前台服务下载**：采用符合 Android 14 最新规范的前台数据同步服务 (`FOREGROUND_SERVICE_DATA_SYNC`)，并在系统通知栏显示实时进度，防后台杀死。
5. **本地进度缓存**：内置 SQLite 数据库，即便应用退出或手机重启，仍能保留下载进度和状态。
6. **MD5 安全校验**：下载完成后自动比对文件 MD5，防止文件受损或篡改。
7. **全版本安全安装**：利用 `FileProvider` 安全安装 APK，支持并适配 Android 7.0 ~ Android 14+。

---

## 📂 模块结构

```text
updater/
├── build.gradle                # 模块构建配置
├── consumer-rules.pro          # 混淆规则保护
├── proguard-rules.pro          # 混淆配置
└── src/
    └── main/
        ├── AndroidManifest.xml # 自动清单合并配置
        ├── java/com/updater/
        │   ├── Updater.kt      # 更新核心管理入口
        │   ├── db/             # SQLite 本地任务存储
        │   ├── download/       # 前台下载服务 (ForegroundDownloadService)
        │   ├── model/          # 实体数据结构 (UpdateInfo, UpdatePackage)
        │   ├── ui/             # 下载管理 Activity 界面 (DownloadManagerActivity)
        │   └── utils/          # APK 安装与 MD5 校验工具 (ApkInstaller)
        └── res/
            └── xml/
                └── updater_file_paths.xml # FileProvider 路径配置文件
```

---

## 🛠️ 集成步骤

### 第一步：复制模块文件
将整个 `updater` 文件夹直接复制到您的 Android 项目根目录下。

### 第二步：在项目 settings.gradle 中注册模块
打开项目根目录的 `settings.gradle`（或 `settings.gradle.kts`），将 `:updater` 模块引入项目：

**Groovy (settings.gradle)**:
```groovy
include ':app', ':updater'
```

**Kotlin DSL (settings.gradle.kts)**:
```kotlin
include(":app")
include(":updater")
```

### 第三步：在 App 模块中添加依赖
打开您的 App 主模块（一般为 `app/build.gradle` 或 `app/build.gradle.kts`），在 `dependencies` 中添加对更新模块的本地依赖：

**Groovy (app/build.gradle)**:
```groovy
dependencies {
    // 引入更新模块
    implementation project(':updater')
    
    // 确保以下基础依赖也已配置（如果报错，请补齐）
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}
```

**Kotlin DSL (app/build.gradle.kts)**:
```kotlin
dependencies {
    // 引入更新模块
    implementation(project(":updater"))
    
    // 基础依赖
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
```

### 第四步：检查并声明必要权限
为了支持后台下载、通知显示和未知来源应用安装，`updater` 内部已默认在 `AndroidManifest.xml` 中声明了以下权限。

**在您的 App 运行时，您需要引导用户授权这些权限**：
1. **安装未知来源应用权限**（Android 8.0+ / API 26+）：
   当用户点击“安装”时，如果应用未获得安装权限，更新库会**自动**跳转至系统的“允许安装未知来源应用”设置页面，提示用户授权。无需额外编写跳转逻辑。
2. **通知发送权限**（Android 13+ / API 33+）：
   前台下载服务需要向通知栏推送进度。建议您在调用更新前，动态请求通知权限，以免前台通知被系统拦截：
   ```kotlin
   if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
       requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
   }
   ```

### 第五步：FileProvider 动态适配
本模块内置了 `FileProvider`，定义如下：
```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.updater.provider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/updater_file_paths" />
</provider>
```
> [!IMPORTANT]
> 这里的 `authorities` 使用了 `${applicationId}.updater.provider`。
> 只要您的主 `app/build.gradle` 中配置了 `applicationId`，Gradle 在编译合并清单时就会自动替换，无需任何手动修改，能够完美避免同设备多个 App 安装时的 Authority 冲突。

---

## 🚀 代码调用指南

### 1. 自动检测更新并弹出对话框（最简集成）
在您应用的首页 `MainActivity` 或设置页中，构建 `Updater` 并调用检查：

```kotlin
import com.updater.Updater

class MainActivity : Activity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 初始化更新模块
        val updater = Updater.Companion.Builder(this)
            .setBaseHost("https://your-flaredrive-domain.workers.dev") // 部署的 Cloudflare 地址
            .setAppId("com.example.myapp") // 必须与发布管理后台填写的 App ID 一致，默认取 packageName
            .build()

        // 异步检查更新，若有新版则自动弹出对话框
        // 传入当前 Activity 上下文以展示弹窗
        updater.checkAndShowUpdateDialog(this)
    }
}
```

### 2. 自定义检查更新流程（高度自定义）
如果您想自己绘制更新提示 UI，或者在没有新版本时给用户“已是最新版”的提示，可以采用回调方式：

```kotlin
updater.checkUpdate(
    onUpdateAvailable = { updateInfo ->
        // 发现新版本：可以获取版本号、日志等信息
        val latestVer = updateInfo.latestVersionName
        val log = updateInfo.updateLog
        val isForce = updateInfo.isForceUpdate // 是否强更
        
        // 弹出您的自定义 Dialog
        // 如果想在这里跳转到配套下载中心界面，只需调用：
        updater.openDownloadCenter(this, updateInfo)
    },
    onNoUpdate = {
        // 当前已是最新版本
        Toast.makeText(this, "当前已是最新版本！", Toast.LENGTH_SHORT).show()
    },
    onError = { errorMsg ->
        // 检测失败（网络错误、解析错误等）
        Toast.makeText(this, "更新检查失败: $errorMsg", Toast.LENGTH_SHORT).show()
    }
)
```

---

## 🌐 后端数据接口契约

`Updater` 默认向您的 Cloudflare 后端发起 `GET /api/update?app_id={appId}` 请求。

后端返回的成功响应格式如下：
```json
{
  "appId": "com.example.myapp",
  "appName": "我的测试应用",
  "latestVersionCode": 105,
  "latestVersionName": "1.0.5",
  "updateLog": "1. 修复了已知崩溃问题；\n2. 优化了网络请求性能；\n3. 额外提供 LSPatch 模块供高级用户下载。",
  "isForceUpdate": false,
  "lastUpdated": 1718625900000,
  "packages": [
    {
      "packageId": "pkg_original",
      "packageName": "原版 APK 安装包 (直接运行)",
      "versionName": "1.0.5",
      "versionCode": 105,
      "description": "标准的原版官方客户端，适用于大部分普通用户。",
      "downloadUrl": "/api/raw/apks/myapp-v1.0.5.apk",
      "apkSize": 18454912,
      "apkMd5": "a85c8e31a8bc0ef2e0938ff5d023c72b"
    },
    {
      "packageId": "pkg_lspatch",
      "packageName": "LSPatch 免 Root 整合版",
      "versionName": "1.0.5-lsp",
      "versionCode": 105,
      "description": "已嵌入 Xposed 模块的特殊版本，适合免 Root 运行插件。",
      "downloadUrl": "https://r2.yourdomain.com/apks/myapp-v1.0.5-lsp.apk",
      "apkSize": 21454912,
      "apkMd5": "f35c8e31a8bc0ef2e0938ff5d023c7aa"
    }
  ]
}
```

> [!NOTE]
> 1. `downloadUrl` 支持以 `http` 或 `https` 开头的绝对路径，也支持不带域名的相对路径。若为相对路径，更新模块会自动将其拼接为您在 `setBaseHost()` 中配置 of 域名。
> 2. `apkMd5` 为空时，更新模块将跳过 MD5 校验。若不为空，下载完成后会计算本地文件 MD5 并与之对比，校验失败会提示用户重新下载。

---

## 🔒 混淆规则 (Proguard Rules)

如果您的 App 开启了混淆，本模块在打包为 AAR 时会自动带入混淆保护规则。若您是直接引入源码，请在主项目的 `proguard-rules.pro` 中添加以下规则：

```proguard
# 保护实体类不被混淆（防止解析 JSON 和序列化出错）
-keep class com.updater.model.** { *; }

# 保护前台服务与 Activity
-keep class com.updater.download.ForegroundDownloadService { *; }
-keep class com.updater.ui.DownloadManagerActivity { *; }

# 保持 OkHttp 相关的混淆规则
-keepattributes Signature, *Annotation*, InnerClasses
-dontwarn okhttp3.**
-dontwarn okio.**
```
