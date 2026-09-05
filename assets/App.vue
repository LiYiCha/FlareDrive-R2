<template>
  <div class="main" 
      @dragenter.prevent 
      @dragover.prevent 
      @drop.prevent="onDrop"
      :style="{ backgroundImage: `url('${backgroundImageUrl}')` }"
  >
    <progress v-if="uploadProgress !== null" :value="uploadProgress" max="100"></progress>
    <UploadPopup v-model="showUploadPopup" @upload="onUploadClicked" @createFolder="createFolder"></UploadPopup>
    <button class="upload-button circle" @click="showUploadPopup = true">
      <svg t="1741764069699" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
        p-id="24280" width="24" height="24">
        <path
          d="M576 557.7088V934.4H448V560.4416l-43.8912 43.8848L313.6 513.8176l199.1232-199.1168 0.64 0.64 0.64-0.64 199.1232 199.1168-90.5088 90.5088L576 557.7088zM704 678.4h32c88.3648 0 160-71.6352 160-160s-71.6352-160-160-160c-20.5184 0-40.128 3.8592-58.1568 10.8992C670.336 270.1248 587.4944 192 486.4 192c-106.0416 0-192 85.9584-192 192 0 15.9104 1.9328 31.3728 5.5872 46.1568A127.7504 127.7504 0 0 0 256 422.4c-70.6944 0-128 57.3056-128 128s57.3056 128 128 128h64v128H256c-141.3824 0-256-114.6176-256-256 0-113.3184 73.632-209.4464 175.6608-243.136C210.0352 167.584 336.1216 64 486.4 64c121.312 0 227.552 67.712 281.7728 168.1792C912.0896 248.1792 1024 370.2208 1024 518.4c0 159.0592-128.9408 288-288 288h-32v-128z"
          fill="#e6e6e6" p-id="24281"></path>
      </svg>
    </button>
    
    <div class="app-bar">
      <a class="app-title-container" style="display: flex; align-items: center;" href="/">
        <img src="/assets/homescreen.png" alt="FlareDrive" style="height: 24px" />
        <h1 class="app-title" style="font-size: 20px;margin: 0 25px 0 8px; user-select: none;">FlareDrive</h1>
      </a>

      <input type="search" v-model="search" aria-label="Search" placeholder="🍿 输入以全局搜索文件" />
      
      <div class="menu-button">
        <button class="circle" @click="showMenu = true" style="display: flex; align-items: center;background-color: rgb(245, 245, 245);">
          <p style="
              white-space: nowrap;
              margin: 0 10px 0 0;
              font-size: 16px;
              font-family: '寒蝉半圆体', -apple-system, BlinkMacSystemFont, 'Segoe UI Adjusted',
    'Segoe UI', 'Liberation Sans', sans-serif;"
              class="menu-button-text">
            {{ isLoggedIn ? '管理' : '菜单' }}
          </p>
          <svg t="1741761597964" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
            p-id="22027" width="24" height="24">
            <path
              d="M365 663.5v210.7c0 18.6-23.4 26.8-35 12.3L131.2 637.9c-13.3-16.6-1.5-41.1 19.8-41.1h80.7v-400c0-36.8 29.8-66.7 66.7-66.7 36.8 0 66.7 29.8 66.7 66.7v466.7h-0.1z m200-466.7h266.7c36.8 0 66.7 29.8 66.7 66.7s-29.8 66.7-66.7 66.7H565c-36.8 0-66.7-29.8-66.7-66.7 0-36.8 29.9-66.7 66.7-66.7z m0 266.7h200c36.8 0 66.7 29.8 66.7 66.6s-29.8 66.7-66.6 66.7H565c-36.8 0-66.7-29.8-66.7-66.7 0.1-36.8 29.9-66.6 66.7-66.6z m0 266.7h133.3c36.8 0 66.7 29.8 66.7 66.7 0 36.8-29.8 66.7-66.7 66.7H565c-36.8 0-66.7-29.8-66.7-66.7 0.1-36.9 29.9-66.7 66.7-66.7z"
              p-id="22028" fill="#2c2c2c"></path>
          </svg>
        </button>
        <Menu v-model="showMenu"
          :items="menuItems"
          @click="onMenuClick" />
      </div>
    </div>

    <div class="file-list-container">
      <!-- 存储容量卡片 -->
      <div v-if="storageStats" class="storage-widget">
        <div class="storage-info">
          <span>💾 存储空间: {{ formatSize(storageStats.usedBytes) }} / {{ formatSize(storageStats.quotaBytes) }}</span>
          <span>已使用 {{ ((storageStats.usedBytes / storageStats.quotaBytes) * 100).toFixed(1) }}%</span>
        </div>
        <div class="storage-progress-bar">
          <div class="storage-progress-fill" :style="{ width: Math.min(100, (storageStats.usedBytes / storageStats.quotaBytes) * 100) + '%' }"></div>
        </div>
        <div class="storage-footer-stats">
          <span>文件数: {{ storageStats.fileCount }} | 文件夹: {{ storageStats.folderCount || 0 }}</span>
        </div>
      </div>

      <ul class="file-list">
        <li v-if="cwd !== ''">
          <div tabindex="0" class="file-item" @click="cwd = cwd.replace(/[^\/]+\/$/, '')" @contextmenu.prevent>
            <div class="file-icon">
              <svg  viewBox="0 0 576 512"
                xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
              </svg>
            </div>
            <div class="file-info-container"><span class="file-name">返回上级目录</span></div>
          </div>
        </li>
        <li v-for="folder in filteredFolders" :key="folder">
          <div tabindex="0" class="file-item" @click="cwd = folder" @contextmenu.prevent="
            showContextMenu = true;
          focusedItem = folder;
          ">
            <div class="file-icon">
              <svg  viewBox="0 0 576 512"
                xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
              </svg>
            </div>
            <div class="file-info-container"><span class="file-name" v-text="folder.match(/.*?([^/]*)\/?$/)[1]"></span>
            </div>
            <div style="margin-right: 10px;margin-left: auto;" @click.stop="
              showContextMenu = true;
            focusedItem = folder;
            ">
              <svg t="1741761103305" class="icon" viewBox="0 0 1024 1024" version="1.1"
                xmlns="http://www.w3.org/2000/svg" p-id="6484" width="30" height="30">
                <path
                  d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245333-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245333L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245333L874.666667 341.333333V192a64 64 0 0 0-60.245334-63.893333L810.666667 128z"
                  fill="#2c2c2c" p-id="6485"></path>
              </svg>
            </div>
          </div>
        </li>
        <li v-for="file in filteredFiles" :key="file.key">
          <div @click="preview(`/raw/${file.key}`)" @contextmenu.prevent="
            showContextMenu = true;
          focusedItem = file;" class="file-item" style="position: relative;">
            <MimeIcon :content-type="file.httpMetadata?.contentType" :thumbnail="file.customMetadata?.thumbnail
              ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`
              : null
              " />
            <div class="file-info-container">
              <div class="file-name" v-text="file.key.split('/').pop()"></div>
              <div class="file-attr">
                <span v-text="new Date(file.uploaded).toLocaleString()"></span>
                <span v-text="formatSize(file.size)"></span>
              </div>
            </div>
            <div style="margin-right: 10px;margin-left: auto;" @click.stop="
              showContextMenu = true;
            focusedItem = file;
            ">
              <svg t="1741761103305" class="icon" viewBox="0 0 1024 1024" version="1.1"
                xmlns="http://www.w3.org/2000/svg" p-id="6484" width="30" height="30">
                <path
                  d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245333-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245333L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245333L874.666667 341.333333V192a64 64 0 0 0-60.245334-63.893333L810.666667 128z"
                  fill="#2c2c2c" p-id="6485"></path>
              </svg>
            </div>
          </div>
        </li>
      </ul>
    </div>
    
    <div v-if="loading" style="margin: 20px 0; text-align: center">
      <span style="font-size: 20px;">加载中...</span>
    </div>
    <div v-else-if="!filteredFiles.length && !filteredFolders.length" style="margin: 20px 0; text-align: center">
      <span style="font-size: 20px;">没有文件</span>
    </div>

    <!-- 上下文右键菜单 -->
    <Dialog v-model="showContextMenu">
      <div
        style="height: 50px;display: flex; justify-content: center; align-items: center; padding:10px; background: #ddd; margin: 0 0 10px 0; border-radius: 8px;">
        <div v-text="focusedItem?.key || focusedItem" class="contextmenu-filename" @click.stop.prevent
          style="height:20px;width: 100%; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
      </div>
      <ul v-if="typeof focusedItem === 'string'" class="contextmenu-list">
        <li>
          <button @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`)">
            <span>复制链接</span>
          </button>
        </li>
        <li>
          <button @click="moveFile(focusedItem + '_$folder$')">
            <span>移动</span>
          </button>
        </li>
        <li>
          <button style="color: red" @click="removeFile(focusedItem + '_$folder$')">
            <span>删除</span>
          </button>
        </li>
      </ul>
      <ul v-else class="contextmenu-list">
        <li>
          <button @click="renameFile(focusedItem?.key)">
            <span>重命名</span>
          </button>
        </li>
        <li>
          <a :href="`/raw/${focusedItem?.key}`" target="_blank" download>
            <span>下载</span>
          </a>
        </li>
        <li>
          <button @click="clipboard = focusedItem?.key">
            <span>复制</span>
          </button>
        </li>
        <li>
          <button @click="moveFile(focusedItem?.key)">
            <span>移动</span>
          </button>
        </li>
        <li>
          <button @click="copyLink(`/raw/${focusedItem?.key}`)">
            <span>复制链接</span>
          </button>
        </li>
        <li>
          <button style="color: red" @click="removeFile(focusedItem?.key)">
            <span>删除</span>
          </button>
        </li>
      </ul>
    </Dialog>

    <!-- 管理员登录弹窗 -->
    <Dialog v-model="showLogin">
      <div class="login-header">
        <h3>管理员登录</h3>
        <p>输入凭证以获取网盘及版本管理权限</p>
      </div>
      <div class="login-form">
        <div class="input-field">
          <input type="text" v-model="loginUsername" placeholder="用户名" />
        </div>
        <div class="input-field">
          <input type="password" v-model="loginPassword" placeholder="密码" @keyup.enter="handleLogin" />
        </div>
        
        <div class="login-options">
          <label class="remember-label">
            <input type="checkbox" v-model="rememberMe" /> 记住密码
          </label>
          <a href="javascript:void(0)" class="forgot-link" @click="showForgotTips = true">忘记密码？</a>
        </div>
        
        <button class="btn-primary" @click="handleLogin">登 录</button>
      </div>
    </Dialog>

    <!-- 忘记密码提示弹窗 -->
    <Dialog v-model="showForgotTips">
      <div class="forgot-tips-container">
        <h4>🔑 管理员密码找回与重置指南</h4>
        <div class="forgot-tips-content">
          <p>本系统采用 Serverless 架构，您的账号密码配置在 Cloudflare 环境变量中。</p>
          <ol>
            <li>登录您的 <strong>Cloudflare 控制台</strong>。</li>
            <li>进入 <strong>Workers & Pages</strong> 菜单，选择您的网盘 Pages 项目。</li>
            <li>切换到 <strong>Settings (设置)</strong> 选项卡 -> 选择 <strong>Variables and Secrets (变量与机密)</strong>。</li>
            <li>在环境变量列表中直接查看或修改管理员账号密码：
              <ul>
                <li>若配置了 <code>ADMIN_PASSWORD_HASH</code>，该值对应的是密码的 SHA-256 哈希值。</li>
                <li>若配置了原版 <code>admin</code> 变量，格式为 <code>用户名:密码</code>。</li>
              </ul>
            </li>
            <li>若修改了密码，请重新点击 <strong>Deploy (重新部署)</strong> 即可生效。</li>
          </ol>
        </div>
        <button class="btn-secondary" @click="showForgotTips = false" style="margin-top: 15px;">我知道了</button>
      </div>
    </Dialog>

    <!-- 系统管理与 App 更新面板 -->
    <Dialog v-model="showAdminPanel">
      <div class="admin-panel">
        <div class="admin-header">
          <h3>⚙️ 系统管理与版本发布</h3>
          <button class="btn-close-text" @click="showAdminPanel = false">关闭</button>
        </div>
        
        <div class="admin-tabs">
          <button :class="{ active: activeTab === 'storage' }" @click="activeTab = 'storage'">存储容量管理</button>
          <button :class="{ active: activeTab === 'updates' }" @click="activeTab = 'updates'">App 版本更新</button>
        </div>

        <!-- 标签页 1: 存储容量管理 -->
        <div v-if="activeTab === 'storage'" class="tab-content">
          <div class="storage-panel-details" v-if="storageStats">
            <div class="stat-row">
              <span>总容量额度 (Quota):</span> <strong>{{ formatSize(storageStats.quotaBytes) }}</strong>
            </div>
            <div class="stat-row">
              <span>已使用大小 (Used):</span> <strong>{{ formatSize(storageStats.usedBytes) }}</strong>
            </div>
            <div class="stat-row">
              <span>文件总数 (Files):</span> <strong>{{ storageStats.fileCount }}</strong>
            </div>
            <div class="stat-row">
              <span>文件夹总数 (Folders):</span> <strong>{{ storageStats.folderCount || 0 }}</strong>
            </div>
            <div class="stat-row">
              <span>数据校准时间:</span> <span>{{ new Date(storageStats.lastUpdated || Date.now()).toLocaleString() }}</span>
            </div>
            
            <div class="stat-warning-box">
              <p>💡 提示：当上传或删除文件时，系统会在 R2 中增量统计存储大小。若偶遇容量显示不准，请点击下方按钮重新扫描全桶校准。</p>
            </div>
            
            <button class="btn-warn" @click="recalculateStorage">重新扫描并校准存储大小</button>
          </div>
        </div>

        <!-- 标签页 2: App 更新管理 -->
        <div v-if="activeTab === 'updates'" class="tab-content">
          <div v-if="!editingApp" class="app-list-view">
            <div class="section-title-btn">
              <h4>应用发布列表</h4>
              <button class="btn-sm-primary" @click="createAppUpdate">发布新 App 版本</button>
            </div>
            
            <div v-if="Object.keys(appsUpdates).length === 0" class="empty-list-info">
              暂无 App 更新发布配置。
            </div>
            <ul v-else class="app-update-list">
              <li v-for="(app, id) in appsUpdates" :key="id" class="app-update-item">
                <div class="app-item-info">
                  <strong>{{ app.appName }}</strong> <span class="app-id-tag">({{ id }})</span>
                  <div class="app-item-meta">
                    最新版本: v{{ app.latestVersionName }} (Build {{ app.latestVersionCode }}) | 配套安装包: {{ app.packages ? app.packages.length : 0 }}
                  </div>
                </div>
                <div class="app-item-actions">
                  <button @click="editAppUpdate(id, app)">编辑</button>
                  <button class="btn-text-danger" @click="deleteAppUpdate(id)">删除</button>
                </div>
              </li>
            </ul>
          </div>

          <!-- 编辑 App 更新配置表单 -->
          <div v-else class="app-edit-view">
            <h4 style="margin-top:0;margin-bottom:15px;">配置应用版本更新</h4>
            <div class="form-group">
              <label>应用包名 (App ID) *</label>
              <input type="text" v-model="editingApp.appId" :disabled="!isNewApp" placeholder="例如 com.example.app" />
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
                <input type="checkbox" v-model="editingApp.isForceUpdate" /> 强制更新 (锁定主程序需更新才能运行)
              </label>
            </div>
            <div class="form-group">
              <label>更新日志 (Changelog)</label>
              <textarea v-model="editingApp.updateLog" rows="3" placeholder="填写新版本更新日志..."></textarea>
            </div>

            <!-- 配套包管理 -->
            <div class="packages-section">
              <div class="section-title-btn">
                <h5>关联安装包列表 (Packages)</h5>
                <button class="btn-sm-secondary" @click="addPackageItem">+ 添加安装包</button>
              </div>
              
              <div v-if="editingApp.packages.length === 0" class="empty-packages">
                暂未关联任何 APK 包（支持同时上传原版、Xposed模块版、LSPatch版等配套组件）。
              </div>
              
              <div v-for="(pkg, idx) in editingApp.packages" :key="idx" class="package-edit-card">
                <div class="package-card-header">
                  <h6>安装包 #{{ idx + 1 }}</h6>
                  <button class="btn-text-danger btn-sm" @click="removePackageItem(idx)">移除该包</button>
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
                
                <div class="form-group">
                  <label>快速关联已上传的文件 (自动填充大小及 MD5)</label>
                  <select @change="onSelectFileForPackage($event, pkg)">
                    <option value="">-- 选择网盘当前目录下的 APK 文件 --</option>
                    <option v-for="file in files.filter(f => f.key.endsWith('.apk'))" :key="file.key" :value="file.key">
                      {{ file.key.split('/').pop() }} ({{ formatSize(file.size) }})
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>下载直链地址 (Download URL)</label>
                  <input type="text" v-model="pkg.downloadUrl" placeholder="输入 /raw/apks/app.apk" />
                </div>
                <div class="form-group-row">
                  <div class="form-group">
                    <label>文件大小 (Bytes)</label>
                    <input type="number" v-model="pkg.apkSize" />
                  </div>
                  <div class="form-group">
                    <label>文件 MD5 校验码</label>
                    <input type="text" v-model="pkg.apkMd5" placeholder="关联文件后会自动获取" />
                  </div>
                </div>
                <div class="form-group">
                  <label>包功能描述</label>
                  <input type="text" v-model="pkg.description" placeholder="简单说明此包的特征或适用范围" />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn-primary" @click="saveAppUpdate">保存并发布</button>
              <button class="btn-secondary" @click="editingApp = null">返回列表</button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>

    <div style="flex:1"></div>
    <Footer />
  </div>
</template>

<script>
import {
  generateThumbnail,
  blobDigest,
  multipartUpload,
  SIZE_LIMIT,
} from "/assets/main.mjs";
import Dialog from "./Dialog.vue";
import Menu from "./Menu.vue";
import MimeIcon from "./MimeIcon.vue";
import UploadPopup from "./UploadPopup.vue";
import Footer from "./Footer.vue";

export default {
  data: () => ({
    cwd: new URL(window.location).searchParams.get("p") || "",
    files: [],
    folders: [],
    clipboard: null,
    focusedItem: null,
    loading: false,
    order: null,
    search: "",
    showContextMenu: false,
    showMenu: false,
    showUploadPopup: false,
    uploadProgress: null,
    uploadQueue: [],
    backgroundImageUrl: "/assets/bg-light.webp",

    // 新增：安全与管理后台状态
    showLogin: false,
    showForgotTips: false,
    loginUsername: "",
    loginPassword: "",
    isLoggedIn: false,
    rememberMe: true,
    storageStats: null,
    showAdminPanel: false,
    activeTab: "storage",
    appsUpdates: {},
    editingApp: null,
    isNewApp: false
  }),

  computed: {
    filteredFiles() {
      let files = this.files;
      if (this.search) {
        files = files.filter((file) =>
          file.key.split("/").pop().toLowerCase().includes(this.search.toLowerCase())
        );
      }
      return files;
    },

    filteredFolders() {
      let folders = this.folders;
      if (this.search) {
        folders = folders.filter((folder) => 
          folder.toLowerCase().includes(this.search.toLowerCase())
        );
      }
      return folders;
    },

    // 动态生成菜单项 (基于登录状态)
    menuItems() {
      const items = [
        { text: '按照名称排序A-Z' },
        { text: '按照大小递增排序' },
        { text: '按照大小递减排序' },
        { text: '粘贴文件到网盘' }
      ];
      if (this.isLoggedIn) {
        items.push({ text: '网盘空间与版本管理' });
        items.push({ text: '安全退出登录' });
      } else {
        items.push({ text: '管理员登录' });
      }
      return items;
    }
  },

  methods: {
    copyLink(link) {
      const url = new URL(link, window.location.origin);
      navigator.clipboard.writeText(url.toString());
    },

    async copyPaste(source, target) {
      const uploadUrl = `/api/write/items/${target}`;
      await axios.put(uploadUrl, "", {
        headers: { "x-amz-copy-source": encodeURIComponent(source) },
      });
    },

    async createFolder() {
      try {
        const folderName = window.prompt("请输入文件夹名称");
        if (!folderName) return;
        this.showUploadPopup = false;
        const uploadUrl = `/api/write/items/${this.cwd}${folderName}/_$folder$`;
        await axios.put(uploadUrl, "");
        this.fetchFiles();
        this.fetchStorageStats();
      } catch (error) {
        console.log(`Create folder failed`);
      }
    },

    fetchFiles() {
      this.files = [];
      this.folders = [];
      this.loading = true;
      fetch(`/api/children/${this.cwd}`)
        .then((res) => {
          if (!res.ok) {
            this.loading = false;
            return null;
          }
          return res.json();
        })
        .then((files) => {
          if (!files) return;
          this.files = files.value;
          if (this.order) {
            this.files.sort((a, b) => {
              if (this.order === "size") {
                return b.size - a.size;
              }
            });
          }
          this.folders = files.folders;
          this.loading = false;
        });
    },

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

    onDrop(ev) {
      let files;
      if (ev.dataTransfer.items) {
        files = [...ev.dataTransfer.items]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile());
      } else files = ev.dataTransfer.files;
      this.uploadFiles(files);
    },

    onMenuClick(text) {
      switch (text) {
        case "按照名称排序A-Z":
          this.order = null;
          break;
        case "按照大小递增排序":
          this.order = "大小↑";
          break;
        case "按照大小递减排序":
          this.order = "大小↓";
          break;
        case "粘贴文件到网盘":
          return this.pasteFile();
        case "管理员登录":
          this.showLogin = true;
          break;
        case "网盘空间与版本管理":
          this.openAdminPanel();
          break;
        case "安全退出登录":
          this.logout();
          break;
      }
      this.files.sort((a, b) => {
        if (this.order === "大小↑") {
          return a.size - b.size;
        } else if (this.order === "大小↓") {
          return b.size - a.size;
        } else {
          return a.key.localeCompare(b.key);
        }
      });
    },

    onUploadClicked(fileElement) {
      if (!fileElement.value) return;
      this.uploadFiles(fileElement.files);
      this.showUploadPopup = false;
      fileElement.value = null;
    },

    preview(filePath) {
      window.open(filePath);
    },

    async pasteFile() {
      if (!this.clipboard) return;
      let newName = window.prompt("Rename to:");
      if (newName === null) return;
      if (newName === "") newName = this.clipboard.split("/").pop();
      await this.copyPaste(this.clipboard, `${this.cwd}${newName}`);
      this.fetchFiles();
      this.fetchStorageStats();
    },

    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        this.fetchFiles();
        this.fetchStorageStats(); // 刷新容量
        this.uploadProgress = null;
        return;
      }

      /** @type File **/
      const { basedir, file } = this.uploadQueue.shift(); // shift先进先出，比pop更符合队列逻辑
      let thumbnailDigest = null;

      if (file.type.startsWith("image/") || file.type === "video/mp4") {
        try {
          const thumbnailBlob = await generateThumbnail(file);
          const digestHex = await blobDigest(thumbnailBlob);

          const thumbnailUploadUrl = `/api/write/items/_$flaredrive$/thumbnails/${digestHex}.png`;
          try {
            await axios.put(thumbnailUploadUrl, thumbnailBlob);
            thumbnailDigest = digestHex;
          } catch (error) {
            console.log(`Upload ${digestHex}.png failed`);
          }
        } catch (error) {
          console.log(`Generate thumbnail failed`);
        }
      }

      try {
        const uploadUrl = `/api/write/items/${basedir}${file.name}`;
        const headers = {};
        const onUploadProgress = (progressEvent) => {
          var percentCompleted =
            (progressEvent.loaded * 100) / progressEvent.total;
          this.uploadProgress = percentCompleted;
        };
        if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;
        if (file.size >= SIZE_LIMIT) {
          await multipartUpload(`${basedir}${file.name}`, file, {
            headers,
            onUploadProgress,
          });
        } else {
          await axios.put(uploadUrl, file, { headers, onUploadProgress });
        }
      } catch (error) {
        console.log(`Upload ${file.name} failed`, error);
      }
      setTimeout(this.processUploadQueue);
    },

    async removeFile(key) {
      if (!window.confirm(`确定要删除 ${key} 吗？`)) return;
      await axios.delete(`/api/write/items/${key}`);
      this.fetchFiles();
      this.fetchStorageStats();
    },

    async renameFile(key) {
      const newName = window.prompt("重命名为:");
      if (!newName) return;
      await this.copyPaste(key, `${this.cwd}${newName}`);
      await axios.delete(`/api/write/items/${key}`);
      this.fetchFiles();
    },

    async moveFile(key) {
      const currentPath = this.cwd;
      const allFolders = [...this.folders];

      if (currentPath !== '') {
        const parentPath = currentPath.replace(/[^\/]+\/$/, '');
        if (!allFolders.includes(parentPath) && parentPath !== '') {
          allFolders.unshift(parentPath);
        }
      }

      if (!allFolders.includes('')) {
        allFolders.unshift('');
      }

      const folderOptions = allFolders.map(folder => {
        const displayName = folder === '' ? '根目录' :
          folder === currentPath ? '当前目录' :
            folder.replace(/.*\/(?!$)|\//g, '') + '/';
        return {
          display: displayName,
          value: folder
        };
      });

      const options = folderOptions.map((opt, index) =>
        `${index + 1}. ${opt.display}`
      ).join('\n');

      const promptText = `请选择目标目录(输入数字):\n${options}\n`;
      const selection = window.prompt(promptText);

      if (!selection) return;

      const selectedIndex = parseInt(selection) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= folderOptions.length) {
        alert('无效的选择');
        return;
      }

      const targetPath = folderOptions[selectedIndex].value;
      const fileName = key.split('/').pop();
      const finalFileName = fileName.endsWith('_$folder$') ? fileName.slice(0, -9) : fileName;
      const normalizedPath = targetPath === '' ? '' : (targetPath.endsWith('/') ? targetPath : targetPath + '/');

      try {
        if (key.endsWith('_$folder$')) {
          const sourceBasePath = key.slice(0, -9);
          const targetBasePath = normalizedPath + finalFileName + '/';
          const allItems = await this.getAllItems(sourceBasePath);
          const totalItems = allItems.length;
          let processedItems = 0;

          for (const item of allItems) {
            const relativePath = item.key.substring(sourceBasePath.length);
            const newPath = targetBasePath + relativePath;

            try {
              await this.copyPaste(item.key, newPath);
              await axios.delete(`/api/write/items/${item.key}`);
              processedItems++;
              this.uploadProgress = (processedItems / totalItems) * 100;
            } catch (error) {
              console.error(`移动 ${item.key} 失败:`, error);
            }
          }

          const targetFolderPath = targetBasePath.slice(0, -1) + '_$folder$';
          await this.copyPaste(key, targetFolderPath);
          await axios.delete(`/api/write/items/${key}`);
          this.uploadProgress = null;
        } else {
          const targetFilePath = normalizedPath + finalFileName;
          await this.copyPaste(key, targetFilePath);
          await axios.delete(`/api/write/items/${key}`);
        }
        this.fetchFiles();
        this.fetchStorageStats();
      } catch (error) {
        console.error('移动失败:', error);
        alert('移动失败,请检查目标路径是否正确');
      }
    },


    async getAllItems(prefix) {
      const items = [];
      let marker = null;
      do {
        const url = new URL(`/api/children/${prefix}`, window.location.origin);
        if (marker) {
          url.searchParams.set('marker', marker);
        }
        const response = await fetch(url);
        const data = await response.json();
        items.push(...data.value);
        for (const folder of data.folders) {
          items.push({
            key: folder + '_$folder$',
            size: 0,
            uploaded: new Date().toISOString(),
          });
          const subItems = await this.getAllItems(folder);
          items.push(...subItems);
        }
        marker = data.marker;
      } while (marker);
      return items;
    },

    uploadFiles(files) {
      if (this.cwd && !this.cwd.endsWith("/")) this.cwd += "/";
      const uploadTasks = Array.from(files).map((file) => ({
        basedir: this.cwd,
        file,
      }));
      this.uploadQueue.push(...uploadTasks);
      setTimeout(() => this.processUploadQueue());
    },

    fetchSystemConfig() {
      axios.get("/api/config")
        .catch(err => console.error("读取系统配置失败:", err));
    },

    fetchStorageStats() {
      axios.get("/api/storage/usage")
        .then(res => {
          this.storageStats = res.data;
        })
        .catch(err => console.error("获取存储统计失败:", err));
    },

    recalculateStorage() {
      if (!confirm("确定要全量扫描并校准存储大小吗？这可能需要几十秒。")) return;
      this.loading = true;
      axios.post("/api/storage/recalculate")
        .then(res => {
          if (res.data.success) {
            this.storageStats = res.data.stats;
            alert("容量校准成功！");
          }
        })
        .catch(err => alert("校准容量失败：" + (err.response?.data?.error || err.message)))
        .finally(() => this.loading = false);
    },

    handleLogin() {
      if (!this.loginUsername || !this.loginPassword) {
        alert("请输入账号和密码");
        return;
      }

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
        this.showLogin = false;
        this.loginPassword = ""; // 安全擦除密码
        this.fetchFiles();
        this.fetchStorageStats();
      })
      .catch(err => {
        alert("登录失败：" + (err.response?.data?.error || err.message));
      });
    },

    logout() {
      localStorage.removeItem("flaredrive_token");
      sessionStorage.removeItem("flaredrive_token");
      this.isLoggedIn = false;
      this.showAdminPanel = false;
      alert("已成功退出登录！");
      this.fetchFiles();
      this.fetchStorageStats();
    },

    openAdminPanel() {
      this.showAdminPanel = true;
      this.fetchAppUpdates();
    },

    fetchAppUpdates() {
      // 通过管理员授权通道直接读取存储桶中的更新配置
      axios.get("/raw/_$flaredrive$/metadata/app_updates.json")
        .then(res => {
          this.appsUpdates = res.data.apps || {};
        })
        .catch(err => {
          if (err.response?.status === 404) {
            this.appsUpdates = {};
          } else {
            console.error("获取 App 更新配置失败:", err);
          }
        });
    },

    createAppUpdate() {
      this.editingApp = {
        appId: "",
        appName: "",
        latestVersionCode: 100,
        latestVersionName: "1.0.0",
        updateLog: "",
        isForceUpdate: false,
        packages: []
      };
      this.isNewApp = true;
    },

    editAppUpdate(id, app) {
      this.editingApp = {
        appId: id,
        ...JSON.parse(JSON.stringify(app))
      };
      this.isNewApp = false;
    },

    deleteAppUpdate(id) {
      if (!confirm(`确定要彻底删除该应用 (${id}) 的更新配置吗？`)) return;
      this.loading = true;
      axios.post("/api/admin/update/publish", {
        appId: id,
        deleteAction: true
      })
      .then(() => {
        alert("删除成功！");
        this.fetchAppUpdates();
      })
      .catch(err => alert("删除失败：" + (err.response?.data?.error || err.message)))
      .finally(() => this.loading = false);
    },

    addPackageItem() {
      this.editingApp.packages.push({
        packageId: "",
        packageName: "",
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

    onSelectFileForPackage(event, pkg) {
      const fileKey = event.target.value;
      if (!fileKey) return;
      const file = this.files.find(f => f.key === fileKey);
      if (file) {
        pkg.downloadUrl = `/raw/${file.key}`;
        pkg.apkSize = file.size;
        pkg.apkMd5 = file.etag || "";
        pkg.versionCode = this.editingApp.latestVersionCode;
        pkg.versionName = this.editingApp.latestVersionName;
      }
    },

    saveAppUpdate() {
      if (!this.editingApp.appId || !this.editingApp.appName || !this.editingApp.latestVersionCode || !this.editingApp.latestVersionName) {
        alert("请填写所有必填字段 (*)");
        return;
      }
      this.loading = true;
      axios.post("/api/admin/update/publish", this.editingApp)
      .then(() => {
        alert("应用更新发布成功！");
        this.editingApp = null;
        this.fetchAppUpdates();
      })
      .catch(err => alert("保存发布失败：" + (err.response?.data?.error || err.message)))
      .finally(() => this.loading = false);
    }
  },

  watch: {
    cwd: {
      handler() {
        this.fetchFiles();
        const url = new URL(window.location);
        if ((url.searchParams.get("p") || "") !== this.cwd) {
          this.cwd
            ? url.searchParams.set("p", this.cwd)
            : url.searchParams.delete("p");
          window.history.pushState(null, "", url.toString());
        }
        document.title = this.cwd.replace(/.*\/(?!$)|\//g, "") === "/" 
            ? "FlareDrive-R2 - 优雅的 Cloudflare R2 网盘文件库"
            :`${this.cwd.replace(/.*\/(?!$)|\//g, "") || "/" } - 优雅的 Cloudflare R2 网盘文件库`;
      },
      immediate: true,
    }
  },

  created() {
    // 1. 设置 JWT 自动携带及 401 拦截器 (Axios)
    axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
      if (token && config.url) {
        let isSameOrigin = false;
        try {
          const targetUrl = new URL(config.url, window.location.origin);
          isSameOrigin = targetUrl.origin === window.location.origin;
        } catch (e) {
          isSameOrigin = !config.url.startsWith("http:") && !config.url.startsWith("https:") && !config.url.startsWith("//");
        }
        if (isSameOrigin) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }
      return config;
    });

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          this.isLoggedIn = false;
          this.showLogin = true;
        }
        return Promise.reject(error);
      }
    );

    // 2. 拦截全局原生 fetch 并在 401 时唤起登录
    const originalFetch = window.fetch;
    const self = this;
    window.fetch = async function (input, init) {
      init = init || {};
      init.headers = init.headers || {};
      const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
      if (token) {
        let isSameOrigin = false;
        try {
          const urlStr = typeof input === "string" ? input : input.url;
          const targetUrl = new URL(urlStr, window.location.origin);
          isSameOrigin = targetUrl.origin === window.location.origin;
        } catch (e) {
          isSameOrigin = typeof input === "string" && !input.startsWith("http:") && !input.startsWith("https:") && !input.startsWith("//");
        }
        if (isSameOrigin) {
          if (init.headers instanceof Headers) {
            init.headers.set("Authorization", "Bearer " + token);
          } else if (Array.isArray(init.headers)) {
            const idx = init.headers.findIndex(h => h[0] === "Authorization");
            if (idx !== -1) init.headers[idx][1] = "Bearer " + token;
            else init.headers.push(["Authorization", "Bearer " + token]);
          } else {
            init.headers["Authorization"] = "Bearer " + token;
          }
        }
      }
      const response = await originalFetch(input, init);
      if (response.status === 401) {
        self.isLoggedIn = false;
        self.showLogin = true;
      }
      return response;
    };

    // 3. 监听路由历史
    window.addEventListener("popstate", (ev) => {
      const searchParams = new URL(window.location).searchParams;
      if (searchParams.get("p") !== this.cwd)
        this.cwd = searchParams.get("p") || "";
    });

    // 4. 读取持久化登录态
    const savedToken = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
    if (savedToken) {
      this.isLoggedIn = true;
    }

    // 5. 异步读取系统配置与存储统计
    this.fetchSystemConfig();
    this.fetchStorageStats();
  },

  components: {
    Dialog,
    Menu,
    MimeIcon,
    UploadPopup,
    Footer,
  },
};
</script>

<style>
.main {
  display: flex;
  height: 100%;
  background-size: cover;
  background-position: center;
  overflow-y: auto;
  flex-direction: column;
}

.app-bar {
  z-index: 2;
  position: sticky;
  top: 0;
  padding: 8px;
  background-color: white;
  display: flex;
}

@media (max-width: 400px) {
  .menu-button {
    margin: 0;
    padding: 0;
  }

  button.circle {
    padding: 0 8px;
  }
  .menu-button-text {
    display: none !important;
  }
}

@media (max-width: 340px) {
  .app-title-container {
    display: none !important;
  }
}

.menu-button {
  display: flex;
  position: relative;
  margin-left: 10px;
  padding: 0 10px;
}

.file-list-container {
  margin: 20px auto;
  padding: 10px;
  width: 60%;
  max-width: 95%;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: width 0.3s ease;
}

@media (max-width: 1280px) {
  .file-list-container {
    width: 768px;
    padding: 10px;
  }
}

.menu-button>button {
  transition: background-color 0.2s ease;
}

.menu-button>button:hover {
  background-color: rgb(212, 212, 212);
}

.menu {
  position: absolute;
  top: 100%;
  right: 0;
}

/* --- 新增安全和仪表盘样式 --- */
.storage-widget {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 12px;
  border-radius: 8px;
  font-size: 13px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
}
.storage-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: bold;
  color: #333;
}
.storage-progress-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.storage-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.storage-footer-stats {
  font-size: 11px;
  color: #666;
  text-align: right;
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}
.login-header h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}
.login-header p {
  margin: 0;
  font-size: 12px;
  color: #666;
}
.login-form .input-field {
  margin-bottom: 12px;
}
.login-form .input-field input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-sizing: border-box;
}
.login-options {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 12px;
}
.remember-label {
  cursor: pointer;
}
.forgot-link {
  color: #667eea;
  text-decoration: none;
}
.btn-primary {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
}
.btn-secondary {
  width: 100%;
  padding: 10px;
  background: #eee;
  border: none;
  border-radius: 6px;
  color: #333;
  cursor: pointer;
}
.forgot-tips-container h4 {
  margin-top: 0;
}
.forgot-tips-content {
  font-size: 13px;
  line-height: 1.5;
}
.forgot-tips-content ol, .forgot-tips-content ul {
  padding-left: 20px;
}

.admin-panel {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  overflow-y: auto;
  min-width: 320px;
  width: 500px;
  max-width: 90vw;
  text-align: left;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.admin-header h3 {
  margin: 0;
}
.btn-close-text {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
}
.admin-tabs {
  display: flex;
  margin-top: 10px;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
}
.admin-tabs button {
  flex: 1;
  padding: 8px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  color: #666;
}
.admin-tabs button.active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: bold;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
  font-size: 13px;
}
.stat-warning-box {
  background: #fff3cd;
  color: #856404;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 11px;
  margin: 12px 0;
}
.btn-warn {
  width: 100%;
  padding: 10px;
  background: #ffc107;
  border: none;
  border-radius: 6px;
  color: #212529;
  font-weight: bold;
  cursor: pointer;
}
.section-title-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title-btn h4 {
  margin: 0;
}
.btn-sm-primary {
  padding: 5px 10px;
  background: #667eea;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  cursor: pointer;
}
.btn-sm-secondary {
  padding: 5px 10px;
  background: #eee;
  border: none;
  border-radius: 4px;
  color: #333;
  font-size: 11px;
  cursor: pointer;
}
.app-update-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.app-update-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 6px;
}
.app-id-tag {
  font-size: 11px;
  color: #888;
  margin-left: 4px;
}
.app-item-meta {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}
.app-item-actions button {
  padding: 3px 6px;
  margin-left: 4px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}
.empty-list-info, .empty-packages {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: #888;
}
.form-group {
  margin-bottom: 10px;
}
.form-group label {
  display: block;
  font-size: 11px;
  color: #666;
  margin-bottom: 3px;
}
.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 12px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.form-group-row {
  display: flex;
  gap: 8px;
}
.form-group-row .form-group {
  flex: 1;
}
.packages-section {
  border-top: 1px solid #eee;
  margin-top: 12px;
  padding-top: 12px;
}
.package-edit-card {
  border: 1px dashed #ccc;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
  background: rgba(0,0,0,0.02);
}
.package-card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.package-card-header h6 {
  margin: 0;
  font-size: 12px;
}
.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 15px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}
</style>
