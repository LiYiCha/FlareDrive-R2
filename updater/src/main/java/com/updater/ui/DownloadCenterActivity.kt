package com.updater.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.updater.model.UpdateInfo
import com.updater.ui.component.PackageCard
import com.updater.ui.viewmodel.DownloadCenterViewModel
import com.updater.ui.viewmodel.UiEvent

/**
 * 下载中心 Activity（原 DownloadManagerActivity）
 */
class DownloadCenterActivity : ComponentActivity() {

    private val viewModel: DownloadCenterViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val updateInfo = parseUpdateInfo(intent)
        val baseHost = intent.getStringExtra(EXTRA_BASE_HOST)
        val downloadHost = intent.getStringExtra(EXTRA_DOWNLOAD_HOST)

        if (updateInfo == null) {
            finish()
            return
        }

        viewModel.init(updateInfo, baseHost, downloadHost)

        setContent {
            UpdaterTheme {
                DownloadCenterScreen(
                    viewModel = viewModel,
                    updateInfo = updateInfo,
                    onBack = { finish() },
                    onOpenSettings = {
                        startActivity(Intent(this, SourceSettingsActivity::class.java))
                    }
                )
            }
        }
    }

    companion object {
        const val EXTRA_BASE_HOST = "extra_base_host"
        const val EXTRA_DOWNLOAD_HOST = "extra_download_host"

        /**
         * 从 Intent 解析 UpdateInfo —— 兼容 Serializable 和新的路径
         */
        private fun parseUpdateInfo(intent: Intent): UpdateInfo? {
            // 新方式：用 JSON 字符串传输（避免 Serializable）
            val jsonStr = intent.getStringExtra("update_info_json")
            if (!jsonStr.isNullOrEmpty()) {
                return runCatching {
                    kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
                        .decodeFromString(UpdateInfo.serializer(), jsonStr)
                }.getOrNull()
            }
            // 兼容旧方式：Serializable
            @Suppress("DEPRECATION")
            return intent.getSerializableExtra("update_info") as? UpdateInfo
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadCenterScreen(
    viewModel: DownloadCenterViewModel,
    updateInfo: UpdateInfo,
    onBack: () -> Unit,
    onOpenSettings: () -> Unit
) {
    val tasks by viewModel.tasks.collectAsState()
    val context = LocalContext.current  // 在 Composable 上下文中取

    // 观察 UiEvent
    LaunchedEffect(Unit) {
        viewModel.event.collect { event ->
            if (event is UiEvent.ShowToast) {
                android.widget.Toast.makeText(context, event.message, android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("系统更新与配套应用") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "设置")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 版本卡片
            item {
                Card(
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = updateInfo.appName,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "最新版本: v${updateInfo.latestVersionName} (Build ${updateInfo.latestVersionCode})",
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                        androidx.compose.material3.Divider(modifier = Modifier.padding(vertical = 12.dp))
                        Text(
                            text = "更新内容:",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = updateInfo.updateLog.ifEmpty { "优化了用户体验和细节。" },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 6.dp)
                        )
                    }
                }
            }

            // 包列表标题
            item {
                Text(
                    text = "配套安装包列表",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // 包卡片
            items(tasks, key = { it.id }) { task ->
                PackageCard(
                    task = task,
                    onAction = { viewModel.onAction(task) },
                    onDelete = { viewModel.onDelete(task) }
                )
            }
        }
    }
}
