package com.updater.download

import android.content.Context
import com.updater.model.DownloadStatus
import com.updater.model.DownloadTask
import com.updater.persistence.db.DownloadDatabase
import com.updater.persistence.db.DownloadTaskEntity
import com.updater.utils.FileUtils
import com.updater.utils.Network
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.Request
import java.io.File
import java.io.RandomAccessFile

/**
 * 下载引擎 —— 协程驱动的状态机
 *
 * 替代原 ForegroundDownloadService 里手动 new Call + Callback 的做法
 * - 单任务顺序执行（保留原设计的"不并发"语义，避免 R2 额外请求费）
 * - 断点续传（HTTP Range）
 * - 进度持久化到 Room
 * - 暴露 StateFlow 供 UI 层观察
 */
class DownloadEngine(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val dao = DownloadDatabase.getInstance(context).downloadTaskDao()

    // 所有任务状态：id → DownloadTask
    private val _tasks = MutableStateFlow<Map<String, DownloadTask>>(emptyMap())
    val tasks: StateFlow<Map<String, DownloadTask>> = _tasks.asStateFlow()

    // 当前正在下载的任务 id
    private val _currentDownloading = MutableStateFlow<String?>(null)
    val currentDownloading: StateFlow<String?> = _currentDownloading.asStateFlow()

    // 供 Service 观察的通知栏事件（可选）
    private val _notificationEvents = MutableStateFlow<NotificationEvent?>(null)
    val notificationEvents: StateFlow<NotificationEvent?> = _notificationEvents.asStateFlow()

    private val client get() = Network.okHttpClient

    // --- 生命周期 ---

    fun init() {
        scope.launch {
            // 从 Room 恢复所有已持久化任务
            dao.getAll().forEach { entity ->
                val domain = entity.toDomain()
                // 之前在下载/暂停中的，如果文件丢了或完成了但文件不存在 → 重置为 PENDING
                val final = when {
                    (domain.status == DownloadStatus.COMPLETED || domain.status == DownloadStatus.FAILED)
                        && !File(domain.savePath).exists() -> domain.copy(
                        status = DownloadStatus.PENDING,
                        downloadedBytes = 0
                    )
                    else -> domain
                }
                _tasks.value = _tasks.value + (final.id to final)
            }
        }
    }

    fun destroy() {
        scope.cancel()
    }

    // --- 任务管理 ---

    /**
     * 注册（或更新）一个下载任务 —— 由 Facade 在创建任务时调用
     */
    fun registerTask(task: DownloadTask) {
        scope.launch {
            _tasks.value = _tasks.value + (task.id to task)
            dao.upsert(DownloadTaskEntity.from(task))
        }
    }

    fun deleteTask(id: String) {
        scope.launch {
            val current = _tasks.value[id] ?: return@launch
            if (current.status == DownloadStatus.DOWNLOADING) {
                // 正在下载的，先 cancel（通过暂停机制）
                cancelCurrent()
            }
            // 删除文件
            File(current.savePath).delete()
            // 删除持久化
            dao.delete(id)
            _tasks.value = _tasks.value - id
        }
    }

    /**
     * 启动下载 —— 通过 Service 调用，或直接调用
     */
    suspend fun startDownload(id: String) {
        val task = _tasks.value[id] ?: return
        if (task.status == DownloadStatus.DOWNLOADING) return
        // 单任务：如果正在下载其他的，不允许
        if (_currentDownloading.value != null && _currentDownloading.value != id) return

        _currentDownloading.value = id
        updateTask(id, status = DownloadStatus.DOWNLOADING)

        runDownload(task)
    }

    /**
     * 暂停当前下载
     */
    suspend fun pauseDownload(id: String) {
        val task = _tasks.value[id] ?: return
        if (task.status != DownloadStatus.DOWNLOADING) return
        cancelCurrent()
        updateTask(id, status = DownloadStatus.PAUSED)
    }

    private suspend fun cancelCurrent() {
        // 通过 OkHttp Call cancel 中断下载 —— 在 runDownload 里会判断 isCanceled()
        // 这里用一个标记位让 runDownload 循环退出
        cancelRequested = true
    }

    // --- 核心下载循环 ---

    @Volatile
    private var cancelRequested = false

    private suspend fun runDownload(initialTask: DownloadTask) {
        cancelRequested = false
        val task = _tasks.value[initialTask.id] ?: return
        val tempFile = File(task.savePath)

        // 确保父目录存在
        tempFile.parentFile?.mkdirs()

        val downloaded = tempFile.length()
        updateTask(task.id, downloadedBytes = downloaded)

        val requestBuilder = Request.Builder().url(task.url)
        if (downloaded > 0) {
            requestBuilder.addHeader("Range", "bytes=$downloaded-")
        }

        val response = client.newCall(requestBuilder.build()).execute()

        if (!response.isSuccessful && response.code != 206) {
            response.close()
            markFailed(task.id, "HTTP ${response.code}")
            return
        }

        val body = response.body
        if (body == null) {
            response.close()
            markFailed(task.id, "响应体为空")
            return
        }

        RandomAccessFile(tempFile, "rw").use { raf ->
            val startOffset = if (response.code == 206) downloaded else {
                raf.setLength(0)
                0L
            }
            if (startOffset > 0) raf.seek(startOffset)

            body.byteStream().use { input ->
                val buffer = ByteArray(8192)
                var bytesRead: Int
                var lastNotify = System.currentTimeMillis()

                while (input.read(buffer).also { bytesRead = it } != -1) {
                    if (cancelRequested) break
                    raf.write(buffer, 0, bytesRead)
                    val newBytes = (_tasks.value[task.id]?.downloadedBytes ?: 0) + bytesRead
                    updateTask(task.id, downloadedBytes = newBytes)

                    val now = System.currentTimeMillis()
                    if (now - lastNotify > 300) {
                        lastNotify = now
                        _notificationEvents.value = NotificationEvent.Progress(task.id)
                    }
                }
            }
        }

        response.close()

        if (cancelRequested) {
            updateTask(task.id, status = DownloadStatus.PAUSED)
        } else {
            // 完成 —— MD5 校验
            val final = _tasks.value[task.id] ?: return
            if (FileUtils.verifyMd5(tempFile, final.fileMd5)) {
                updateTask(task.id, status = DownloadStatus.COMPLETED)
                _notificationEvents.value = NotificationEvent.Completed(task.id)
            } else {
                markFailed(task.id, "MD5 校验失败")
            }
        }

        _currentDownloading.value = null
    }

    private suspend fun markFailed(id: String, error: String) {
        updateTask(id, status = DownloadStatus.FAILED)
        _notificationEvents.value = NotificationEvent.Error(id, error)
        _currentDownloading.value = null
    }

    private suspend fun updateTask(
        id: String,
        downloadedBytes: Long? = null,
        status: DownloadStatus? = null
    ) {
        val current = _tasks.value[id] ?: return
        val updated = current.copy(
            downloadedBytes = downloadedBytes ?: current.downloadedBytes,
            status = status ?: current.status
        )
        _tasks.value = _tasks.value + (id to updated)
        dao.updateProgress(id, updated.downloadedBytes, updated.status.value)
    }
}

sealed class NotificationEvent {
    data class Progress(val taskId: String) : NotificationEvent()
    data class Completed(val taskId: String) : NotificationEvent()
    data class Error(val taskId: String, val message: String) : NotificationEvent()
}
