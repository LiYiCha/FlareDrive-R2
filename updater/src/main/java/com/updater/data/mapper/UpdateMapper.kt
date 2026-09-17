package com.updater.data.mapper

import com.updater.api.dto.CloudflareUpdateDto
import com.updater.api.dto.GitHubReleaseDto
import com.updater.model.UpdateInfo
import com.updater.model.UpdatePackage
import com.updater.utils.VersionUtils

object UpdateMapper {

    /**
     * Cloudflare DTO → 领域模型
     */
    fun fromCloudflare(dto: CloudflareUpdateDto): UpdateInfo {
        return UpdateInfo(
            appId = dto.appId,
            appName = dto.appName,
            latestVersionCode = dto.latestVersionCode,
            latestVersionName = dto.latestVersionName,
            updateLog = dto.updateLog,
            isForceUpdate = dto.isForceUpdate,
            packages = dto.packages.map { p ->
                UpdatePackage(
                    packageId = p.packageId,
                    packageName = p.packageName,
                    versionName = p.versionName,
                    versionCode = p.versionCode,
                    description = p.description,
                    downloadUrl = p.downloadUrl,
                    apkSize = p.apkSize,
                    apkMd5 = p.apkMd5
                )
            },
            lastUpdated = dto.lastUpdated
        )
    }

    /**
     * GitHub DTO → 领域模型
     */
    fun fromGitHub(dto: GitHubReleaseDto, appId: String): UpdateInfo {
        val versionName = VersionUtils.cleanVersionName(dto.tag_name)
        val versionCode = VersionUtils.parseVersionCode(versionName, dto.body)

        val packages = dto.assets
            .filter { it.name.endsWith(".apk", ignoreCase = true) }
            .mapIndexed { index, asset ->
                UpdatePackage(
                    packageId = "gh_asset_${asset.id}",
                    packageName = asset.name,
                    versionName = versionName,
                    versionCode = versionCode,
                    description = "GitHub Release 发布文件: ${asset.name}",
                    downloadUrl = asset.browser_download_url,
                    apkSize = asset.size,
                    apkMd5 = ""
                )
            }

        return UpdateInfo(
            appId = appId,
            appName = dto.name.ifEmpty { dto.tag_name },
            latestVersionCode = versionCode,
            latestVersionName = versionName,
            updateLog = dto.body,
            isForceUpdate = false,
            packages = packages,
            lastUpdated = System.currentTimeMillis()
        )
    }
}
