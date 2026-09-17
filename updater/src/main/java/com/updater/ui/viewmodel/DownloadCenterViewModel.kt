package com.updater.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
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
 * 职责：
 * 1. 根据 UpdateInfo 创建/恢复下载任务
 * 2. 暴露 tasks StateFlow 给 UI 观察
 * 3. 处理下载按钮点击事件
 */
class DownloadCenterViewModel(app: Application) : AndroidViewModel(app) {

    private val engine = DownloadEngine(app)
    private val dao = DownloadDatabase.getInstance(app).downloadTaskDao()

    // engine.tasks 是 StateFlow<Map<String, DownloadTask>> → 转换为 StateFlow<List<DownloadTask>>
    val tasks: StateFlow<List<DownloadTask>> = engine.tasks
        .map { it.values.toList() }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    private val _event = MutableStateFlow<UiEvent?>(null)
    val event: StateFlow<UiEvent?> = _event.asStateFlow()

    // --- 初始化 ---

    fun init(updateInfo: UpdateInfo, baseHost: String?, downloadHost: String?) {
        engine.init()
        viewModelScope.launch {
            // 为每个 package 创建/恢复 DownloadTask
            val apkDir = File(getApplication<Application>().getExternalFilesDir(null) ?: getApplication<Application>().filesDir, "apks")
            apkDir.mkdirs()

            for (pkg in updateInfo.packages) {
                val url = UrlUtils.resolveDownloadUrl(pkg.downloadUrl, baseHost, downloadHost)
                val taskId = UrlUtils.urlMd5(url)

                var task = dao.getById(taskId)?.toDomain()

                if (task == null) {
                    // 新任务
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
                    // 恢复任务：如果完成但文件丢了 → 重置
                    val file = File(task.savePath)
                    if (task.status == DownloadStatus.COMPLETED && !file.exists()) {
                        task = task.copy(status = DownloadStatus.PENDING, downloadedBytes = 0)
                    }
                }

                engine.registerTask(task)
            }
        }
    }

    // --- 交互 ---

    fun onAction(task: DownloadTask) {
        viewModelScope.launch {
            when (task.status) {
                DownloadStatus.PENDING, DownloadStatus.PAUSED, DownloadStatus.FAILED -> {
                    // 单任务限制：如果已有其他任务在下载，不允许
                    val currentDownloading = engine.tasks.value.values.find {
                        it.status == DownloadStatus.DOWNLOADING && it.id != task.id
                    }
                    if (currentDownloading != null) {
                        _event.value = UiEvent.ShowToast("已有任务【${currentDownloading.title}】正在下载中")
                        return@launch
                    }
                    engine.startDownload(task.id)
                }
                DownloadStatus.DOWNLOADING -> engine.pauseDownload(task.id)
                DownloadStatus.COMPLETED -> {
                    // 安装 APK
                    ApkInstaller.install(getApplication(), File(task.savePath))
                }
            }
        }
    }

    fun onDelete(task: DownloadTask) {
        viewModelScope.launch {
            engine.deleteTask(task.id)
        }
    }

    override fun onCleared() {
        super.onCleared()
        engine.destroy()
    }
}

sealed class UiEvent {
    data class ShowToast(val message: String) : UiEvent()
}
