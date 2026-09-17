package com.updater

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.updater.data.UpdateRepository
import com.updater.data.source.StrategyResult
import com.updater.download.DownloadForegroundService
import com.updater.model.UpdateInfo
import com.updater.model.UpdateSource
import com.updater.model.UpdateSourceType
import com.updater.persistence.UpdaterPrefs
import com.updater.ui.DownloadCenterActivity
import com.updater.ui.SourceSettingsActivity
import com.updater.ui.UpdaterThemeConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

/**
 * Updater —— 对外唯一入口（Facade 模式）
 *
 * 外部 API 与原始设计保持一致，内部实现全新架构：
 * - OkHttp + Retrofit + Coroutines/Flow
 * - Strategy 模式网络层
 * - Room + DataStore 持久化
 * - Compose + Material3 UI
 */
class Updater private constructor(
    private val context: Context,
    private val appId: String,
    private val defaultSources: List<UpdateSource>,
    private val themeConfig: UpdaterThemeConfig
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val repository = UpdateRepository()
    private val prefs = UpdaterPrefs(context)
    private val json = Json { encodeDefaults = false }

    init {
        scope.launch {
            prefs.ensureDefaultSources(defaultSources)
        }
    }

    fun getThemeConfig(): UpdaterThemeConfig = themeConfig

    companion object {

        class Builder(private val context: Context) {
            private var appId: String = context.packageName
            private val sources = mutableListOf<UpdateSource>()
            private var defaultSourceId: String = ""
            private var themeConfig = UpdaterThemeConfig()

            fun setAppId(appId: String) = apply { this.appId = appId }

            fun setBaseHost(baseHost: String) = apply {
                addCloudflareSource("Cloudflare 官方源", baseHost, isDefault = true)
            }

            fun addCloudflareSource(
                name: String,
                baseHost: String,
                isDefault: Boolean = false,
                downloadHost: String? = null
            ) = apply {
                val cleanUrl = baseHost.trim().trimEnd('/')
                val id = "cf_${cleanUrl.hashCode()}"
                val source = UpdateSource(
                    id = id,
                    name = name,
                    url = cleanUrl,
                    type = UpdateSourceType.CLOUDFLARE_R2,
                    downloadHost = downloadHost,
                    isPreset = true
                )
                sources.removeAll { it.id == id }
                sources.add(source)
                if (isDefault || defaultSourceId.isEmpty()) defaultSourceId = id
            }

            fun addGitHubSource(
                name: String,
                repoOrUrl: String,
                isDefault: Boolean = false
            ) = apply {
                val cleanUrl = repoOrUrl.trim().trimEnd('/')
                val id = "gh_${cleanUrl.hashCode()}"
                val source = UpdateSource(
                    id = id,
                    name = name,
                    url = cleanUrl,
                    type = UpdateSourceType.GITHUB_RELEASES,
                    isPreset = true
                )
                sources.removeAll { it.id == id }
                sources.add(source)
                if (isDefault || defaultSourceId.isEmpty()) defaultSourceId = id
            }

            fun setDownloadHost(downloadHost: String) = apply {
                if (sources.isNotEmpty()) sources[0] = sources[0].copy(downloadHost = downloadHost)
            }

            fun setCustomDomain(customDomain: String) = setDownloadHost(customDomain)

            fun setThemeConfig(config: UpdaterThemeConfig) = apply { this.themeConfig = config }

            fun build(): Updater {
                check(sources.isNotEmpty()) {
                    "至少需要配置一个更新源（如调用 setBaseHost 或 addGitHubSource）"
                }
                return Updater(
                    context = context.applicationContext,
                    appId = appId,
                    defaultSources = sources,
                    themeConfig = themeConfig
                )
            }
        }
    }

    // --- 公开检查方法 ---

    /**
     * 模式一：启动时自动检查（仅用户开启时触发）
     */
    fun checkUpdateOnStartup(activityContext: Context) {
        scope.launch {
            if (prefs.autoCheckOnStartup.first() != true) return@launch

            val currentVersion = getLocalVersionCode(activityContext)
            checkInternal(activityContext, currentVersion, onShowDialog = true, manual = false)
        }
    }

    /**
     * 模式二：用户手动点击检查
     */
    fun checkUpdateManual(activityContext: Context) {
        Toast.makeText(activityContext, "正在检查更新...", Toast.LENGTH_SHORT).show()
        scope.launch {
            val currentVersion = getLocalVersionCode(activityContext)
            checkInternal(activityContext, currentVersion, onShowDialog = true, manual = true)
        }
    }

    /**
     * 兼容原"静默检查并弹窗"
     */
    fun checkAndShowUpdateDialog(activityContext: Context) {
        scope.launch {
            val currentVersion = getLocalVersionCode(activityContext)
            checkInternal(activityContext, currentVersion, onShowDialog = true, manual = false)
        }
    }

    /**
     * 设置/读取自动检查开关（持久化到 DataStore）
     */
    fun setAutoCheckEnabled(enabled: Boolean) {
        scope.launch { prefs.setAutoCheckOnStartup(enabled) }
    }

    /**
     * 打开更新源设置页
     */
    fun openSourceSettingsDialog(activityContext: Context, onSourceChanged: (() -> Unit)? = null) {
        val intent = Intent(activityContext, SourceSettingsActivity::class.java)
        if (activityContext !is android.app.Activity) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activityContext.startActivity(intent)
    }

    /**
     * 打开下载中心
     */
    fun openDownloadCenter(context: Context, updateInfo: UpdateInfo) {
        scope.launch {
            val sources = prefs.sources.first()
            val currentId = prefs.selectedSourceId.first()
            val currentSource = sources.firstOrNull { s -> s.id == currentId } ?: sources.firstOrNull()

            val jsonStr = json.encodeToString(UpdateInfo.serializer(), updateInfo)

            val intent = Intent(context, DownloadCenterActivity::class.java).apply {
                putExtra("update_info_json", jsonStr)
                putExtra(DownloadCenterActivity.EXTRA_BASE_HOST, currentSource?.url ?: "")
                putExtra(DownloadCenterActivity.EXTRA_DOWNLOAD_HOST, currentSource?.downloadHost)
                if (context !is android.app.Activity) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }

    /**
     * 核心检查方法（暴露给宿主：无 Activity 也能用）
     */
    suspend fun checkUpdate(): Result<UpdateInfo> {
        val sources = prefs.sources.first()
        val currentId = prefs.selectedSourceId.first()

        val source = sources
            .firstOrNull { it.id == currentId }
            ?: sources.firstOrNull()
            ?: return Result.failure(IllegalStateException("未配置有效的更新源"))

        return when (val result = repository.check(appId, source)) {
            is StrategyResult.Success -> Result.success(result.info)
            StrategyResult.NoUpdate -> Result.failure(NoUpdateException())
            is StrategyResult.Error -> Result.failure(Exception(result.message))
        }
    }

    private suspend fun checkInternal(
        activityContext: Context,
        currentVersion: Long,
        onShowDialog: Boolean,
        manual: Boolean
    ) {
        // 用协程的 runCatching（挂起版本）
        val result = kotlin.runCatching { checkUpdate() }
        mainHandler.post {
            val innerResult = result.getOrNull()
            if (innerResult != null && innerResult.isSuccess) {
                val info = innerResult.getOrNull() ?: return@post
                if (info.latestVersionCode > currentVersion.toInt()) {
                    if (onShowDialog) showCompatDialog(activityContext, info)
                } else if (manual) {
                    Toast.makeText(
                        activityContext,
                        "当前已是最新版本 (${info.latestVersionName})",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } else {
                val e = innerResult?.exceptionOrNull() ?: result.exceptionOrNull()
                if (e !is NoUpdateException) {
                    Toast.makeText(activityContext, "检查更新失败: ${e?.message}", Toast.LENGTH_SHORT).show()
                } else if (manual) {
                    Toast.makeText(activityContext, "当前已是最新版本", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showCompatDialog(context: Context, info: UpdateInfo) {
        // 兼容宿主不用 Compose 的场景：用原生 AlertDialog
        android.app.AlertDialog.Builder(context).apply {
            setTitle("发现新版本 v${info.latestVersionName}")
            setMessage(info.updateLog.ifEmpty { "有新的版本发布，点击去查看配套下载列表吧！" })
            setCancelable(!info.isForceUpdate)
            setPositiveButton("立即查看") { dialog, _ ->
                dialog.dismiss()
                openDownloadCenter(context, info)
            }
            if (!info.isForceUpdate) {
                setNegativeButton("稍后再说") { dialog, _ -> dialog.dismiss() }
            }
        }.create().apply {
            if (info.isForceUpdate) setOnCancelListener {
                android.os.Process.killProcess(android.os.Process.myPid())
            }
        }.show()
    }

    private fun getLocalVersionCode(context: Context): Long {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) packageInfo.longVersionCode
            else @Suppress("DEPRECATION") packageInfo.versionCode.toLong()
        } catch (_: Exception) {
            0
        }
    }

    fun destroy() {
        scope.cancel()
    }

    private class NoUpdateException : Exception("no update")
}
