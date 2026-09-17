package com.updater.persistence

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.updater.model.UpdateSource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

/**
 * 确保 DataStore 是 Context 级别的单例（顶层扩展属性）
 */
private val Context.updaterDataStore: DataStore<Preferences> by preferencesDataStore(name = "updater_prefs")

/**
 * Updater 偏好设置 —— 基于 Jetpack DataStore (Preferences)
 *
 * 替代原 UpdaterConfigManager (SharedPreferences)
 */
class UpdaterPrefs(private val context: Context) {

    private val autoCheckOnStartupKey = booleanPreferencesKey("auto_check_on_startup")
    private val selectedSourceIdKey = stringPreferencesKey("selected_source_id")
    private val sourcesListKey = stringPreferencesKey("sources_list_json")

    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = false
    }

    private val dataStore get() = context.updaterDataStore

    // --- 自动检查开关 ---

    val autoCheckOnStartup: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[autoCheckOnStartupKey] ?: false
    }

    suspend fun setAutoCheckOnStartup(enabled: Boolean) {
        dataStore.edit { it[autoCheckOnStartupKey] = enabled }
    }

    // --- 选中源 ID ---

    val selectedSourceId: Flow<String> = dataStore.data.map { prefs ->
        prefs[selectedSourceIdKey] ?: ""
    }

    suspend fun setSelectedSourceId(id: String) {
        dataStore.edit { it[selectedSourceIdKey] = id }
    }

    // --- 源列表（JSON 存储）---

    val sources: Flow<List<UpdateSource>> = dataStore.data.map { prefs ->
        val jsonStr = prefs[sourcesListKey]
        if (jsonStr.isNullOrEmpty()) emptyList()
        else runCatching {
            json.decodeFromString(ListSerializer(UpdateSource.serializer()), jsonStr)
        }.getOrDefault(emptyList())
    }

    suspend fun setSources(sourcesList: List<UpdateSource>) {
        val jsonStr = json.encodeToString(ListSerializer(UpdateSource.serializer()), sourcesList)
        dataStore.edit { it[sourcesListKey] = jsonStr }
    }

    /**
     * 确保默认源存在，自动选中第一个（如果还没选）
     */
    suspend fun ensureDefaultSources(defaults: List<UpdateSource>) {
        // Flow.first() 取当前值，是挂起函数
        val existing: List<UpdateSource> = sources.first()
        var changed = false

        val merged = existing.toMutableList()
        for (def in defaults) {
            if (merged.none { it.id == def.id }) {
                merged.add(def)
                changed = true
            }
        }

        if (changed) setSources(merged)

        val currentId = selectedSourceId.first()
        if (currentId.isEmpty() || merged.none { it.id == currentId }) {
            merged.firstOrNull()?.let { setSelectedSourceId(it.id) }
        }
    }
}
