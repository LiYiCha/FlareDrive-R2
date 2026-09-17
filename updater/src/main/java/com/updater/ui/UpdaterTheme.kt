package com.updater.ui

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

/**
 * Updater 主题容器 —— 只在 Updater 独立 Activity 场景下用
 *
 * 宿主内嵌场景：宿主自己有 MaterialTheme，Updater 的 Composable 直接消费宿主主题
 * Updater 独立 Activity：Activity.onCreate → setContent { UpdaterTheme { Screen() } }
 */
@Composable
fun UpdaterTheme(content: @Composable () -> Unit) {
    val config = LocalUpdaterThemeConfig.current
    val dark = if (config.followSystemDark) isSystemInDarkTheme() else false

    val colorScheme = when {
        // 最高优先级：宿主传了完整 ColorScheme
        config.overrideColorScheme != null -> config.overrideColorScheme!!
        // Material You（Android 12+）
        config.useDynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        // 固定主题色
        else -> fixedColorScheme(primary = config.primary, dark = dark)
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = config.typography ?: MaterialTheme.typography,
        content = content
    )
}

/**
 * 固定主题色（非 Dynamic Color）
 */
private fun fixedColorScheme(primary: Color, dark: Boolean): androidx.compose.material3.ColorScheme {
    return if (dark) {
        darkColorScheme(
            primary = primary,
            secondary = primary.copy(alpha = 0.8f),
            tertiary = Color(0xFF4ECDC4)
        )
    } else {
        lightColorScheme(
            primary = primary,
            secondary = primary.copy(alpha = 0.8f),
            tertiary = Color(0xFF4ECDC4)
        )
    }
}
