package com.updater.model

import kotlinx.serialization.Serializable

@Serializable
enum class UpdateSourceType {
    CLOUDFLARE_R2,
    GITHUB_RELEASES,
    CUSTOM
}

@Serializable
data class UpdateSource(
    val id: String,
    val name: String,
    val url: String,
    val type: UpdateSourceType,
    val downloadHost: String? = null,
    val isPreset: Boolean = false
)
