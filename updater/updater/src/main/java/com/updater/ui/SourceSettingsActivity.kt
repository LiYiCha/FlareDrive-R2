package com.updater.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.updater.model.UpdateSourceType
import com.updater.ui.component.SourceItem
import com.updater.ui.viewmodel.SourceSettingsViewModel

/**
 * 更新源设置 Activity
 *
 * Material3 文字层级（统一）：
 * - 页面大标题 → TopAppBar 自带
 * - 区块标题  → titleMedium + SemiBold
 * - 正文描述  → bodyLarge（主）/ bodySmall（辅，onSurfaceVariant）
 * - 对话框标题 → titleLarge + SemiBold
 * - Radio 标签 → bodyMedium
 */
class SourceSettingsActivity : ComponentActivity() {

    private val viewModel: SourceSettingsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            UpdaterTheme {
                SourceSettingsScreen(
                    viewModel = viewModel,
                    onBack = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SourceSettingsScreen(
    viewModel: SourceSettingsViewModel,
    onBack: () -> Unit
) {
    val autoCheck by viewModel.autoCheckOnStartup.collectAsState()
    val selectedId by viewModel.selectedSourceId.collectAsState()
    val sources by viewModel.sources.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("更新源设置") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // 自动检查开关
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "启动时自动检查更新",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "关闭时仅在点击检查时检测更新（默认关闭）",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Checkbox(
                        checked = autoCheck,
                        onCheckedChange = { viewModel.setAutoCheck(it) }
                    )
                }
            }

            item { HorizontalDivider() }

            // 源列表标题
            item {
                Text(
                    text = "选择当前生效的更新源",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 16.dp, bottom = 4.dp)
                )
            }

            // 源列表
            items(sources, key = { it.id }) { source ->
                SourceItem(
                    source = source,
                    isSelected = source.id == selectedId,
                    onSelect = { viewModel.selectSource(source.id) },
                    onDelete = { viewModel.deleteSource(source.id) }
                )
            }

            // 添加按钮
            item {
                TextButton(
                    onClick = { showAddDialog = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp)
                ) {
                    Text("添加自定义更新源")
                }
            }
        }
    }

    if (showAddDialog) {
        AddSourceDialog(
            onConfirm = { name, url, type ->
                viewModel.addSource(name, url, type)
                showAddDialog = false
            },
            onDismiss = { showAddDialog = false }
        )
    }
}

@Composable
private fun AddSourceDialog(
    onConfirm: (String, String, UpdateSourceType) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf(UpdateSourceType.CLOUDFLARE_R2) }

    Dialog(onDismissRequest = onDismiss) {
        androidx.compose.material3.Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "添加自定义更新源",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("更新源名称") },
                    placeholder = { Text("如：我的备用镜像源") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("接口或仓库 URL") },
                    placeholder = { Text("CF 域名 或 github.com/owner/repo") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "类型",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 4.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val radioColors = RadioButtonDefaults.colors(selectedColor = MaterialTheme.colorScheme.primary)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = selectedType == UpdateSourceType.CLOUDFLARE_R2,
                            onClick = { selectedType = UpdateSourceType.CLOUDFLARE_R2 },
                            colors = radioColors
                        )
                        Text(
                            text = "Cloudflare R2",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = selectedType == UpdateSourceType.GITHUB_RELEASES,
                            onClick = { selectedType = UpdateSourceType.GITHUB_RELEASES },
                            colors = radioColors
                        )
                        Text(
                            text = "GitHub Releases",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) { Text("取消") }
                    Button(
                        onClick = {
                            if (name.isNotBlank() && url.isNotBlank()) {
                                onConfirm(name.trim(), url.trim(), selectedType)
                            }
                        }
                    ) { Text("保存") }
                }
            }
        }
    }
}
