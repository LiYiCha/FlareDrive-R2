# Consumer Proguard —— Updater AAR 导出时自动带给宿主
# 保护序列化、Room、Retrofit、Compose 需要的类签名不被混淆

# --- Kotlin Serialization ---
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.updater.**$$serializer { *; }
-keepclassmembers class com.updater.** { *** Companion; }
-keepclasseswithmembers class com.updater.** { kotlinx.serialization.KSerializer serializer(...); }

# --- Room ---
-keep class com.updater.persistence.db.** { *; }
-keepclasseswithmembers class * { @androidx.room.* <methods>; }
-dontwarn androidx.room.paging.**

# --- Retrofit + OkHttp ---
-keepattributes Signature, EnclosingMethod
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-keepclassmembers,allowshrinking,allowobfuscation interface * { @retrofit2.http.* <methods>; }

# --- Compose ---
-dontwarn androidx.compose.**

# --- 前台服务 + Activity ---
-keep class com.updater.download.DownloadForegroundService { *; }
-keep class com.updater.ui.DownloadCenterActivity { *; }
-keep class com.updater.ui.SourceSettingsActivity { *; }
