<template>
  <div class="admin-wrapper">
    <!-- 未登录状态：独立全屏管理员鉴权中心 -->
    <div v-if="!isLoggedIn" class="admin-auth-screen">
      <div class="auth-card">
        <div class="auth-card-header">
          <img src="/assets/homescreen.png" alt="FlareDrive" style="height: 36px; margin-bottom: 8px;" />
          <h2 class="auth-title">FlareDrive 管理中心</h2>
          <p class="auth-desc">请输入管理员凭证以解锁运维与应用管理面板</p>
        </div>

        <form class="auth-form" @submit.prevent="handleLogin">
          <div class="auth-field">
            <label>管理员账号</label>
            <input type="text" v-model="loginUsername" placeholder="环境变量中的账号 (如 admin)" required autocomplete="username" />
          </div>
          <div class="auth-field">
            <label>管理员密码</label>
            <input type="password" v-model="loginPassword" placeholder="环境变量中的密码" required autocomplete="current-password" />
          </div>

          <div class="auth-options">
            <label class="remember-label">
              <input type="checkbox" v-model="rememberMe" /> 保持登录状态
            </label>
            <a href="javascript:void(0)" class="auth-help-link" @click="showForgotTips = true">凭证重置指南</a>
          </div>

          <button type="submit" class="btn-auth-submit" :disabled="authLoading">
            {{ authLoading ? '正在验证...' : '进入管理控制台' }}
          </button>
        </form>

        <div class="auth-card-footer">
          <a href="/" class="btn-auth-home">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>返回网盘文件库</span>
          </a>
        </div>
      </div>
    </div>

    <!-- 已登录状态：独立全屏控制台工作台 -->
    <div v-else class="admin-dashboard-screen">
      <!-- 顶栏导航 -->
      <header class="dash-header">
        <div class="dash-header-inner">
          <div class="dash-brand">
            <img src="/assets/homescreen.png" alt="FlareDrive" style="height: 26px" />
            <div class="dash-title-wrap">
              <h2 class="dash-title">FlareDrive 控制台</h2>
              <span class="dash-edge-badge">
                <span class="dash-dot"></span>
                Cloudflare 边缘就绪
              </span>
            </div>
          </div>

          <div class="dash-actions">
            <a href="/" class="btn-dash-back" title="返回网盘文件列表">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>返回网盘</span>
            </a>
            <button class="btn-dash-logout" @click="logout" title="退出管理员登录">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </header>

      <!-- 主工作区 -->
      <main class="dash-main-container">
        <!-- 标签页导航 -->
        <nav class="dash-nav-tabs">
          <button class="dash-tab-btn" :class="{ active: activeTab === 'storage' }" @click="activeTab = 'storage'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span>S3 运维与存储</span>
          </button>
          <button class="dash-tab-btn" :class="{ active: activeTab === 'updates' }" @click="activeTab = 'updates'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span>App 版本管理</span>
          </button>
          <button class="dash-tab-btn" :class="{ active: activeTab === 'defense' }" @click="activeTab = 'defense'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>流量防御与审计</span>
          </button>
        </nav>

        <!-- 标签页 1: S3 运维与存储 -->
        <div v-if="activeTab === 'storage'" class="dash-content-card">
          <div class="dash-card-header">
            <h3>存储空间与对象概览</h3>
            <span class="dash-card-subtitle">实时监控 Cloudflare R2 存储桶对象分布及容量</span>
          </div>

          <div class="stat-overview-grid">
            <div class="metric-card">
              <span class="metric-label">总存储配额 (Quota)</span>
              <strong class="metric-val">{{ formatSize(storageStats?.quotaBytes || 10737418240) }}</strong>
              <span class="metric-hint">免费级标准限额 10 GB</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">已使用容量 (Used)</span>
              <strong class="metric-val">{{ storageStats?.loading ? '读取中...' : formatSize(storageStats?.usedBytes || 0) }}</strong>
              <span class="metric-hint">已使用 {{ (((storageStats?.usedBytes || 0) / (storageStats?.quotaBytes || 10737418240)) * 100).toFixed(1) }}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">文件对象总数 (Files)</span>
              <strong class="metric-val">{{ storageStats?.loading ? '...' : (storageStats?.fileCount || 0) }}</strong>
              <span class="metric-hint">存储桶内实际文件</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">文件夹占位总数 (Folders)</span>
              <strong class="metric-val">{{ storageStats?.loading ? '...' : (storageStats?.folderCount || 0) }}</strong>
              <span class="metric-hint">虚拟目录结构节点</span>
            </div>
          </div>

          <div class="dash-card-header" style="margin-top: 28px;">
            <h3>S3 操作配额与网络流量指标</h3>
            <span class="dash-card-subtitle">
              {{ storageStats?.kvStats?.enabled ? '实时采集自 Cloudflare KV 统计数据库 (后台异步无感统计)' : '官方标准免费额度与出站免流标准 (可在 Pages 绑定 KV: KV 开启实时统计)' }}
            </span>
          </div>

          <div class="stat-card-grid">
            <div class="stat-mini-card">
              <div class="card-label">S3 A 类操作 (写入/变更)</div>
              <div class="card-value">
                <template v-if="storageStats?.kvStats?.enabled">
                  {{ storageStats.kvStats.classA }} <span class="card-unit">次已执行 (月限额 100万次免费)</span>
                </template>
                <template v-else>
                  1,000,000 <span class="card-unit">次/月免费标准限额</span>
                </template>
              </div>
              <div class="card-desc">PutObject / 分片上传 / 删除 / 创建文件夹</div>
            </div>

            <div class="stat-mini-card">
              <div class="card-label">S3 B 类操作 (读取/检索)</div>
              <div class="card-value">
                <template v-if="storageStats?.kvStats?.enabled">
                  {{ storageStats.kvStats.classB }} <span class="card-unit">次已执行 (月限额 1000万次免费)</span>
                </template>
                <template v-else>
                  10,000,000 <span class="card-unit">次/月免费标准限额</span>
                </template>
              </div>
              <div class="card-desc">GetObject / ListObjects / 文件下载与目录检索</div>
            </div>

            <div class="stat-mini-card">
              <div class="card-label">总请求数 (Requests)</div>
              <div class="card-value">
                <template v-if="storageStats?.kvStats?.enabled">
                  {{ storageStats.kvStats.totalRequests }} <span class="card-unit">次请求已记录</span>
                </template>
                <template v-else>
                  未绑定 KV <span class="card-unit">绑定后开始计数</span>
                </template>
              </div>
              <div class="card-desc">全站 API、浏览与资源访问总计</div>
            </div>

            <div class="stat-mini-card">
              <div class="card-label">总下载量 (Downloads)</div>
              <div class="card-value">
                <template v-if="storageStats?.kvStats?.enabled">
                  {{ storageStats.kvStats.totalDownloads || 0 }} <span class="card-unit">次文件下载</span>
                </template>
                <template v-else>
                  0 <span class="card-unit">次下载</span>
                </template>
              </div>
              <div class="card-desc">/raw/ 资源与 APK 文件外链下载次数</div>
            </div>

            <div class="stat-mini-card">
              <div class="card-label">累计传输流量 (Traffic)</div>
              <div class="card-value">
                <template v-if="storageStats?.kvStats?.enabled">
                  {{ formatSize(storageStats.kvStats.totalTrafficBytes || 0) }}
                </template>
                <template v-else>
                  $0.00 <span class="card-unit">R2 永久免收流出流量费</span>
                </template>
              </div>
              <div class="card-desc">经由 Cloudflare 边缘节点传输的真实数据流</div>
            </div>

            <div class="stat-mini-card">
              <div class="card-label">最新访客 IP / 地域</div>
              <div class="card-value">
                <template v-if="storageStats?.kvStats?.enabled && storageStats.kvStats.lastClient">
                  {{ storageStats.kvStats.lastClient.ip }} <span class="card-unit">[{{ storageStats.kvStats.lastClient.country }}]</span>
                </template>
                <template v-else>
                  暂无访客数据
                </template>
              </div>
              <div class="card-desc">
                {{ storageStats?.kvStats?.enabled ? 'KV 实时捕获记录' : '在 Pages 设置中绑定 KV: KV 开启实时审计' }}
              </div>
            </div>
          </div>

          <div class="sync-action-box">
            <div class="sync-info-text">
              <strong>全桶校准时间：</strong>
              <span>{{ storageStats?.lastUpdated ? new Date(storageStats.lastUpdated).toLocaleString() : '暂未校准，点击右侧按钮执行首次校准' }}</span>
              <p>上传或删除时系统会增量计算。若数据存在轻微偏差，可随时发起全桶扫描重新同步。</p>
            </div>
            <button class="btn-action-primary" :disabled="storageLoading" @click="recalculateStorage">
              {{ storageLoading ? '正在全桶扫描计算中...' : '重新扫描并校准存储大小' }}
            </button>
          </div>
        </div>

        <!-- 标签页 2: App 版本管理 -->
        <div v-if="activeTab === 'updates'" class="dash-content-card">
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
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="editingApp.isForceUpdate" /> 强制更新 (锁定主程序需更新后才能继续运行)
              </label>
            </div>
            <div class="form-group">
              <label>更新日志 (Changelog)</label>
              <textarea v-model="editingApp.updateLog" rows="3" placeholder="填写新版本更新日志..."></textarea>
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
                  ⚡ 设为独立子目录: update/apk/{{ editingApp.appId }}
                </button>
              </div>
              <input type="text" v-model="editingApp.apkUploadDir" @input="onApkDirInput" placeholder="例如 update/apk/com.example.app" />
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
                      <strong>已就绪：{{ pkg.downloadUrl.split('/').pop() }}</strong>
                      <span>{{ formatSize(pkg.apkSize) }} | 路径: {{ pkg.downloadUrl }}</span>
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
                    </div>
                  </div>
                </div>

                <div class="form-group-row">
                  <div class="form-group">
                    <label>包唯一标识 (Package ID)</label>
                    <input type="text" v-model="pkg.packageId" placeholder="例如 main_apk / lspatch_apk / module_apk" />
                  </div>
                  <div class="form-group">
                    <label>包显示名称 (Name)</label>
                    <input type="text" v-model="pkg.packageName" placeholder="例如 官方原版 / 独立 Xposed 模块" />
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

        <!-- 标签页 3: 流量防御与审计 -->
        <div v-if="activeTab === 'defense'" class="dash-content-card">
          <div class="dash-card-header">
            <h3>防恶意刷量与网络安全防护</h3>
            <span class="dash-card-subtitle">利用 Cloudflare 边缘计算与网络安全规则保障服务稳定性</span>
          </div>

          <div class="defense-cards-list">
            <div class="defense-card">
              <div class="defense-card-header">
                <span class="defense-tag">边缘缓存</span>
                <strong>/raw/ 资源 Edge Cache Everything 优化</strong>
              </div>
              <p>公开下载的大文件与安装包建议在 Cloudflare 规则中开启 "Cache Everything"，通过 Edge TTL 拦截高频刷量，由全球 CDN 边缘节点直接分发，完全免除 R2 的 Class B 操作数消耗与源站开销。</p>
            </div>

            <div class="defense-card">
              <div class="defense-card-header">
                <span class="defense-tag">WAF 限流</span>
                <strong>Cloudflare Rate Limiting 速率限制</strong>
              </div>
              <p>在 Cloudflare 控制台「安全性」->「WAF」中为 <code>/api/*</code> 配置速率限制规则（如单 IP 10 秒内请求超 60 次触发人机质询），有效防范脚本暴力扫描与遍历攻击。</p>
            </div>

            <div class="defense-card">
              <div class="defense-card-header">
                <span class="defense-tag">日志方案</span>
                <strong>访问日志标准流式处理架构 (零内存泄露)</strong>
              </div>
              <p>Serverless 边缘 Worker 无常驻内存。建议使用 <strong>Cloudflare Web Analytics</strong>（官方免费、零资源开销查看访客地域、IP 与请求次数），或通过 <strong>Cloudflare Logpush</strong> 流式归档至专属日志分析平台，杜绝在 Worker 内部堆积日志导致内存溢出崩溃。</p>
            </div>
          </div>

          <!-- 边缘实时请求与下载审计流水 -->
          <div class="dash-card-header" style="margin-top: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <div>
                <h3 style="margin: 0; font-size: 15px;">边缘实时请求与下载审计流水</h3>
                <span class="dash-card-subtitle">
                  {{ storageStats?.kvStats?.enabled ? '由 Cloudflare KV 实时流式记录的最新访问流水 (最新 30 条真实记录)' : '可在 Pages 绑定 KV: KV 开启持久化实时流水审计' }}
                </span>
              </div>
              <button class="btn-sm-secondary" @click="fetchStorageStats" :disabled="storageLoading">
                {{ storageLoading ? '刷新中...' : '刷新审计日志' }}
              </button>
            </div>
          </div>

          <div v-if="!storageStats?.kvStats?.enabled" class="kv-unbind-tip">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#F59E0B" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <strong>当前 Pages 项目尚未绑定 KV 命名空间</strong>
              <p>绑定方式：登录 Cloudflare 控制台 -> Workers & Pages -> 进入本项目 -> 设置 -> Functions -> 绑定 KV 命名空间（变量名：<code>KV</code>）。绑定后边缘 Worker 将自动永久记录真实请求次数、文件下载量与出站流量流水，杜绝虚构数据。</p>
            </div>
          </div>

          <div v-else-if="!storageStats?.kvStats?.recentLogs || storageStats.kvStats.recentLogs.length === 0" class="empty-list-info">
            暂无请求记录（当有用户访问网盘、浏览或下载文件时，将在此自动实时流式生成审计日志）。
          </div>

          <div v-else class="audit-log-table-wrap">
            <table class="audit-log-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>访客 IP / 地区</th>
                  <th>类型</th>
                  <th>访问路径</th>
                  <th>流量大小</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(log, lIdx) in storageStats.kvStats.recentLogs" :key="lIdx">
                  <td class="log-time">{{ new Date(log.time).toLocaleTimeString() }}</td>
                  <td>
                    <span class="log-ip">{{ log.ip }}</span>
                    <span class="log-country">[{{ log.country }}]</span>
                  </td>
                  <td>
                    <span class="badge-op" :class="{ 'badge-download': log.opType === '文件下载', 'badge-write': log.opType?.includes('写') }">
                      {{ log.opType }}
                    </span>
                  </td>
                  <td class="log-path" :title="log.path">{{ log.path }}</td>
                  <td class="log-bytes">{{ formatSize(log.bytes) }}</td>
                  <td>
                    <span class="log-status" :class="{ 'status-ok': log.status < 400, 'status-err': log.status >= 400 }">
                      {{ log.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div style="flex:1"></div>
      <Footer />
    </div>

    <!-- 忘记密码/凭证配置指南弹窗 -->
    <div v-if="showForgotTips" class="admin-modal-overlay" @click.self="showForgotTips = false">
      <div class="admin-modal-card">
        <div class="forgot-tips-header">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
          </svg>
          <h4>管理员凭证配置与重置指南</h4>
        </div>
        <div class="forgot-tips-content">
          <p>本系统采用 Serverless 边缘架构，管理员凭证通过环境变量直接校验：</p>
          <ol>
            <li>登录 <strong>Cloudflare 控制台</strong>。</li>
            <li>进入 <strong>Workers & Pages</strong> -> 选择您的网盘 Pages 项目。</li>
            <li>切换到 <strong>Settings (设置)</strong> -> <strong>Variables and Secrets (变量与机密)</strong>。</li>
            <li>配置管理员环境变量，变量名统一采用下划线格式：
              <ul>
                <li>示例变量名：<code>admin_123456</code>，变量值填写：<code>*</code>（代表拥有全局所有路径的读写权限）。</li>
                <li>若需要其他普通用户，可配置如 <code>user1_123456</code>，变量值填写允许访问的目录前缀。</li>
              </ul>
            </li>
            <li>修改保存后，点击 <strong>Retry deployment (重新部署)</strong> 即可立即生效。</li>
          </ol>
        </div>
        <button class="btn-secondary" @click="showForgotTips = false" style="margin-top: 15px; width: 100%;">关闭指南</button>
      </div>
    </div>
  </div>
</template>

<script>
import Footer from "./Footer.vue";

export default {
  name: "Admin",
  components: {
    Footer
  },
  data: () => ({
    isLoggedIn: false,
    authLoading: false,
    storageLoading: false,
    savingUpdate: false,
    showForgotTips: false,

    loginUsername: "",
    loginPassword: "",
    rememberMe: true,

    activeTab: "storage",
    storageStats: {
      usedBytes: 0,
      quotaBytes: 10 * 1024 * 1024 * 1024,
      fileCount: 0,
      folderCount: 0,
      lastUpdated: null,
      loading: true,
      kvStats: null
    },
    appsUpdates: {},
    editingApp: null,
    isNewApp: false
  }),

  created() {
    // 1. Axios 携带 Token
    axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
      if (token && config.url) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    });

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401 && error.config && !error.config.url.endsWith("/api/login")) {
          this.isLoggedIn = false;
        }
        return Promise.reject(error);
      }
    );

    // 2. 检查持久化登录态
    const savedToken = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
    if (savedToken) {
      this.isLoggedIn = true;
      this.fetchStorageStats();
      this.fetchAppUpdates();
    }
  },

  methods: {
    formatSize(size) {
      if (!size) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB"];
      let i = 0;
      while (size >= 1024) {
        size /= 1024;
        i++;
      }
      return `${size.toFixed(1)} ${units[i]}`;
    },

    handleLogin() {
      if (!this.loginUsername || !this.loginPassword) {
        alert("请输入账号和密码");
        return;
      }
      this.authLoading = true;
      axios.post("/api/login", {
        username: this.loginUsername,
        password: this.loginPassword
      })
      .then(res => {
        const token = res.data.token;
        if (this.rememberMe) {
          localStorage.setItem("flaredrive_token", token);
          localStorage.setItem("flaredrive_username", this.loginUsername);
        } else {
          sessionStorage.setItem("flaredrive_token", token);
        }
        this.isLoggedIn = true;
        this.loginPassword = "";
        this.fetchStorageStats();
        this.fetchAppUpdates();
      })
      .catch(err => {
        alert("登录失败：" + (err.response?.data?.error || err.message));
      })
      .finally(() => {
        this.authLoading = false;
      });
    },

    logout() {
      localStorage.removeItem("flaredrive_token");
      sessionStorage.removeItem("flaredrive_token");
      this.isLoggedIn = false;
      window.location.href = "/";
    },

    fetchStorageStats() {
      this.storageStats.loading = true;
      axios.get("/api/storage/usage")
        .then(res => {
          if (res.data) {
            this.storageStats = {
              ...res.data,
              loading: false
            };
          }
        })
        .catch(err => {
          console.error("获取存储统计失败:", err);
          this.storageStats.loading = false;
        });
    },

    recalculateStorage() {
      if (!confirm("确定要全量扫描并校准存储大小吗？这可能需要几十秒。")) return;
      this.storageLoading = true;
      axios.post("/api/storage/recalculate")
        .then(res => {
          if (res.data.success) {
            this.storageStats = {
              ...res.data.stats,
              loading: false
            };
            alert("容量校准成功！");
          }
        })
        .catch(err => alert("校准容量失败：" + (err.response?.data?.error || err.message)))
        .finally(() => this.storageLoading = false);
    },

    fetchAppUpdates() {
      axios.get("/api/admin/update/publish")
        .then(res => {
          this.appsUpdates = res.data.apps || {};
        })
        .catch(err => {
          console.error("获取 App 更新配置失败:", err);
          this.appsUpdates = {};
        });
    },

    onAppIdInput() {
      if (this.isNewApp && !this.editingApp._dirCustomized) {
        const id = (this.editingApp.appId || "").trim();
        this.editingApp.apkUploadDir = id ? `update/apk/${id}` : "update/apk";
      }
    },

    onApkDirInput() {
      if (this.editingApp) {
        this.editingApp._dirCustomized = true;
      }
    },

    setAppSubDirDefault() {
      if (this.editingApp && this.editingApp.appId) {
        this.editingApp.apkUploadDir = `update/apk/${this.editingApp.appId.trim()}`;
        this.editingApp._dirCustomized = true;
      }
    },

    getEffectiveAppDir(app) {
      if (!app) return "update/apk";
      let dir = (app.apkUploadDir || "").trim().replace(/^\/+|\/+$/g, "");
      if (!dir) {
        dir = app.appId ? `update/apk/${app.appId.trim()}` : "update/apk";
      }
      return dir;
    },

    getPackageUploadDir(pkg) {
      const baseDir = this.getEffectiveAppDir(this.editingApp);
      if (pkg && pkg.subDir && pkg.subDir.trim()) {
        const sub = pkg.subDir.trim().replace(/^\/+|\/+$/g, "");
        return `${baseDir}/${sub}`;
      }
      return baseDir;
    },

    createAppUpdate() {
      this.editingApp = {
        appId: "",
        appName: "",
        latestVersionCode: 100,
        latestVersionName: "1.0.0",
        updateLog: "",
        isForceUpdate: false,
        apkUploadDir: "update/apk",
        _dirCustomized: false,
        packages: []
      };
      this.isNewApp = true;
    },

    editAppUpdate(id, app) {
      this.editingApp = {
        appId: id,
        apkUploadDir: app.apkUploadDir || `update/apk/${id}`,
        _dirCustomized: true,
        ...JSON.parse(JSON.stringify(app))
      };
      this.isNewApp = false;
    },

    deleteAppUpdate(id) {
      if (!confirm(`确定要彻底删除该应用 (${id}) 的更新配置吗？`)) return;
      axios.post("/api/admin/update/publish", {
        appId: id,
        deleteAction: true
      })
      .then(() => {
        alert("删除成功！");
        this.fetchAppUpdates();
      })
      .catch(err => alert("删除失败：" + (err.response?.data?.error || err.message)));
    },

    addPackageItem() {
      this.editingApp.packages.push({
        packageId: "",
        packageName: "",
        subDir: "",
        versionCode: this.editingApp.latestVersionCode,
        versionName: this.editingApp.latestVersionName,
        description: "",
        downloadUrl: "",
        apkSize: 0,
        apkMd5: ""
      });
    },

    removePackageItem(idx) {
      this.editingApp.packages.splice(idx, 1);
    },

    triggerApkSelect(idx) {
      const input = document.getElementById('apkFileInput_' + idx);
      if (input) input.click();
    },

    onApkFileDrop(ev, pkg) {
      pkg._dragOver = false;
      let files = [];
      if (ev.dataTransfer.items) {
        files = [...ev.dataTransfer.items]
          .filter(item => item.kind === 'file')
          .map(item => item.getAsFile())
          .filter(Boolean);
      }
      if (!files.length && ev.dataTransfer.files) {
        files = Array.from(ev.dataTransfer.files);
      }
      if (files.length > 0) {
        this.uploadApkForPackage(files[0], pkg);
      }
    },

    onApkFileSelected(ev, pkg) {
      const files = ev.target.files;
      if (files && files.length > 0) {
        this.uploadApkForPackage(files[0], pkg);
        ev.target.value = "";
      }
    },

    async uploadApkForPackage(file, pkg) {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.apk')) {
        if (!confirm(`文件 "${file.name}" 不是 .apk 格式，确定要作为 Android 安装包上传吗？`)) {
          return;
        }
      }

      pkg._uploading = true;
      pkg._uploadFileName = file.name;
      pkg._uploadProgress = 0;
      pkg.apkSize = file.size;

      // 自动填充包名和 ID（若当前为空）
      const baseName = file.name.replace(/\.apk$/i, '');
      if (!pkg.packageId) {
        pkg.packageId = baseName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      }
      if (!pkg.packageName) {
        pkg.packageName = baseName;
      }
      pkg.versionCode = this.editingApp.latestVersionCode;
      pkg.versionName = this.editingApp.latestVersionName;

      // 异步计算文件的 SHA-256 / MD5 哈希
      this.computeFileMd5(file).then(md5 => {
        if (md5) pkg.apkMd5 = md5;
      });

      const uploadDir = this.getPackageUploadDir(pkg);

      try {
        const uploadUrl = `/api/write/items/${uploadDir}/${encodeURIComponent(file.name)}`;
        const onUploadProgress = (e) => {
          if (e.total) {
            pkg._uploadProgress = Math.round((e.loaded * 100) / e.total);
          }
        };

        await axios.put(uploadUrl, file, {
          onUploadProgress,
          headers: {
            "Content-Type": "application/vnd.android.package-archive"
          }
        });

        pkg.downloadUrl = `/raw/${uploadDir}/${file.name}`;
        pkg._uploading = false;
      } catch (err) {
        pkg._uploading = false;
        alert("APK 安装包上传失败：" + (err.response?.data?.error || err.message));
      }
    },

    async computeFileMd5(file) {
      try {
        const slice = file.size > 20 * 1024 * 1024 ? file.slice(0, 10 * 1024 * 1024) : file;
        const buffer = await slice.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
      } catch (e) {
        return "";
      }
    },

    saveAppUpdate() {
      if (!this.editingApp.appId || !this.editingApp.appName || !this.editingApp.latestVersionCode || !this.editingApp.latestVersionName) {
        alert("请填写所有必填字段 (*)");
        return;
      }

      // 确保每个关联包同步最新的版本代码与名称
      if (this.editingApp.packages) {
        for (const pkg of this.editingApp.packages) {
          if (!pkg.versionCode) pkg.versionCode = parseInt(this.editingApp.latestVersionCode, 10);
          if (!pkg.versionName) pkg.versionName = this.editingApp.latestVersionName;
        }
      }

      this.savingUpdate = true;
      axios.post("/api/admin/update/publish", this.editingApp)
        .then(() => {
          alert("应用更新发布成功！");
          this.editingApp = null;
          this.fetchAppUpdates();
        })
        .catch(err => alert("保存发布失败：" + (err.response?.data?.error || err.message)))
        .finally(() => this.savingUpdate = false);
    }
  }
};
</script>

<style scoped>
.admin-wrapper {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F8FAFC;
  color: #0F172A;
}

/* 鉴权登录卡片 */
.admin-auth-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 32px 28px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
}

.auth-card-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0F172A;
}

.auth-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: #64748B;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.auth-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 14px;
  background: #FFFFFF;
  box-sizing: border-box;
}

.auth-field input:focus {
  outline: none;
  border-color: #0F172A;
}

.auth-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.remember-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  cursor: pointer;
}

.auth-help-link {
  color: #2563EB;
  text-decoration: none;
}

.btn-auth-submit {
  width: 100%;
  padding: 11px;
  background: #0F172A;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-auth-submit:hover {
  background: #1E293B;
}

.auth-card-footer {
  margin-top: 24px;
  text-align: center;
  border-top: 1px solid #F1F5F9;
  padding-top: 16px;
}

.btn-auth-home {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748B;
  font-size: 13px;
  text-decoration: none;
}

.btn-auth-home:hover {
  color: #0F172A;
}

/* 控制台顶栏 */
.dash-header {
  background: #0F172A;
  color: #FFFFFF;
  border-bottom: 1px solid #1E293B;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
}

.dash-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dash-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dash-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dash-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #F8FAFC;
}

.dash-edge-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: rgba(246, 130, 31, 0.15);
  border: 1px solid rgba(246, 130, 31, 0.4);
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  color: #F6821F;
}

.dash-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 6px #22C55E;
}

.dash-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-dash-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #1E293B;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #F1F5F9;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.btn-dash-back:hover {
  background: #334155;
  color: #FFFFFF;
}

.btn-dash-logout {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #FCA5A5;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-dash-logout:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #FFFFFF;
}

/* 主工作区 */
.dash-main-container {
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px 60px;
  box-sizing: border-box;
}

.dash-nav-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 8px;
}

.dash-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.dash-tab-btn:hover {
  color: #0F172A;
  background: #E2E8F0;
}

.dash-tab-btn.active {
  background: #0F172A;
  color: #FFFFFF;
  font-weight: 600;
}

.dash-content-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.dash-card-header {
  margin-bottom: 16px;
}

.dash-card-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #0F172A;
}

.dash-card-subtitle {
  font-size: 12px;
  color: #64748B;
}

.stat-overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.metric-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.metric-val {
  font-size: 20px;
  font-weight: 700;
  color: #0F172A;
}

.metric-hint {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 4px;
}

.stat-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-mini-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 12px;
}

.card-label {
  font-size: 11px;
  color: #64748B;
  margin-bottom: 4px;
}

.card-value {
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
}

.card-unit {
  font-size: 10px;
  font-weight: 400;
  color: #64748B;
}

.card-desc {
  font-size: 10px;
  color: #94A3B8;
  margin-top: 3px;
}

.sync-action-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 16px 20px;
  margin-top: 20px;
  gap: 20px;
}

.sync-info-text {
  flex: 1;
  font-size: 12px;
  color: #475569;
}

.sync-info-text p {
  margin: 4px 0 0 0;
  font-size: 11px;
  color: #64748B;
}

.btn-action-primary {
  padding: 10px 18px;
  background: #0F172A;
  border: none;
  border-radius: 6px;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-action-primary:hover {
  background: #1E293B;
}

/* 应用更新管理 */
.section-title-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-sm-primary {
  padding: 6px 14px;
  background: #0F172A;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-sm-secondary {
  padding: 6px 12px;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  color: #334155;
  font-size: 12px;
  cursor: pointer;
}

.app-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.app-dash-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.app-dash-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.app-display-name {
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
}

.app-id-tag {
  font-size: 11px;
  color: #64748B;
  font-family: monospace;
  margin-top: 2px;
}

.app-version-badge {
  padding: 2px 8px;
  background: #0F172A;
  color: #FFFFFF;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

.app-meta-line {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748B;
  margin-bottom: 8px;
}

.app-changelog-preview {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 11px;
  color: #334155;
  line-height: 1.4;
  max-height: 60px;
  overflow-y: auto;
}

.app-dash-card-footer {
  display: flex;
  gap: 8px;
  border-top: 1px solid #E2E8F0;
  padding-top: 12px;
  margin-top: 12px;
}

.btn-app-edit {
  flex: 1;
  padding: 6px 12px;
  background: #0F172A;
  border: 1px solid #0F172A;
  border-radius: 6px;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-app-del {
  padding: 6px 12px;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  color: #EF4444;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

/* 防御卡片 */
.defense-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.defense-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 12px 14px;
}

.defense-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #0F172A;
}

.defense-tag {
  background: #E2E8F0;
  color: #334155;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.defense-card p {
  margin: 0;
  font-size: 12px;
  color: #64748B;
  line-height: 1.6;
}

/* 弹窗指南 */
.admin-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.admin-modal-card {
  background: #FFFFFF;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.forgot-tips-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.forgot-tips-header h4 {
  margin: 0;
  font-size: 15px;
  color: #0F172A;
}

.forgot-tips-content {
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
}

.forgot-tips-content ol {
  padding-left: 18px;
  margin: 8px 0;
}

.forgot-tips-content code {
  background: #F1F5F9;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: monospace;
}

.btn-secondary {
  padding: 9px;
  background: #F1F5F9;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  color: #334155;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.btn-primary {
  padding: 8px 16px;
  background: #0F172A;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #475569;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 12px;
  box-sizing: border-box;
}

.form-group-row {
  display: flex;
  gap: 12px;
}

.form-group-row .form-group {
  flex: 1;
}

.form-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}

.package-edit-card {
  border: 1px dashed #CBD5E1;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  background: #F8FAFC;
}

.package-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.btn-text-danger {
  background: none;
  border: none;
  color: #EF4444;
  cursor: pointer;
  font-size: 12px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  border-top: 1px solid #E2E8F0;
  padding-top: 16px;
}

/* --- APK 拖拽上传与文件选择区域 --- */
.apk-dropzone {
  border: 2px dashed #CBD5E1;
  border-radius: 8px;
  padding: 16px;
  background: #FFFFFF;
  text-align: center;
  cursor: pointer;
  margin-bottom: 14px;
  transition: all 0.2s ease;
  user-select: none;
}

.apk-dropzone:hover,
.apk-dropzone.is-dragover {
  border-color: #3B82F6;
  background: #EFF6FF;
}

.apk-dropzone.is-uploading {
  cursor: wait;
  border-color: #94A3B8;
  background: #F8FAFC;
}

.apk-dropzone-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.apk-dropzone-prompt strong {
  display: block;
  font-size: 13px;
  color: #1E293B;
  margin-bottom: 3px;
}

.apk-dropzone-prompt span {
  font-size: 11px;
  color: #64748B;
}

.apk-file-success {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.apk-success-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.apk-success-info strong {
  font-size: 13px;
  color: #0F172A;
}

.apk-success-info span {
  font-size: 11px;
  color: #64748B;
  margin-top: 2px;
}

.btn-replace-apk {
  font-size: 11px;
  color: #3B82F6;
  font-weight: 500;
  text-decoration: underline;
}

.apk-upload-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.apk-progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #1E293B;
  font-weight: 500;
}

.apk-progress-bar {
  width: 100%;
  height: 6px;
  background: #E2E8F0;
  border-radius: 999px;
  overflow: hidden;
}

.apk-progress-fill {
  height: 100%;
  background: #0F172A;
  border-radius: 999px;
  transition: width 0.2s ease;
}

/* --- 实时请求与下载审计日志表格 --- */
.audit-log-table-wrap {
  overflow-x: auto;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #FFFFFF;
  margin-top: 10px;
}

.audit-log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.audit-log-table th {
  background: #F8FAFC;
  padding: 10px 12px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #E2E8F0;
  white-space: nowrap;
}

.audit-log-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #F1F5F9;
  color: #1E293B;
  white-space: nowrap;
}

.log-time {
  color: #64748B;
  font-family: monospace;
}

.log-ip {
  font-family: monospace;
  font-weight: 500;
}

.log-country {
  color: #94A3B8;
  margin-left: 4px;
  font-size: 11px;
}

.badge-op {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  background: #F1F5F9;
  color: #475569;
  font-weight: 500;
}

.badge-download {
  background: #EFF6FF;
  color: #2563EB;
  font-weight: 600;
}

.badge-write {
  background: #FEF3C7;
  color: #D97706;
}

.log-path {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
  color: #334155;
}

.log-bytes {
  font-family: monospace;
  font-weight: 500;
}

.log-status {
  font-family: monospace;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
}

.status-ok {
  color: #10B981;
}

.status-err {
  color: #EF4444;
  background: #FEE2E2;
}

.kv-unbind-tip {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: #92400E;
}

.kv-unbind-tip p {
  margin: 4px 0 0 0;
  line-height: 1.5;
  color: #B45309;
}

@media (max-width: 768px) {
  .stat-overview-grid,
  .stat-card-grid {
    grid-template-columns: 1fr;
  }
  .sync-action-box {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
