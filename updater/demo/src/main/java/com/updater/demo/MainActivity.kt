package com.updater.demo

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.updater.Updater
import com.updater.ui.UpdaterThemeConfig

/**
 * Demo 宿主 Activity —— 演示 Updater 的各种入口调用
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
class MainActivity : ComponentActivity() {

    // Updater 单例（宿主通常在 Application.onCreate 里初始化）
    private lateinit var updater: Updater

    // Android 13+ 请求通知权限
    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            // 权限结果，Toast 一下
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化 Updater（宿主启动时做一次就够了）
        updater = com.updater.Updater.Companion.Builder(this)
            .setAppId("com.updater.demo")
            .setBaseHost("https://your-app.pages.dev")  // 你的 Cloudflare Pages / Worker 域名
            .addCloudflareSource("Cloudflare R2", "https://your-r2.pages.dev")
            .setThemeConfig(UpdaterThemeConfig())
            .build()

        // 可选：开启自动检查
        updater.setAutoCheckEnabled(true)

        // Android 13+ 申请通知权限（下载需要）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        setContent {
            UpdaterDemoScreen()
        }
    }

    private fun getCurrentVersionCode(): Long {
        return try {
            val pkg = packageManager.getPackageInfo(packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) pkg.longVersionCode
            else @Suppress("DEPRECATION") pkg.versionCode.toLong()
        } catch (_: Exception) { 1L }
    }

    // ============================
    // 各种 Updater 入口演示
    // ============================

    private fun checkUpdateManual() {
        updater.checkUpdateManual(this)
    }

    private fun checkUpdateOnStartup() {
        // 模拟启动时自动检查（用户已开启时才触发）
        updater.checkUpdateOnStartup(this)
    }

    private fun checkAndShowDialog() {
        updater.checkAndShowUpdateDialog(this)
    }

    private fun openSourceSettings() {
        updater.openSourceSettingsDialog(this)
    }

    private fun openDownloadCenter() {
        // 这个需要先有 UpdateInfo，演示用假数据
        openDownloadCenterWithDemoData()
    }

    private fun openDownloadCenterWithDemoData() {
        // 构造一个假的 UpdateInfo 用于演示 UI
        val demoInfo = com.updater.model.UpdateInfo(
            appId = "com.updater.demo",
            appName = "Updater Demo",
            latestVersionCode = 100,
            latestVersionName = "1.2.0",
            updateLog = "1. 新增 Compose Material3 主题\n2. 修复下载进度丢失\n3. 支持 GitHub Releases 源",
            isForceUpdate = false,
            packages = listOf(
                com.updater.model.UpdatePackage(
                    packageId = "main",
                    packageName = "原版 APK 安装包",
                    versionName = "1.2.0",
                    versionCode = 100,
                    description = "标准官方客户端",
                    downloadUrl = "https://example.com/app-v1.2.0.apk",
                    apkSize = 18 * 1024 * 1024,
                    apkMd5 = ""
                ),
                com.updater.model.UpdatePackage(
                    packageId = "split-arm64",
                    packageName = "arm64 架构包",
                    versionName = "1.2.0",
                    versionCode = 100,
                    description = "更小体积，适用于 64 位设备",
                    downloadUrl = "https://example.com/app-arm64-v1.2.0.apk",
                    apkSize = 6 * 1024 * 1024,
                    apkMd5 = ""
                )
            ),
            lastUpdated = System.currentTimeMillis()
        )
        updater.openDownloadCenter(this, demoInfo)
    }

    @Composable
    private fun UpdaterDemoScreen() {
        val context = LocalContext.current as MainActivity
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Updater Demo") },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
                )
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Updater Library 演示",
                    style = MaterialTheme.typography.titleLarge
                )

                Button(onClick = { context.checkUpdateManual() }, modifier = Modifier.fillMaxWidth()) {
                    Text("手动检查更新（联网）")
                }
                Button(onClick = { context.checkAndShowDialog() }, modifier = Modifier.fillMaxWidth()) {
                    Text("静默检查并弹窗")
                }
                Button(onClick = { context.openSourceSettings() }, modifier = Modifier.fillMaxWidth()) {
                    Text("更新源设置")
                }
                Button(onClick = { context.openDownloadCenter() }, modifier = Modifier.fillMaxWidth()) {
                    Text("下载中心（假数据演示 UI）")
                }
            }
        }
    }
}


