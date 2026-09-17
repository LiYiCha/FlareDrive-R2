package com.updater.data.source

import com.updater.api.GitHubApi
import com.updater.data.mapper.UpdateMapper
import com.updater.model.UpdateSource
import com.updater.utils.Network

/**
 * GitHub Releases 更新策略
 */
class GitHubReleaseStrategy : UpdateSourceStrategy {

    override suspend fun check(appId: String, source: UpdateSource): StrategyResult {
        val repoInfo = parseRepoInfo(source.url)
        if (repoInfo == null) {
            return StrategyResult.Error("无法从 URL 解析 GitHub 仓库信息")
        }

        val api = Network.create<GitHubApi>("https://api.github.com/")

        return runCatching { api.getLatestRelease(repoInfo.first, repoInfo.second) }
            .fold(
                onSuccess = { response ->
                    if (!response.isSuccessful) {
                        StrategyResult.Error("GitHub HTTP ${response.code()}")
                    } else {
                        val dto = response.body() ?: return@fold StrategyResult.Error("响应体为空")

                        if (dto.draft || dto.tag_name.isEmpty()) {
                            StrategyResult.NoUpdate
                        } else {
                            val info = UpdateMapper.fromGitHub(dto, appId)
                            if (info.packages.isEmpty()) StrategyResult.NoUpdate
                            else StrategyResult.Success(info)
                        }
                    }
                },
                onFailure = { e ->
                    StrategyResult.Error(e.message ?: "GitHub 连接失败")
                }
            )
    }

    private fun parseRepoInfo(url: String): Pair<String, String>? {
        val trimmed = url.trim().trimEnd('/')

        // github.com/owner/repo → 解析
        if (trimmed.startsWith("https://github.com/")) {
            val parts = trimmed.removePrefix("https://github.com/").split("/")
            if (parts.size >= 2) return parts[0] to parts[1]
        }

        // api.github.com/repos/owner/repo/... → 解析
        if (trimmed.startsWith("https://api.github.com/repos/")) {
            val parts = trimmed.removePrefix("https://api.github.com/repos/").split("/")
            if (parts.size >= 2) return parts[0] to parts[1]
        }

        return null
    }
}
