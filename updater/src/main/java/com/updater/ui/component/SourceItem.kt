package com.updater.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.updater.model.UpdateSource
import com.updater.model.UpdateSourceType
import com.updater.ui.LocalUpdaterStateColors

/**
 * 更新源列表行（原 SourceSettingsDialog 里的列表项）
 */
@Composable
fun SourceItem(
    source: UpdateSource,
    isSelected: Boolean,
    onSelect: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val stateColors = LocalUpdaterStateColors.current
    val tagColor = if (source.type == UpdateSourceType.CLOUDFLARE_R2) Color(0xFFF6821F) else Color(0xFF24292E)
    val tagLabel = if (source.type == UpdateSourceType.CLOUDFLARE_R2) "CF R2" else "GitHub"

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                else MaterialTheme.colorScheme.surface,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { onSelect() }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = isSelected, onClick = onSelect)

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 4.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = source.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = tagLabel,
                    fontSize = 10.sp,
                    color = Color.White,
                    modifier = Modifier
                        .background(tagColor, RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                        .padding(start = 6.dp)
                )
            }
            Text(
                text = source.url,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
        }

        if (!source.isPreset) {
            Text(
                text = "删除",
                color = stateColors.error,
                fontSize = 11.sp,
                modifier = Modifier
                    .clickable { onDelete() }
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}
