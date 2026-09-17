package com.updater.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.updater.model.UpdateInfo
import com.updater.ui.component.PackageCard
import com.updater.ui.viewmodel.DownloadCenterViewModel
import com.updater.ui.viewmodel.UiEvent
import com.updater.utils.ToastUtils

/**
 * 下载中心 Activity
 *
 * 功能：
 * - 下拉刷新 / 点击刷新按钮 → 重新联网检查更新
 * - 清除本地数据（保留任务条目，可重新下载）
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

        private fun parseUpdateInfo(intent: Intent): UpdateInfo? {
            val jsonStr = intent.getStringExtra("update_info_json")
            if (!jsonStr.isNullOrEmpty()) {
                return runCatching {
                    kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
                        .decodeFromString(UpdateInfo.serializer(), jsonStr)
                }.getOrNull()
            }
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
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.event.collect { event ->
            if (event is UiEvent.ShowToast) {
                ToastUtils.show(context, event.message)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("更新中心") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "设置")
                    }
                }
            )
        }
    ) { padding ->
        val swipeRefreshState = rememberSwipeRefreshState(isRefreshing = isRefreshing)
        SwipeRefresh(
            state = swipeRefreshState,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 版本信息卡
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                        )
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                text = updateInfo.appName,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "最新版本 v${updateInfo.latestVersionName}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(top = 4.dp)
                            )

                            if (updateInfo.updateLog.isNotBlank()) {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 16.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant
                                )
                                Text(
                                    text = "更新内容",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = updateInfo.updateLog,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 6.dp)
                                )
                            }
                        }
                    }
                }

                // 安装包列表标题
                if (tasks.isNotEmpty()) {
                    item {
                        Text(
                            text = "选择要下载的安装包",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(top = 4.dp, bottom = 4.dp)
                        )
                    }
                }

                // 包卡片
                items(tasks, key = { it.id }) { task ->
                    PackageCard(
                        task = task,
                        onAction = { viewModel.onAction(task) },
                        onClearLocal = { viewModel.onClearLocal(task) }
                    )
                }

                // 列表为空时
                if (tasks.isEmpty()) {
                    item {
                        Text(
                            text = "暂无可用安装包",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp)
                        )
                    }
                }
            }
        }
    }
}
