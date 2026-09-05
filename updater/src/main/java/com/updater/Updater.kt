package com.updater

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.updater.model.UpdateInfo
import com.updater.model.UpdatePackage
import com.updater.ui.DownloadManagerActivity
import okhttp3.*
import org.json.JSONObject
import java.io.IOException

class Updater private constructor(
    private val context: Context,
    private val appId: String,
    private val baseHost: String,
    private val downloadHost: String? = null
) {

    private val client = OkHttpClient()
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        class Builder(private val context: Context) {
            private var appId: String = context.packageName
            private var baseHost: String = ""
            private var downloadHost: String? = null

            fun setAppId(appId: String) = apply { this.appId = appId }
            fun setBaseHost(baseHost: String) = apply { this.baseHost = baseHost }
            
            /**
             * 设置自定义下载域名（如加速 CDN 域名、自建反代域名或 R2 独立下载域名）
             * 若配置，客户端下载 APK 时将自动强制以此域名作为下载 Host
             */
            fun setDownloadHost(downloadHost: String) = apply { this.downloadHost = downloadHost }
            fun setCustomDomain(customDomain: String) = apply { this.downloadHost = customDomain }

            fun build(): Updater {
                if (baseHost.isEmpty()) {
                    throw IllegalStateException("Base host must be set (e.g., https://yourdomain.com)")
                }
                return Updater(context.applicationContext, appId, baseHost, downloadHost)
            }
        }
    }

    /**
     * 检测更新并在有新版本时自动弹出对话框
     */
    fun checkAndShowUpdateDialog(activityContext: Context) {
        val currentVersionCode = getLocalVersionCode(activityContext)
        
        checkUpdate(
            onUpdateAvailable = { updateInfo ->
                if (updateInfo.latestVersionCode > currentVersionCode) {
                    showUpdateDialog(activityContext, updateInfo)
                }
            },
            onNoUpdate = {
                // 没有新版本
            },
            onError = { error ->
                handler.post {
                    Toast.makeText(activityContext, "检查更新失败: $error", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }

    /**
     * 核心异步检查更新方法
     */
    fun checkUpdate(
        onUpdateAvailable: (UpdateInfo) -> Unit,
        onNoUpdate: () -> Unit,
        onError: (String) -> Unit
    ) {
        val url = if (baseHost.endsWith("/")) {
            "${baseHost}api/update?app_id=$appId"
        } else {
            "$baseHost/api/update?app_id=$appId"
        }

        val request = Request.Builder()
            .url(url)
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                handler.post {
                    onError(e.message ?: "网络连接失败")
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val bodyStr = response.body?.string()
                if (!response.isSuccessful || bodyStr == null) {
                    handler.post {
                        onError("HTTP ${response.code}")
                    }
                    return
                }

                try {
                    val json = JSONObject(bodyStr)
                    
                    // 1. 服务端明确返回无更新
                    if (json.has("hasUpdate") && !json.optBoolean("hasUpdate", true)) {
                        handler.post { onNoUpdate() }
                        return
                    }

                    // 2. 服务端返回错误信息
                    if (json.has("error")) {
                        val errMsg = json.optString("error")
                        handler.post { onError(errMsg) }
                        return
                    }

                    val appIdVal = json.optString("appId")
                    val appName = json.optString("appName")
                    val latestVersionCode = json.optInt("latestVersionCode", 0)
                    val latestVersionName = json.optString("latestVersionName")
                    val updateLog = json.optString("updateLog")
                    val isForceUpdate = json.optBoolean("isForceUpdate")
                    val lastUpdated = json.optLong("lastUpdated")

                    if (appIdVal.isEmpty() || latestVersionCode <= 0) {
                        handler.post { onNoUpdate() }
                        return
                    }
                    
                    val packagesList = ArrayList<UpdatePackage>()
                    val packagesArray = json.optJSONArray("packages")
                    if (packagesArray != null) {
                        for (i in 0 until packagesArray.length()) {
                            val pkgJson = packagesArray.getJSONObject(i)
                            packagesList.add(
                                UpdatePackage(
                                    packageId = pkgJson.optString("packageId"),
                                    packageName = pkgJson.optString("packageName"),
                                    versionName = pkgJson.optString("versionName"),
                                    versionCode = pkgJson.optInt("versionCode"),
                                    description = pkgJson.optString("description"),
                                    downloadUrl = pkgJson.optString("downloadUrl"),
                                    apkSize = pkgJson.optLong("apkSize"),
                                    apkMd5 = pkgJson.optString("apkMd5")
                                )
                            )
                        }
                    }

                    val updateInfo = UpdateInfo(
                        appId = appIdVal,
                        appName = appName,
                        latestVersionCode = latestVersionCode,
                        latestVersionName = latestVersionName,
                        updateLog = updateLog,
                        isForceUpdate = isForceUpdate,
                        packages = packagesList,
                        lastUpdated = lastUpdated
                    )

                    handler.post {
                        onUpdateAvailable(updateInfo)
                    }
                } catch (e: Exception) {
                    handler.post {
                        onError("数据解析错误: ${e.message}")
                    }
                }
            }
        })
    }

    private fun showUpdateDialog(context: Context, updateInfo: UpdateInfo) {
        val builder = AlertDialog.Builder(context).apply {
            setTitle("发现新版本 v${updateInfo.latestVersionName}")
            setMessage(updateInfo.updateLog.ifEmpty { "有新的版本发布，点击去查看配套下载列表吧！" })
            setCancelable(!updateInfo.isForceUpdate)
            
            setPositiveButton("立即查看") { dialog, _ ->
                dialog.dismiss()
                openDownloadCenter(context, updateInfo)
            }
            
            if (!updateInfo.isForceUpdate) {
                setNegativeButton("稍后再说") { dialog, _ ->
                    dialog.dismiss()
                }
            }
        }
        
        val dialog = builder.create()
        dialog.show()

        if (updateInfo.isForceUpdate) {
            dialog.setOnCancelListener {
                android.os.Process.killProcess(android.os.Process.myPid())
            }
        }
    }

    fun openDownloadCenter(context: Context, updateInfo: UpdateInfo) {
        val intent = Intent(context, DownloadManagerActivity::class.java).apply {
            putExtra("update_info", updateInfo)
            putExtra("base_host", baseHost)
            if (!downloadHost.isNullOrEmpty()) {
                putExtra("download_host", downloadHost)
            }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    private fun getLocalVersionCode(context: Context): Long {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
        } catch (e: Exception) {
            0
        }
    }
}
