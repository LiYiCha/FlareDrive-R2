package com.updater.utils

import android.net.Uri
import java.io.File
import java.io.FileInputStream
import java.math.BigInteger
import java.security.MessageDigest

object FileUtils {

    /**
     * 计算文件 MD5
     */
    fun md5(file: File): String {
        if (!file.exists()) return ""
        return try {
            val digest = MessageDigest.getInstance("MD5")
            FileInputStream(file).use { fis ->
                val buffer = ByteArray(8192)
                var read: Int
                while (fis.read(buffer).also { read = it } > 0) {
                    digest.update(buffer, 0, read)
                }
            }
            var hex = BigInteger(1, digest.digest()).toString(16)
            while (hex.length < 32) hex = "0$hex"
            hex
        } catch (e: Exception) {
            ""
        }
    }

    /**
     * 校验 MD5（为空或 S3/R2 分片 ETag 含 "-" 时跳过）
     */
    fun verifyMd5(file: File, expected: String): Boolean {
        val clean = expected.trim().trim('"', '\'')
        if (clean.isEmpty() || clean.contains("-")) return true
        return md5(file).equals(clean, ignoreCase = true)
    }
}

object UrlUtils {

    /**
     * 组装绝对下载地址：
     * - 已是 http(s) 开头 → 直接返回
     * - 有 downloadHost（下载加速 CDN）→ 优先拼到 downloadHost
     * - 否则拼到 baseHost
     */
    fun resolveDownloadUrl(url: String, baseHost: String?, downloadHost: String?): String {
        if (url.startsWith("http", ignoreCase = true)) return url

        downloadHost?.let { host ->
            val cleanHost = host.trimEnd('/')
            val path = "/" + url.removePrefix("/")
            return "$cleanHost$path"
        }

        baseHost?.let { host ->
            val cleanHost = host.trimEnd('/')
            return "$cleanHost/" + url.removePrefix("/")
        }

        return url
    }

    /**
     * URL → MD5（用于生成 DownloadTask.id）
     */
    fun urlMd5(url: String): String {
        return try {
            val md = MessageDigest.getInstance("MD5")
            md.digest(url.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
        } catch (_: Exception) {
            url.hashCode().toString(16)
        }
    }
}

object FormatUtils {

    /**
     * 人类可读文件大小
     */
    fun fileSize(size: Long): String {
        if (size <= 0) return "0 B"
        val units = arrayOf("B", "KB", "MB", "GB")
        var value = size.toDouble()
        var i = 0
        while (value >= 1024 && i < units.size - 1) {
            value /= 1024
            i++
        }
        return String.format("%.1f %s", value, units[i])
    }
}
