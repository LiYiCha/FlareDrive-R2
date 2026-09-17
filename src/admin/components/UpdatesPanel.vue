<script setup>
import { useAppUpdates } from "../composables/useAppUpdates.js";

const {
  appsUpdates,
  editingApp,
  isNewApp,
  savingUpdate,
  changelogTab,
  onAppIdInput,
  onApkDirInput,
  setAppSubDirDefault,
  getEffectiveAppDir,
  getPackageUploadDir,
  createAppUpdate,
  editAppUpdate,
  renderMarkdown,
  insertMdPrefix,
  insertMdWrap,
  deleteAppUpdate,
  addPackageItem,
  removePackageItem,
  triggerApkSelect,
  onApkFileDrop,
  onApkFileSelected,
  saveAppUpdate,
} = useAppUpdates();
</script>

<template>
  <div class="dash-content-card">
    <div v-if="!editingApp" class="app-list-view">
      <div class="section-title-btn">
        <div>
          <h3 style="margin:0;font-size:16px;">应用发布版本列表</h3>
          <span class="dash-card-subtitle">为 Android 等配套客户端管理在线版本更新配置</span>
        </div>
        <button class="btn-sm-primary" @click="createAppUpdate">+ 发布新 App 版本</button>
      </div>

      <div v-if="Object.keys(appsUpdates).length === 0" class="empty-list-info">
        暂无 App 更新发布配置，点击右上角按钮即可发布首个版本。
      </div>
      <div v-else class="app-cards-grid">
        <div v-for="(app, id) in appsUpdates" :key="id" class="app-dash-card">
          <div class="app-dash-card-header">
            <div class="app-title-area">
              <strong class="app-display-name">{{ app.appName }}</strong>
              <span class="app-id-tag">{{ id }}</span>
            </div>
            <span class="app-version-badge">v{{ app.latestVersionName }} (Build {{ app.latestVersionCode }})</span>
          </div>
          <div class="app-dash-card-body">
            <div class="app-meta-line">
              <span>关联安装包数：<strong>{{ app.packages ? app.packages.length : 0 }} 个</strong></span>
              <span>更新类型：<strong>{{ app.isForceUpdate ? '强制更新' : '普通更新' }}</strong></span>
            </div>
            <div v-if="app.updateLog" class="app-changelog-preview">
              <strong>更新日志：</strong> {{ app.updateLog }}
            </div>
          </div>
          <div class="app-dash-card-footer">
            <button class="btn-app-edit" @click="editAppUpdate(id, app)">编辑配置</button>
            <button class="btn-app-del" @click="deleteAppUpdate(id)">删除应用</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑表单 -->
    <div v-else class="app-edit-view">
      <div class="form-header-row">
        <h4 style="margin:0;font-size:16px;">配置应用版本更新</h4>
        <button class="btn-sm-secondary" @click="editingApp = null">返回列表</button>
      </div>
      <div class="form-group">
        <label>应用包名 (App ID) *</label>
        <input type="text" v-model="editingApp.appId" @input="onAppIdInput" :disabled="!isNewApp" placeholder="例如 com.example.app" />
      </div>
      <div class="form-group">
        <label>应用显示名称 (App Name) *</label>
        <input type="text" v-model="editingApp.appName" placeholder="例如 极简网盘" />
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label>最新 Version Code *</label>
          <input type="number" v-model="editingApp.latestVersionCode" placeholder="例如 200" />
        </div>
        <div class="form-group">
          <label>最新 Version Name *</label>
          <input type="text" v-model="editingApp.latestVersionName" placeholder="例如 2.0.0" />
        </div>
      </div>
      <div class="form-group force-update-wrap">
        <label class="checkbox-label">
          <input type="checkbox" v-model="editingApp.isForceUpdate" />
          <span>强制更新 (锁定主程序需更新后才能继续运行)</span>
        </label>
      </div>
      <!-- CDN 边缘缓存自定义控制 -->
      <div class="form-group" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <label class="checkbox-label" style="margin: 0;">
            <input type="checkbox" v-model="editingApp.cdnCacheEnabled" />
            <span style="font-weight: 600; color: #1E293B;">启用 APK 安装包 CDN 边缘缓存</span>
          </label>
          <div v-if="editingApp.cdnCacheEnabled" style="display: flex; align-items: center; gap: 8px;">
            <label style="margin: 0; font-size: 13px; color: #475569;">自定义缓存时长：</label>
            <select v-model="editingApp.cdnCacheTtl" style="padding: 4px 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 13px; background: #fff;">
              <option :value="0">不缓存 (0秒，每次回源)</option>
              <option :value="600">10 分钟 (600秒)</option>
              <option :value="3600">1 小时 (3600秒)</option>
              <option :value="86400">1 天 (86400秒)</option>
              <option :value="604800">7 天 (604800秒)</option>
              <option :value="2592000">30 天 (2592000秒)</option>
            </select>
          </div>
        </div>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748B; line-height: 1.5;">
          💡 <strong>提示</strong>：关闭缓存或设为“不缓存”时，下载请求将实时穿透至存储桶，确保您更换安装包后客户端<strong>100% 立即下载到新版本</strong>；开启并设定时长后，将由 Cloudflare 全球 CDN 边缘节点代理拦截，免除 R2 读取与流量消耗。
        </p>
      </div>
      <div class="form-group changelog-group">
        <div class="changelog-header-row">
          <label style="margin: 0;">更新日志 (Changelog - 支持 Markdown 格式)</label>
          <div class="changelog-tabs">
            <button type="button" class="tab-pill" :class="{ active: changelogTab === 'edit' }" @click="changelogTab = 'edit'">编辑</button>
            <button type="button" class="tab-pill" :class="{ active: changelogTab === 'preview' }" @click="changelogTab = 'preview'">预览</button>
          </div>
        </div>

        <div v-show="changelogTab === 'edit'" class="changelog-editor-card">
          <div class="changelog-quick-tools">
            <button type="button" class="tool-btn" @click="insertMdPrefix('- ')">• 列表项</button>
            <button type="button" class="tool-btn" @click="insertMdWrap('**', '**')"><b>B</b> 加粗</button>
            <button type="button" class="tool-btn" @click="insertMdWrap('`', '`')">&lt;/&gt; 代码</button>
            <button type="button" class="tool-btn" @click="insertMdPrefix('### ')">H3 标题</button>
          </div>
          <textarea
            v-model="editingApp.updateLog"
            rows="4"
            class="changelog-textarea"
            placeholder="填写新版本更新日志，支持标准 Markdown 格式，例如：&#10;- 修复已知崩溃与闪退问题&#10;- **全新界面设计优化**&#10;- 提升传输性能与稳定性"
          ></textarea>
        </div>
        <div v-show="changelogTab === 'preview'" class="changelog-preview-card" v-html="renderMarkdown(editingApp.updateLog)"></div>
      </div>
      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <label style="margin: 0;">App 存储基础目录 (在 update/apk/ 下按应用隔离子目录)</label>
          <button
            v-if="editingApp.appId"
            type="button"
            class="btn-text-primary"
            style="font-size: 11px; padding: 0; background: none; border: none; color: #2563EB; cursor: pointer; text-decoration: underline;"
            @click="setAppSubDirDefault"
          >
            设为独立子目录: update/apk/{{ editingApp.appId }}
          </button>
        </div>
        <input type="text" v-model="editingApp.apkUploadDir" @input="onApkDirInput" placeholder="例如 update/apk/com.example.app 或 sesame" />
        <span style="font-size: 11px; color: #64748B; margin-top: 2px; display: block;">
          当前 App 基础子目录：<code>/{{ getEffectiveAppDir(editingApp) }}/</code>（不同应用独立子目录，避免不同 APK 混淆堆叠）
        </span>
      </div>

      <!-- 配套包管理 -->
      <div class="packages-section">
        <div class="section-title-btn">
          <h5>关联安装包列表 (Packages)</h5>
          <button class="btn-sm-secondary" @click="addPackageItem">+ 添加安装包</button>
        </div>

        <div v-if="editingApp.packages.length === 0" class="empty-packages">
          暂未关联任何 APK 包（支持同时关联原版、Xposed模块版、LSPatch版等配套组件）。
        </div>

        <div v-for="(pkg, idx) in editingApp.packages" :key="idx" class="package-edit-card">
          <div class="package-card-header">
            <h6>安装包 #{{ idx + 1 }}</h6>
            <button class="btn-text-danger btn-sm" @click="removePackageItem(idx)">移除该包</button>
          </div>

          <!-- APK 拖拽上传 / 点击选择区域 -->
          <div
            class="apk-dropzone"
            :class="{ 'is-dragover': pkg._dragOver, 'is-uploading': pkg._uploading }"
            @dragover.prevent="pkg._dragOver = true"
            @dragleave.prevent="pkg._dragOver = false"
            @drop.prevent="onApkFileDrop($event, pkg)"
            @click="triggerApkSelect(idx)"
          >
            <input
              :id="'apkFileInput_' + idx"
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              hidden
              @change="onApkFileSelected($event, pkg)"
            />

            <div v-if="pkg._uploading" class="apk-upload-progress">
              <div class="apk-progress-text">
                <span>正在极速上传 APK: {{ pkg._uploadFileName }}</span>
                <strong>{{ pkg._uploadProgress }}%</strong>
              </div>
              <div class="apk-progress-bar">
                <div class="apk-progress-fill" :style="{ width: pkg._uploadProgress + '%' }"></div>
              </div>
            </div>

            <div v-else-if="pkg.downloadUrl" class="apk-file-success">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="#10B981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <div class="apk-success-info">
                <strong>已就绪：{{ decodeURIComponent(pkg.downloadUrl.split('/').pop()) }}</strong>
                <span>{{ pkg.apkSize }} bytes | 路径: {{ pkg.downloadUrl }}</span>
              </div>
              <span class="btn-replace-apk">点击或拖拽新 APK 替换</span>
            </div>

            <div v-else class="apk-dropzone-empty">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="#64748B" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div class="apk-dropzone-prompt">
                <strong>点击选择或直接将 APK 安装包拖拽到此处</strong>
                <span>自动上传至 <code>/{{ getPackageUploadDir(pkg) }}/</code> 目录、自动提取文件名与校验码</span>
                <button type="button" class="btn-mobile-select-apk" @click.stop="triggerApkSelect(idx)">
                    点击从手机选取 APK 文件
                </button>
              </div>
            </div>
          </div>

          <div class="form-group-row">
            <div class="form-group">
              <label>包唯一标识 (Package ID)</label>
              <input type="text" v-model="pkg.packageId" @input="pkg._idAuto = false" placeholder="例如 main_apk / lspatch_apk / module_apk" />
            </div>
            <div class="form-group">
              <label>包显示名称 (Name)</label>
              <input type="text" v-model="pkg.packageName" @input="pkg._nameAuto = false" placeholder="例如 官方原版 / 独立 Xposed 模块" />
            </div>
          </div>

          <div class="form-group-row">
            <div class="form-group">
              <label>包独立子目录 (可选，在此包目录下再细分目录)</label>
              <input type="text" v-model="pkg.subDir" placeholder="例如 arm64-v8a 或 v2.0 (选填)" />
            </div>
            <div class="form-group">
              <label>最终直链与存储路径预览</label>
              <input type="text" readonly :value="'/raw/' + getPackageUploadDir(pkg) + '/[文件名.apk]'" style="background: #F1F5F9; color: #475569;" />
            </div>
          </div>

          <div class="form-group">
            <label>下载直链地址 (Download URL)</label>
            <input type="text" v-model="pkg.downloadUrl" placeholder="输入 /raw/update/apk/.../app.apk" />
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label>文件大小 (Bytes)</label>
              <input type="number" v-model="pkg.apkSize" />
            </div>
            <div class="form-group">
              <label>文件 MD5 校验码</label>
              <input type="text" v-model="pkg.apkMd5" placeholder="关联文件或直链的 MD5" />
            </div>
          </div>
          <div class="form-group">
            <label>包功能描述</label>
            <input type="text" v-model="pkg.description" placeholder="简单说明此包的特征或适用范围" />
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-primary" @click="saveAppUpdate" :disabled="savingUpdate">
          {{ savingUpdate ? '正在保存...' : '保存并发布新版本' }}
        </button>
        <button class="btn-secondary" @click="editingApp = null">取消并返回</button>
      </div>
    </div>
  </div>
</template>
