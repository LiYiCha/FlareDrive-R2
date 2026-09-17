package com.updater.ui

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * 主题配置 —— 宿主在 Builder 传入
 *
 * 所有字段都有默认值 → Updater 自洽运行
 * 宿主传值 → 无缝覆盖
 */
data class UpdaterThemeConfig(
    /** 主色，默认继承原代码紫蓝色 */
    val primary: Color = Color(0xFF667EEA),
    /** 是否跟随系统深色模式 */
    val followSystemDark: Boolean = true,
    /** 是否启用 Material You Dynamic Color（默认关闭，Library 场景一般不启） */
    val useDynamicColor: Boolean = false,
    /** 宿主自定义 Typography，null 用默认 */
    val typography: Typography? = null,
    /** 宿主如果有完整 ColorScheme，直接传进来覆盖一切（最高优先级） */
    val overrideColorScheme: ColorScheme? = null
)

/**
 * Updater 状态色 —— 独立于 MaterialTheme 标准色
 *
 * Material3 里 error 是红，但 success/warning 不是标准 token。
 * Updater 需要绿/黄/红 三色来表示下载状态。
 * 宿主可以通过 CompositionLocal 覆盖。
 */
data class UpdaterStateColors(
    val success: Color = Color(0xFF28A745),
    val warning: Color = Color(0xFFFFB300),
    val error: Color = Color(0xFFDC3545)
)

// --- CompositionLocal 注入 ---

val LocalUpdaterThemeConfig = compositionLocalOf { UpdaterThemeConfig() }
val LocalUpdaterStateColors = compositionLocalOf { UpdaterStateColors() }

/**
 * CompositionLocal 注入函数 —— 宿主内嵌场景用
 */
@Composable
fun ProvideUpdaterTheme(
    config: UpdaterThemeConfig = UpdaterThemeConfig(),
    stateColors: UpdaterStateColors = UpdaterStateColors(),
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(
        LocalUpdaterThemeConfig provides config,
        LocalUpdaterStateColors provides stateColors,
        content = content
    )
}
