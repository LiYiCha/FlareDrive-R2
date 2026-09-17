package com.updater.data.source

import com.updater.model.UpdateInfo
import com.updater.model.UpdateSource

/**
 * 更新源策略接口 —— 每种源类型实现自己的检查逻辑
 * 新源类型只需实现此接口，无需修改 Updater 核心代码（开闭原则）
 */
fun interface UpdateSourceStrategy {
    suspend fun check(appId: String, source: UpdateSource): StrategyResult
}

sealed class StrategyResult {
    data class Success(val info: UpdateInfo) : StrategyResult()
    object NoUpdate : StrategyResult()
    data class Error(val message: String) : StrategyResult()
}
