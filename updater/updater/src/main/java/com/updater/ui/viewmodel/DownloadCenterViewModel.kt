package com.updater.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.updater.Updater
import com.updater.data.UpdateRepository
import com.updater.download.DownloadEngine
import com.updater.install.ApkInstaller
import com.updater.model.DownloadStatus
import com.updater.model.DownloadTask
import com.updater.model.UpdateInfo
import com.updater.persistence.db.DownloadDatabase
import com.updater.utils.UrlUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

/**
 * 下载中心 ViewModel
 *
 * - init(updateInfo) 根据传入的 UpdateInfo 创建/恢复任务
 * - refresh() 重新联网检查 → 对比旧任务 → 增/删/保留
 * - onClearLocal() 清本地 APK 文件，保留任务条目（可重新下载）
 */
class DownloadCenterViewModel(app: Application) : AndroidViewModel(app) {

    private val engine = DownloadEngine(app)
    private val dao = DownloadDatabase.getInstance(app).downloadTaskDao()
    private val repository = UpdateRepository()

    val tasks: StateFlow<List<DownloadTask>> = engine.tasks
        .map { it.values.toList() }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    private val _event = MutableStateFlow<UiEvent?>(null)
    val event: StateFlow<UiEvent?> = _event.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private var baseHost: String? = null
    private var downloadHost: String? = null

    // --- 初始化 ---

    fun init(updateInfo: UpdateInfo, baseHost: String?, downloadHost: String?) {
        this.baseHost = baseHost
        this.downloadHost = downloadHost
        engine.init()
        applyUpdateInfo(updateInfo)
    }

    /**
     * 根据 UpdateInfo 同步任务列表：
     * - 新 package → 创建 PENDING 任务
     * - 已有 → 保留现有状态（已下载的继续 COMPLETED）
     * - 不在新 UpdateInfo 里的旧任务 → 真正移除（远程包下架了）
     */
    private fun applyUpdateInfo(updateInfo: UpdateInfo) {
        viewModelScope.launch {
            val apkDir = File(
                getApplication<Application>().getExternalFilesDir(null)
                    ?: getApplication<Application>().filesDir, "apks"
            )
            apkDir.mkdirs()

            val incomingIds = mutableSetOf<String>()

            for (pkg in updateInfo.packages) {
                val url = UrlUtils.resolveDownloadUrl(pkg.downloadUrl, baseHost, downloadHost)
                val taskId = UrlUtils.urlMd5(url)
                incomingIds.add(taskId)

                var task = dao.getById(taskId)?.toDomain()

                if (task == null) {
                    val cleanUrl = pkg.downloadUrl.substringBefore("?")
                    val rawFileName = cleanUrl.substringAfterLast("/").ifEmpty { "app_${pkg.packageId}.apk" }
                    val fileName = if (rawFileName.endsWith(".apk", ignoreCase = true)) rawFileName else "$rawFileName.apk"
                    val saveFile = File(apkDir, fileName)

                    task = DownloadTask(
                        id = taskId,
                        url = url,
                        savePath = saveFile.absolutePath,
                        title = pkg.packageName,
                        totalBytes = pkg.apkSize,
                        downloadedBytes = 0,
                        status = DownloadStatus.PENDING,
                        fileMd5 = pkg.apkMd5
                    )
                } else {
                    // 恢复：完成但文件丢了 → 重置
                    val file = File(task.savePath)
                    if (task.status == DownloadStatus.COMPLETED && !file.exists()) {
                        task = task.copy(status = DownloadStatus.PENDING, downloadedBytes = 0, errorMessage = null)
                    }
                }

                engine.registerTask(task)
            }

            // 远程包下架了 → 真正移除
            val staleIds = engine.tasks.value.keys - incomingIds
            staleIds.forEach { engine.removeTask(it) }
        }
    }

    // --- 刷新（重新联网检查） ---

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            runCatching {
                val updater = Updater.instance
                updater.checkUpdate()
            }.onSuccess { result ->
                result.fold(
                    onSuccess = { info ->
                        applyUpdateInfo(info)
                        _event.value = UiEvent.ShowToast("已更新到 v${info.latestVersionName}")
                    },
                    onFailure = { e ->
                        _event.value = UiEvent.ShowToast("已是最新版本")
                    }
                )
            }.onFailure { e ->
                _event.value = UiEvent.ShowToast("检查更新失败")
            }
            _isRefreshing.value = false
        }
    }

    // --- 交互 ---

    fun onAction(task: DownloadTask) {
        viewModelScope.launch {
            when (task.status) {
                DownloadStatus.PENDING, DownloadStatus.PAUSED, DownloadStatus.FAILED -> {
                    val currentDownloading = engine.tasks.value.values.find {
                        it.status == DownloadStatus.DOWNLOADING && it.id != task.id
                    }
                    if (currentDownloading != null) {
                        _event.value = UiEvent.ShowToast("已有任务在下载中")
                        return@launch
                    }
                    engine.startDownload(task.id)
                }
                DownloadStatus.DOWNLOADING -> engine.pauseDownload(task.id)
                DownloadStatus.COMPLETED -> {
                    ApkInstaller.install(getApplication(), File(task.savePath))
                }
            }
        }
    }

    /** 清除本地已下载的数据（保留任务条目，可重新下载） */
    fun onClearLocal(task: DownloadTask) {
        engine.clearLocalData(task.id)
        _event.value = UiEvent.ShowToast("已清除本地下载数据")
    }

    override fun onCleared() {
        super.onCleared()
        engine.destroy()
    }
}

sealed class UiEvent {
    data class ShowToast(val message: String) : UiEvent()
}
