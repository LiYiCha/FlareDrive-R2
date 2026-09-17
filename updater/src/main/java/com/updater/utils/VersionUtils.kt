package com.updater.utils

/**
 * 版本号解析工具 —— 原 Updater.parseVersionCode() 独立出来
 */
object VersionUtils {

    /**
     * 解析 VersionCode：
     * 1) 优先从更新日志提取 `versionCode: 30` / `versionCode=30`
     * 2) 否则从语义化版本号转换（0.4.3 → 403, 1.2.0 → 10200）
     */
    fun parseVersionCode(versionName: String, updateLog: String): Int {
        Regex("""versionCode\s*[:=]\s*(\d+)""", RegexOption.IGNORE_CASE)
            .find(updateLog)?.let { match ->
                return match.groupValues[1].toIntOrNull() ?: 1
            }

        return try {
            val parts = versionName.split(".").mapNotNull {
                it.takeWhile { c -> c.isDigit() }.toIntOrNull()
            }
            when {
                parts.size >= 3 -> parts[0] * 10000 + parts[1] * 100 + parts[2]
                parts.size == 2 -> parts[0] * 100 + parts[1]
                parts.size == 1 -> parts[0]
                else -> 1
            }
        } catch (_: Exception) {
            1
        }
    }

    /**
     * 从 tagName 去掉 "v" / "V" 前缀
     */
    fun cleanVersionName(tagName: String): String {
        return tagName.removePrefix("v").removePrefix("V")
    }
}
