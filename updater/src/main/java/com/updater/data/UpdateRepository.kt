package com.updater.data

import com.updater.data.source.CloudflareR2Strategy
import com.updater.data.source.GitHubReleaseStrategy
import com.updater.data.source.StrategyResult
import com.updater.data.source.UpdateSourceStrategy
import com.updater.model.UpdateInfo
import com.updater.model.UpdateSource
import com.updater.model.UpdateSourceType

/**
 * 更新检查统一入口 —— 根据选中源类型分发给对应 Strategy
 *
 * 加新源类型：实现 UpdateSourceStrategy + 在 strategyRegistry 注册
 * 不改这个类的任何逻辑（扩展开闭）
 */
class UpdateRepository {

    private val strategyRegistry: Map<UpdateSourceType, UpdateSourceStrategy> = mapOf(
        UpdateSourceType.CLOUDFLARE_R2 to CloudflareR2Strategy(),
        UpdateSourceType.GITHUB_RELEASES to GitHubReleaseStrategy()
    )

    suspend fun check(appId: String, source: UpdateSource): StrategyResult {
        val strategy = strategyRegistry[source.type]
            ?: return StrategyResult.Error("不支持的更新源类型: ${source.type}")
        return strategy.check(appId, source)
    }
}
