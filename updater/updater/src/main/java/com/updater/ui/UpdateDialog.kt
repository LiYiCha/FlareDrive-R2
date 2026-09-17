package com.updater.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.updater.model.UpdateInfo

/**
 * 发现新版本弹窗（替代原 AlertDialog）
 *
 * 宿主可以直接在 Compose 里调用此 Composable；
 * 或 Updater Facade 内部在 check 成功后弹出。
 */
@Composable
fun UpdateDialog(
    updateInfo: UpdateInfo,
    isForceUpdate: Boolean = updateInfo.isForceUpdate,
    onView: () -> Unit,
    onDismiss: (() -> Unit)? = null
) {
    AlertDialog(
        onDismissRequest = {
            if (!isForceUpdate) onDismiss?.invoke()
        },
        title = {
            Text(
                text = "发现新版本 v${updateInfo.latestVersionName}",
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Text(
                text = updateInfo.updateLog.ifEmpty { "有新的版本发布，点击去查看配套下载列表吧！" },
                style = MaterialTheme.typography.bodyMedium
            )
        },
        confirmButton = {
            Button(onClick = onView) {
                Text("立即查看")
            }
        },
        dismissButton = {
            if (!isForceUpdate) {
                OutlinedButton(onClick = { onDismiss?.invoke() }) {
                    Text("稍后再说")
                }
            }
        }
    )
}
