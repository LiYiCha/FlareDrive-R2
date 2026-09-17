package com.updater.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Cloudflare Pages R2 /api/update 接口响应
 */
@Serializable
data class CloudflareUpdateDto(
    val appId: String = "",
    val appName: String = "",
    val latestVersionCode: Int = 0,
    val latestVersionName: String = "",
    val updateLog: String = "",
    val isForceUpdate: Boolean = false,
    val lastUpdated: Long = 0,
    val packages: List<CloudflarePackageDto> = emptyList(),
    // 可选：服务器主动告知没有更新
    val hasUpdate: Boolean = true,
    // 可选：服务器错误信息
    val error: String? = null
)

@Serializable
data class CloudflarePackageDto(
    val packageId: String,
    val packageName: String,
    val versionName: String,
    val versionCode: Int,
    val description: String,
    val downloadUrl: String,
    val apkSize: Long,
    val apkMd5: String
)
