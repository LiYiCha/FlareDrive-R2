package com.updater.download

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.updater.model.DownloadStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * 前台下载服务 —— 只负责两件事：
 * 1. 让应用在后台下载时不被系统杀死
 * 2. 通知栏展示下载进度
 *
 * 实际下载逻辑全部在 DownloadEngine（协程）里
 */
class DownloadForegroundService : Service() {

    companion object {
        private const val CHANNEL_ID = "updater_download_channel"
        private const val NOTIFICATION_ID = 1024

        // 通过 Action 接收宿主指令（可选）
        const val ACTION_START = "com.updater.download.START"
        const val ACTION_PAUSE = "com.updater.download.PAUSE"
        const val EXTRA_TASK_ID = "extra_task_id"
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var engine: DownloadEngine

    override fun onCreate() {
        super.onCreate()
        engine = DownloadEngine(this)
        engine.init()
        createNotificationChannel()
        startForegroundSafe(buildInitialNotification())

        observeEngine()
    }

    private fun observeEngine() {
        serviceScope.launch {
            // 观察通知栏事件
            engine.notificationEvents.collectLatest { event ->
                when (event) {
                    null -> {}
                    is NotificationEvent.Progress -> {
                        val task = engine.tasks.value[event.taskId] ?: return@collectLatest
                        updateNotification(task.title, task.progress(), task.status)
                    }
                    is NotificationEvent.Completed -> {
                        val task = engine.tasks.value[event.taskId] ?: return@collectLatest
                        updateNotification(task.title, 1f, DownloadStatus.COMPLETED)
                    }
                    is NotificationEvent.Error -> {
                        val task = engine.tasks.value[event.taskId] ?: return@collectLatest
                        updateNotification(task.title, task.progress(), DownloadStatus.FAILED)
                    }
                }
            }
        }

        serviceScope.launch {
            // 没有任务在跑时自动停止
            engine.currentDownloading.collectLatest { currentId ->
                if (currentId == null && engine.tasks.value.values.none { it.status == DownloadStatus.PAUSED }) {
                    // 给一点延迟再停，避免切换时闪烁
                    stopForegroundAndStopSelf()
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return START_NOT_STICKY
                serviceScope.launch { engine.startDownload(taskId) }
            }
            ACTION_PAUSE -> {
                val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return START_NOT_STICKY
                serviceScope.launch { engine.pauseDownload(taskId) }
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        engine.destroy()
        serviceScope.cancel()
        super.onDestroy()
    }

    // --- 通知栏 ---

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Updater 下载服务",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "显示应用更新下载进度"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildInitialNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("Updater")
            .setContentText("准备下载...")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(title: String, progress: Float, status: DownloadStatus) {
        val percent = (progress * 100).toInt().coerceIn(0, 100)
        val text = when (status) {
            DownloadStatus.DOWNLOADING -> "下载中: $percent%"
            DownloadStatus.PAUSED -> "已暂停: $percent%"
            DownloadStatus.COMPLETED -> "下载完成"
            DownloadStatus.FAILED -> "下载失败"
            DownloadStatus.PENDING -> "等待中"
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("正在下载: $title")
            .setContentText(text)
            .setProgress(100, percent, status == DownloadStatus.DOWNLOADING)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(status == DownloadStatus.DOWNLOADING || status == DownloadStatus.PAUSED)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun startForegroundSafe(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun stopForegroundAndStopSelf() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }
}
