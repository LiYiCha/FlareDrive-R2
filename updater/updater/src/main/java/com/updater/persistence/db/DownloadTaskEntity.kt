package com.updater.persistence.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.updater.model.DownloadStatus

/**
 * Room Entity —— 下载任务持久化
 */
@Entity(tableName = "download_tasks")
data class DownloadTaskEntity(
    @PrimaryKey val id: String,
    val url: String,
    val savePath: String,
    val title: String,
    val totalBytes: Long,
    val downloadedBytes: Long,
    val status: Int,
    val fileMd5: String,
    val errorMessage: String? = null
) {
    fun toDomain(): com.updater.model.DownloadTask = com.updater.model.DownloadTask(
        id = id,
        url = url,
        savePath = savePath,
        title = title,
        totalBytes = totalBytes,
        downloadedBytes = downloadedBytes,
        status = DownloadStatus.from(status),
        fileMd5 = fileMd5,
        errorMessage = errorMessage
    )

    companion object {
        fun from(domain: com.updater.model.DownloadTask): DownloadTaskEntity = DownloadTaskEntity(
            id = domain.id,
            url = domain.url,
            savePath = domain.savePath,
            title = domain.title,
            totalBytes = domain.totalBytes,
            downloadedBytes = domain.downloadedBytes,
            status = domain.status.value,
            fileMd5 = domain.fileMd5,
            errorMessage = domain.errorMessage
        )
    }
}
