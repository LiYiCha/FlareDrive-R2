package com.updater.model

/**
 * 下载任务领域模型（与 Room Entity 分开，UI/Domain 层用这个）
 */
data class DownloadTask(
    val id: String,
    val url: String,
    val savePath: String,
    val title: String,
    val totalBytes: Long,
    var downloadedBytes: Long,
    var status: DownloadStatus,
    val fileMd5: String,
    /** 最近一次失败原因（UI 展示用） */
    val errorMessage: String? = null
) {
    fun progress(): Float {
        if (totalBytes <= 0) return 0f
        return (downloadedBytes.toDouble() / totalBytes.toDouble()).toFloat().coerceIn(0f, 1f)
    }
}

enum class DownloadStatus(val value: Int) {
    PENDING(0),
    DOWNLOADING(1),
    PAUSED(2),
    COMPLETED(3),
    FAILED(4);

    companion object {
        fun from(value: Int): DownloadStatus = entries.firstOrNull { it.value == value } ?: PENDING
    }
}
