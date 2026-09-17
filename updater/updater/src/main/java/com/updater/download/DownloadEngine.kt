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
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * 下载引擎 —— 协程驱动的状态机
 *
 * 修复：
 * 1. runDownload 包 try/catch，UnknownHost / SocketTimeout 等异常不再卡 DOWNLOADING
 * 2. markFailed 写入 errorMessage 到 Domain + Room → PackageCard 可以直接读
 */
class DownloadEngine(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val dao = DownloadDatabase.getInstance(context).downloadTaskDao()

    private val _tasks = MutableStateFlow<Map<String, DownloadTask>>(emptyMap())
    val tasks: StateFlow<Map<String, DownloadTask>> = _tasks.asStateFlow()

    private val _currentDownloading = MutableStateFlow<String?>(null)
    val currentDownloading: StateFlow<String?> = _currentDownloading.asStateFlow()

    private val _notificationEvents = MutableStateFlow<NotificationEvent?>(null)
    val notificationEvents: StateFlow<NotificationEvent?> = _notificationEvents.asStateFlow()

    private val client get() = Network.okHttpClient

    // --- 生命周期 ---

    fun init() {
        scope.launch {
            dao.getAll().forEach { entity ->
                val domain = entity.toDomain()
                val final = when {
                    (domain.status == DownloadStatus.COMPLETED || domain.status == DownloadStatus.FAILED)
                        && !File(domain.savePath).exists() -> domain.copy(
                        status = DownloadStatus.PENDING,
                        downloadedBytes = 0,
                        errorMessage = null
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

    fun registerTask(task: DownloadTask) {
        scope.launch {
            _tasks.value = _tasks.value + (task.id to task)
            dao.upsert(DownloadTaskEntity.from(task))
        }
    }

    /**
     * 清除本地已下载的数据（删除 APK 文件 + 重置为 PENDING）
     *
     * 语义：远程安装包条目来自 UpdateInfo，不在引擎控制范围内。
     * 这里只清"本地下载产物"，任务本身保留在列表里让用户重新下载。
     */
    fun clearLocalData(id: String) {
        scope.launch {
            val current = _tasks.value[id] ?: return@launch
            if (current.status == DownloadStatus.DOWNLOADING) cancelCurrent()
            File(current.savePath).delete()
            updateTask(id, status = DownloadStatus.PENDING, downloadedBytes = 0L, errorMessage = null)
        }
    }

    /**
     * 真正移除任务条目 —— 仅在远程包下架（refresh 后 UpdateInfo 里没了）时调用
     */
    fun removeTask(id: String) {
        scope.launch {
            val current = _tasks.value[id] ?: return@launch
            if (current.status == DownloadStatus.DOWNLOADING) cancelCurrent()
            File(current.savePath).delete()
            dao.delete(id)
            _tasks.value = _tasks.value - id
        }
    }

    suspend fun startDownload(id: String) {
        val task = _tasks.value[id] ?: return
        if (task.status == DownloadStatus.DOWNLOADING) return
        if (_currentDownloading.value != null && _currentDownloading.value != id) return

        _currentDownloading.value = id
        // 启动新下载时清空上次的 errorMessage
        updateTask(id, status = DownloadStatus.DOWNLOADING, errorMessage = null)

        runCatching { runDownload(task) }.onFailure { e ->
            // runDownload 自己内部会 markFailed；这里只是兜底
            markFailed(id, safeReason(e))
        }
    }

    suspend fun pauseDownload(id: String) {
        val task = _tasks.value[id] ?: return
        if (task.status != DownloadStatus.DOWNLOADING) return
        cancelCurrent()
        updateTask(id, status = DownloadStatus.PAUSED)
    }

    private fun cancelCurrent() {
        cancelRequested = true
    }

    // --- 核心下载循环 ---

    @Volatile
    private var cancelRequested = false

    private suspend fun runDownload(initialTask: DownloadTask) {
        cancelRequested = false
        val task = _tasks.value[initialTask.id] ?: return
        val tempFile = File(task.savePath)
        tempFile.parentFile?.mkdirs()

        val downloaded = tempFile.length()
        updateTask(task.id, downloadedBytes = downloaded, errorMessage = null)

        val result = withContext(Dispatchers.IO) {
            try {
                val requestBuilder = Request.Builder().url(task.url)
                if (downloaded > 0) {
                    requestBuilder.addHeader("Range", "bytes=$downloaded-")
                }

                val response = client.newCall(requestBuilder.build()).execute()

                if (!response.isSuccessful && response.code != 206) {
                    response.close()
                    return@withContext DownloadResult.Fail("HTTP ${response.code}")
                }

                val body = response.body
                if (body == null) {
                    response.close()
                    return@withContext DownloadResult.Fail("响应体为空")
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
                if (cancelRequested) DownloadResult.Paused else DownloadResult.Ok
            } catch (e: Exception) {
                DownloadResult.Fail(safeReason(e))
            }
        }

        when (result) {
            DownloadResult.Ok -> {
                val final = _tasks.value[task.id] ?: return
                if (FileUtils.verifyMd5(tempFile, final.fileMd5)) {
                    updateTask(task.id, status = DownloadStatus.COMPLETED)
                    _notificationEvents.value = NotificationEvent.Completed(task.id)
                } else {
                    markFailed(task.id, "MD5 校验失败")
                }
            }
            DownloadResult.Paused -> updateTask(task.id, status = DownloadStatus.PAUSED)
            is DownloadResult.Fail -> markFailed(task.id, result.reason)
        }

        _currentDownloading.value = null
    }

    private sealed class DownloadResult {
        data object Ok : DownloadResult()
        data object Paused : DownloadResult()
        data class Fail(val reason: String) : DownloadResult()
    }

    /**
     * 把各种异常（UnknownHost/SocketTimeout/IO 等）翻译成用户能看懂的精简中文
     */
    private fun safeReason(e: Throwable): String = when (e) {
        is UnknownHostException -> "无法解析主机"
        is SocketTimeoutException -> "连接超时"
        is IOException -> "网络连接失败"
        else -> e.message?.takeIf { it.isNotBlank() } ?: "未知错误"
    }

    private suspend fun markFailed(id: String, error: String) {
        updateTask(id, status = DownloadStatus.FAILED, errorMessage = error)
        _notificationEvents.value = NotificationEvent.Error(id, error)
        _currentDownloading.value = null
    }

    private suspend fun updateTask(
        id: String,
        downloadedBytes: Long? = null,
        status: DownloadStatus? = null,
        errorMessage: String? = null
    ) {
        val current = _tasks.value[id] ?: return
        // errorMessage 逻辑：null 表示"不更新"（保留原值），非 null 才覆盖
        val newError = errorMessage ?: current.errorMessage
        val updated = current.copy(
            downloadedBytes = downloadedBytes ?: current.downloadedBytes,
            status = status ?: current.status,
            errorMessage = newError
        )
        _tasks.value = _tasks.value + (id to updated)
        dao.updateProgress(id, updated.downloadedBytes, updated.status.value, newError)
    }
}

sealed class NotificationEvent {
    data class Progress(val taskId: String) : NotificationEvent()
    data class Completed(val taskId: String) : NotificationEvent()
    data class Error(val taskId: String, val message: String) : NotificationEvent()
}
