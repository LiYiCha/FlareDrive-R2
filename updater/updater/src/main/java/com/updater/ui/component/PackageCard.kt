package com.updater.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.InstallMobile
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.updater.model.DownloadStatus
import com.updater.model.DownloadTask
import com.updater.ui.LocalUpdaterStateColors
import com.updater.utils.FormatUtils

/**
 * 单个安装包卡片
 *
 * - 主行动按钮 → Button / OutlinedButton（按状态切语义）
 * - 删除 → IconButton
 * - 状态徽章 → AssistChip
 * - 失败原因 → FAILED 时显示在状态下方
 */
@Composable
fun PackageCard(
    task: DownloadTask,
    onAction: () -> Unit,
    onClearLocal: () -> Unit,
    modifier: Modifier = Modifier
) {
    val stateColors = LocalUpdaterStateColors.current
    val progress = task.progress()
    val percent = (progress * 100).toInt()

    val statusLabel = when (task.status) {
        DownloadStatus.PENDING -> "等待下载"
        DownloadStatus.DOWNLOADING -> "下载中"
        DownloadStatus.PAUSED -> "已暂停"
        DownloadStatus.COMPLETED -> "待安装"
        DownloadStatus.FAILED -> "下载失败"
    }

    val actionIcon = when (task.status) {
        DownloadStatus.PENDING, DownloadStatus.PAUSED, DownloadStatus.FAILED -> Icons.Default.Download
        DownloadStatus.DOWNLOADING -> Icons.Default.Pause
        DownloadStatus.COMPLETED -> Icons.Default.InstallMobile
    }

    val actionLabel = when (task.status) {
        DownloadStatus.PENDING, DownloadStatus.PAUSED, DownloadStatus.FAILED -> "下载"
        DownloadStatus.DOWNLOADING -> "暂停"
        DownloadStatus.COMPLETED -> "安装"
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // 标题行：名称 + 大小
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = FormatUtils.fileSize(task.totalBytes),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // 状态行
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AssistChip(
                    onClick = {},
                    label = { Text(statusLabel) },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = when (task.status) {
                            DownloadStatus.FAILED -> stateColors.error.copy(alpha = 0.12f)
                            DownloadStatus.COMPLETED -> stateColors.success.copy(alpha = 0.12f)
                            DownloadStatus.DOWNLOADING -> stateColors.warning.copy(alpha = 0.12f)
                            else -> MaterialTheme.colorScheme.surfaceContainerHigh
                        },
                        labelColor = when (task.status) {
                            DownloadStatus.FAILED -> stateColors.error
                            DownloadStatus.COMPLETED -> stateColors.success
                            DownloadStatus.DOWNLOADING -> stateColors.warning
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                )
                if (task.status == DownloadStatus.DOWNLOADING || task.status == DownloadStatus.PAUSED) {
                    Text(
                        text = "$percent%",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 失败原因（关键修复：之前 FAILED 了也不知道为什么）
            if (task.status == DownloadStatus.FAILED && !task.errorMessage.isNullOrBlank()) {
                Text(
                    text = task.errorMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = stateColors.error,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // 进度条
            if (task.status == DownloadStatus.DOWNLOADING || task.status == DownloadStatus.PAUSED) {
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    color = if (task.status == DownloadStatus.PAUSED) {
                        MaterialTheme.colorScheme.outline
                    } else {
                        MaterialTheme.colorScheme.primary
                    },
                    trackColor = MaterialTheme.colorScheme.surfaceContainerHighest
                )
            }

            // 按钮行
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 清除本地数据按钮 —— 仅在非 PENDING（已有/曾有本地数据）时显示
                if (task.status != DownloadStatus.PENDING) {
                    IconButton(onClick = onClearLocal) {
                        Icon(
                            Icons.Default.DeleteOutline,
                            contentDescription = "清除本地数据",
                            tint = stateColors.error
                        )
                    }
                }

                when (task.status) {
                    DownloadStatus.DOWNLOADING -> {
                        OutlinedButton(onClick = onAction) {
                            Icon(actionIcon, contentDescription = null, modifier = Modifier.padding(end = 6.dp))
                            Text(actionLabel)
                        }
                    }
                    else -> {
                        Button(onClick = onAction) {
                            Icon(actionIcon, contentDescription = null, modifier = Modifier.padding(end = 6.dp))
                            Text(actionLabel)
                        }
                    }
                }
            }
        }
    }
}
