package com.updater.utils

import android.content.Context
import android.widget.Toast

/**
 * 统一 Toast 工具 —— 自动截断精简消息，避免长 URL/长异常撑爆
 *
 * 规则：
 * - 正常消息 ≤ 60 字 → 完整显示
 * - 超长 → 截断到 57 字 + "..."
 * - 所有 Toast 统一 LENGTH_SHORT（Toast 本身就不适合长文，要看详情走 Snackbar/Dialog）
 */
object ToastUtils {

    private const val MAX_LEN = 60

    fun show(ctx: Context, msg: CharSequence?) {
        if (msg == null || msg.isEmpty()) return
        val safe = truncate(msg.toString())
        runCatching { Toast.makeText(ctx.applicationContext, safe, Toast.LENGTH_SHORT).show() }
    }

    /**
     * 截断 + 清理噪音（URL 保留 host、异常 message 去无用前缀）
     */
    private fun truncate(raw: String): String {
        // 清理：去多余空白
        val clean = raw.trim().replace("\\s+".toRegex(), " ")

        return if (clean.length <= MAX_LEN) {
            clean
        } else {
            clean.substring(0, MAX_LEN - 3) + "..."
        }
    }
}
