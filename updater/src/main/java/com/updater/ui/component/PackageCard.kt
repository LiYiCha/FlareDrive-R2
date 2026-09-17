package com.updater.ui.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.updater.model.DownloadStatus
import com.updater.model.DownloadTask
import com.updater.ui.LocalUpdaterStateColors
import com.updater.utils.FormatUtils

/**
 * 单个安装包卡片（原 DownloadManagerActivity 里的 createPackageCard）
 */
@Composable
fun PackageCard(
    task: DownloadTask,
    onAction: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val stateColors = LocalUpdaterStateColors.current
    val actionLabel = when (task.status) {
        DownloadStatus.PENDING, DownloadStatus.PAUSED, DownloadStatus.FAILED -> "下载"
        DownloadStatus.DOWNLOADING -> "暂停"
        DownloadStatus.COMPLETED -> "安装"
    }

    val actionColor = when (task.status) {
        DownloadStatus.FAILED -> stateColors.error
        DownloadStatus.DOWNLOADING -> stateColors.warning
        DownloadStatus.COMPLETED -> stateColors.success
        else -> MaterialTheme.colorScheme.primary
    }

    val statusText = when (task.status) {
        DownloadStatus.PENDING -> "未下载"
        DownloadStatus.DOWNLOADING -> "下载中: ${(task.progress() * 100).toInt()}%"
        DownloadStatus.PAUSED -> "已暂停: ${(task.progress() * 100).toInt()}%"
        DownloadStatus.COMPLETED -> "下载完成"
        DownloadStatus.FAILED -> "下载失败"
    }

    val statusColor = when (task.status) {
        DownloadStatus.FAILED -> stateColors.error
        DownloadStatus.COMPLETED -> stateColors.success
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // 标题行
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = FormatUtils.fileSize(task.totalBytes),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // 描述
            Text(
                text = statusText,
                style = MaterialTheme.typography.bodySmall,
                color = statusColor,
                modifier = Modifier.padding(top = 4.dp, bottom = 10.dp)
            )

            // 进度条
            if (task.status == DownloadStatus.DOWNLOADING || task.status == DownloadStatus.PAUSED) {
                LinearProgressIndicator(
                    progress = { task.progress() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    color = actionColor
                )
            }

            // 按钮行
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (task.status == DownloadStatus.PAUSED || task.status == DownloadStatus.COMPLETED || task.status == DownloadStatus.FAILED) {
                    Text(
                        text = "删除",
                        color = stateColors.error,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .clickable { onDelete() }
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    )
                }

                Button(
                    onClick = onAction,
                    colors = ButtonDefaults.buttonColors(containerColor = actionColor),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.padding(start = 8.dp)
                ) {
                    Text(actionLabel, fontSize = 13.sp)
                }
            }
        }
    }
}
