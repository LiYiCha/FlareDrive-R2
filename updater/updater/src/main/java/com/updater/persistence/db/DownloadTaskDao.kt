package com.updater.persistence.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.updater.model.DownloadTask
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Dao
interface DownloadTaskDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: DownloadTaskEntity)

    @Query("SELECT * FROM download_tasks WHERE id = :id")
    suspend fun getById(id: String): DownloadTaskEntity?

    @Query("SELECT * FROM download_tasks")
    fun observeAll(): Flow<List<DownloadTaskEntity>>

    @Query("SELECT * FROM download_tasks")
    suspend fun getAll(): List<DownloadTaskEntity>

    @Query(
        """UPDATE download_tasks
        SET downloadedBytes = :downloadedBytes,
            status = :status,
            errorMessage = :errorMessage
        WHERE id = :id"""
    )
    suspend fun updateProgress(
        id: String,
        downloadedBytes: Long,
        status: Int,
        errorMessage: String? = null
    )

    @Query("DELETE FROM download_tasks WHERE id = :id")
    suspend fun delete(id: String)
}

fun DownloadTaskDao.observeDomain(): Flow<List<DownloadTask>> =
    observeAll().map { list -> list.map { it.toDomain() } }
