package com.updater.model

import kotlinx.serialization.Serializable

/**
 * 应用更新信息（多包联发）
 */
@Serializable
data class UpdateInfo(
    val appId: String,
    val appName: String,
    val latestVersionCode: Int,
    val latestVersionName: String,
    val updateLog: String,
    val isForceUpdate: Boolean,
    val packages: List<UpdatePackage>,
    val lastUpdated: Long
)

@Serializable
data class UpdatePackage(
    val packageId: String,
    val packageName: String,
    val versionName: String,
    val versionCode: Int,
    val description: String,
    val downloadUrl: String,
    val apkSize: Long,
    val apkMd5: String
)
