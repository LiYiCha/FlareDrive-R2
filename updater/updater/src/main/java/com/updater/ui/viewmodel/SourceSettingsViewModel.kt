package com.updater.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.updater.data.UpdateRepository
import com.updater.persistence.UpdaterPrefs
import com.updater.model.UpdateSource
import com.updater.model.UpdateSourceType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * 更新源设置 ViewModel
 */
class SourceSettingsViewModel(app: Application) : AndroidViewModel(app) {

    private val prefs = UpdaterPrefs(app)

    val autoCheckOnStartup: StateFlow<Boolean> = prefs.autoCheckOnStartup
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    val selectedSourceId: StateFlow<String> = prefs.selectedSourceId
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val sources: StateFlow<List<UpdateSource>> = prefs.sources
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    private val _currentSource = MutableStateFlow<UpdateSource?>(null)
    val currentSource: StateFlow<UpdateSource?> = _currentSource.asStateFlow()

    init {
        viewModelScope.launch {
            sources.collect { list ->
                _currentSource.value = list.firstOrNull { it.id == selectedSourceId.value }
                    ?: list.firstOrNull()
            }
        }
    }

    fun setAutoCheck(enabled: Boolean) {
        viewModelScope.launch { prefs.setAutoCheckOnStartup(enabled) }
    }

    fun selectSource(id: String) {
        viewModelScope.launch { prefs.setSelectedSourceId(id) }
    }

    fun addSource(name: String, url: String, type: UpdateSourceType) {
        viewModelScope.launch {
            val id = when (type) {
                UpdateSourceType.CLOUDFLARE_R2 -> "cf_${url.hashCode()}"
                UpdateSourceType.GITHUB_RELEASES -> "gh_${url.hashCode()}"
                UpdateSourceType.CUSTOM -> "custom_${System.currentTimeMillis()}"
            }
            val newSource = UpdateSource(
                id = id,
                name = name,
                url = url,
                type = type,
                isPreset = false
            )
            val current = sources.value
            prefs.setSources(current + newSource)
            prefs.setSelectedSourceId(id)
        }
    }

    fun deleteSource(id: String) {
        viewModelScope.launch {
            val current = sources.value
            val target = current.firstOrNull { it.id == id } ?: return@launch
            if (target.isPreset) return@launch

            val updated = current - target
            prefs.setSources(updated)

            if (selectedSourceId.value == id) {
                prefs.setSelectedSourceId(updated.firstOrNull()?.id ?: "")
            }
        }
    }
}
