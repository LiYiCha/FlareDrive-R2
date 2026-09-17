package com.updater.utils

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.Json

/**
 * 网络层统一入口 —— OkHttpClient + Retrofit 单例
 *
 * 替代原始 Updater.kt / ForegroundDownloadService 各自 new OkHttpClient() 的混乱
 */
object Network {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor(logging)
            .build()
    }

    // 改成 public，因为 inline 函数要访问它
    val converterFactory = json.asConverterFactory("application/json".toMediaType())

    /**
     * 创建 Retrofit API 实例
     */
    inline fun <reified T> create(baseUrl: String): T {
        return Retrofit.Builder()
            .baseUrl(baseUrl.let { if (it.endsWith("/")) it else "$it/" })
            .client(okHttpClient)
            .addConverterFactory(converterFactory)
            .build()
            .create(T::class.java)
    }
}
