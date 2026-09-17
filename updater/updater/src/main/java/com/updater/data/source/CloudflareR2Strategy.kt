package com.updater.data.source

import com.updater.api.CloudflareApi
import com.updater.data.mapper.UpdateMapper
import com.updater.model.UpdateSource
import com.updater.utils.Network

/**
 * Cloudflare Pages + R2 更新策略
 */
class CloudflareR2Strategy : UpdateSourceStrategy {

    override suspend fun check(appId: String, source: UpdateSource): StrategyResult {
        val baseUrl = source.url.trimEnd('/')
        val api = Network.create<CloudflareApi>(baseUrl)

        return runCatching { api.checkUpdate(appId) }
            .fold(
                onSuccess = { response ->
                    if (!response.isSuccessful) {
                        StrategyResult.Error("HTTP ${response.code()}")
                    } else {
                        val dto = response.body() ?: return@fold StrategyResult.Error("响应体为空")

                        if (dto.error != null) {
                            StrategyResult.Error(dto.error!!)
                        } else if (!dto.hasUpdate) {
                            StrategyResult.NoUpdate
                        } else if (dto.appId.isEmpty() || dto.latestVersionCode <= 0) {
                            StrategyResult.NoUpdate
                        } else {
                            StrategyResult.Success(UpdateMapper.fromCloudflare(dto))
                        }
                    }
                },
                onFailure = { e ->
                    StrategyResult.Error(e.message ?: "网络请求失败")
                }
            )
    }
}
