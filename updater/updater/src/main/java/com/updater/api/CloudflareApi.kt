package com.updater.api

import com.updater.api.dto.CloudflareUpdateDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Cloudflare Pages + R2 更新检测 API
 * 完整 URL 由 Retrofit baseUrl 决定
 */
interface CloudflareApi {

    @GET("api/update")
    suspend fun checkUpdate(
        @Query("app_id") appId: String
    ): Response<CloudflareUpdateDto>
}
