# Proguard rules —— Updater 模块构建时用（内部编译用）
# 与 consumer-rules.pro 保持同步，外加一些调试期常用规则

# 保留行号方便 debug
-keepattributes SourceFile,LineNumberTable

# Kotlin 协程
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-dontwarn kotlinx.coroutines.**
