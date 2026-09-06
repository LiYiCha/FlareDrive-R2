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

      <input type="search" v-model="search" aria-label="Search" placeholder="输入以全局搜索文件..." />
      
      <div class="menu-button">
        <button class="circle" @click="showMenu = true" style="display: flex; align-items: center;background-color: rgb(245, 245, 245);">
          <p style="
              white-space: nowrap;
              margin: 0 10px 0 0;
              font-size: 16px;
              font-family: '寒蝉半圆体', -apple-system, BlinkMacSystemFont, 'Segoe UI Adjusted',
    'Segoe UI', 'Liberation Sans', sans-serif;"
              class="menu-button-text">
            菜单
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
          <span class="storage-info-title">
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="storage-svg-icon">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            存储空间: {{ formatSize(storageStats.usedBytes) }} / {{ formatSize(storageStats.quotaBytes) }}
          </span>
          <span>已使用 {{ ((storageStats.usedBytes / storageStats.quotaBytes) * 100).toFixed(1) }}%</span>
        </div>
        <div class="storage-progress-bar">
          <div class="storage-progress-fill" :style="{ width: Math.min(100, (storageStats.usedBytes / storageStats.quotaBytes) * 100) + '%' }"></div>
        </div>
        <div class="storage-footer-stats">
          <span>文件数: {{ storageStats.fileCount }} | 文件夹: {{ storageStats.folderCount || 0 }}</span>
        </div>
      </div>

      <!-- 面包屑与路径导航栏 -->
      <div class="breadcrumb-toolbar">
        <div class="breadcrumb-path">
          <button class="breadcrumb-item" :class="{ 'breadcrumb-active': cwd === '' }" @click="navigateTo('')" title="返回根目录">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>根目录</span>
          </button>
          <template v-for="(crumb, idx) in breadcrumbs" :key="crumb.path">
            <span class="breadcrumb-separator">/</span>
            <button 
              class="breadcrumb-item" 
              :class="{ 'breadcrumb-active': idx === breadcrumbs.length - 1 }" 
              @click="navigateTo(crumb.path)"
            >
              {{ crumb.name }}
            </button>
          </template>
        </div>
        <div class="breadcrumb-actions">
          <button v-if="cwd !== ''" class="btn-tool" @click="navigateUp" title="返回上一级目录">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            <span>上一级</span>
          </button>
          <button class="btn-tool" @click="refreshCurrentDir" title="刷新目录列表">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>刷新</span>
          </button>
        </div>
      </div>

      <ul class="file-list">
        <li v-if="cwd !== ''">
          <div tabindex="0" class="file-item" @click="navigateUp" @contextmenu.prevent>
            <div class="file-icon">
              <svg viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
              </svg>
            </div>
            <div class="file-info-container"><span class="file-name">返回上级目录</span></div>
          </div>
        </li>
        <li v-for="folder in filteredFolders" :key="folder">
          <div tabindex="0" class="file-item" @click="navigateTo(folder)" @contextmenu.prevent="
            showContextMenu = true;
          focusedItem = folder;
          ">
            <div class="file-icon">
              <svg viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
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
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round" class="login-svg-icon">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <h3>管理员鉴权</h3>
        <p>输入管理凭证以进入控制台</p>
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
            <input type="checkbox" v-model="rememberMe" /> 记住登录状态
          </label>
          <a href="javascript:void(0)" class="forgot-link" @click="showForgotTips = true">凭证重置指南</a>
        </div>
        
        <button class="btn-primary" @click="handleLogin">登 录</button>
      </div>
    </Dialog>

    <!-- 忘记密码提示弹窗 -->
    <Dialog v-model="showForgotTips">
      <div class="forgot-tips-container">
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
        <button class="btn-secondary" @click="showForgotTips = false" style="margin-top: 15px;">关闭指南</button>
      </div>
    </Dialog>

    <!-- 控制台与系统管理面板 -->
    <Dialog v-model="showAdminPanel">
      <div class="admin-panel">
        <div class="admin-header">
          <div class="admin-header-title">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <h3>控制台与系统运维监控</h3>
          </div>
          <div class="admin-header-actions">
            <button class="btn-header-logout" @click="logout" title="安全退出管理员身份">退出登录</button>
            <button class="btn-close-text" @click="showAdminPanel = false">关闭</button>
          </div>
        </div>
        
        <div class="admin-tabs">
          <button :class="{ active: activeTab === 'storage' }" @click="activeTab = 'storage'">S3 运维与存储</button>
          <button :class="{ active: activeTab === 'updates' }" @click="activeTab = 'updates'">App 版本管理</button>
          <button :class="{ active: activeTab === 'defense' }" @click="activeTab = 'defense'">流量防御与审计</button>
        </div>

        <!-- 标签页 1: S3 运维与存储容量管理 -->
        <div v-if="activeTab === 'storage'" class="tab-content">
          <div class="storage-panel-details">
            <div class="panel-section-title">存储与对象统计</div>
            <div class="stat-row">
              <span>总存储额度 (Quota):</span> <strong>{{ formatSize(storageStats?.quotaBytes || 10737418240) }}</strong>
            </div>
            <div class="stat-row">
              <span>已使用大小 (Used):</span> <strong>{{ storageStats?.loading ? '读取中...' : formatSize(storageStats?.usedBytes || 0) }}</strong>
            </div>
            <div class="stat-row">
              <span>文件总数 (Files):</span> <strong>{{ storageStats?.loading ? '...' : (storageStats?.fileCount || 0) }}</strong>
            </div>
            <div class="stat-row">
              <span>文件夹总数 (Folders):</span> <strong>{{ storageStats?.loading ? '...' : (storageStats?.folderCount || 0) }}</strong>
            </div>
            <div class="stat-row">
              <span>数据校准时间:</span> <span>{{ storageStats?.lastUpdated ? new Date(storageStats.lastUpdated).toLocaleString() : '首次使用，待全量校准' }}</span>
            </div>
            
            <div class="panel-section-title" style="margin-top: 16px;">S3 操作指标与流量优势</div>
            <div class="stat-card-grid">
              <div class="stat-mini-card">
                <div class="card-label">S3 A 类操作 (写入/变更)</div>
                <div class="card-value">1,000,000 <span class="card-unit">次/月免费</span></div>
                <div class="card-desc">PutObject / ListObjects / 分片上传</div>
              </div>
              <div class="stat-mini-card">
                <div class="card-label">S3 B 类操作 (读取/检索)</div>
                <div class="card-value">10,000,000 <span class="card-unit">次/月免费</span></div>
                <div class="card-desc">GetObject / HeadObject / 元数据获取</div>
              </div>
              <div class="stat-mini-card">
                <div class="card-label">外网出站流量 (Egress)</div>
                <div class="card-value">$0.00 <span class="card-unit">永久免流量费</span></div>
                <div class="card-desc">Cloudflare R2 原生零流量费架构</div>
              </div>
              <div class="stat-mini-card">
                <div class="card-label">CDN 边缘缓存加速</div>
                <div class="card-value">Cache Everything</div>
                <div class="card-desc">直连 Anycast CDN，极大减少回源调用</div>
              </div>
            </div>

            <div class="stat-tip-box">
              <p>说明：当上传或删除文件时，系统会在 R2 中增量计算容量。若偶遇容量数据脱节，请点击下方按钮重新扫描全桶校准。</p>
            </div>
            
            <button class="btn-action-primary" @click="recalculateStorage">重新扫描并校准存储大小</button>
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

        <!-- 标签页 3: 流量防御与审计 -->
        <div v-if="activeTab === 'defense'" class="tab-content">
          <div class="defense-panel">
            <div class="panel-section-title">防恶意刷量与热点防护机制</div>
            
            <div class="defense-card">
              <div class="defense-card-header">
                <span class="defense-tag">边缘缓存</span>
                <strong>/raw/ 资源 Edge Cache Everything</strong>
              </div>
              <p>公开下载的大文件与安装包通过 Cloudflare CDN 全球边缘节点缓存，重复下载直接命中边缘，免除 R2 的 Class B 操作数消耗与源站开销。</p>
            </div>

            <div class="defense-card">
              <div class="defense-card-header">
                <span class="defense-tag">WAF 限流</span>
                <strong>Cloudflare Rate Limiting 速率限制</strong>
              </div>
              <p>在 Cloudflare 控制台「安全性」->「WAF」中配置频率限制规则（如单 IP 10 秒内请求超 60 次触发人机质询），防范脚本暴力爬取与恶意遍历。</p>
            </div>

            <div class="panel-section-title" style="margin-top: 18px;">访问日志记录与架构规划</div>
            <div class="defense-card">
              <div class="defense-card-header">
                <span class="defense-tag">日志方案</span>
                <strong>标准日志处理方案 (避免内存溢出)</strong>
              </div>
              <p>Serverless 边缘 Worker 无常驻内存。推荐使用 <strong>Cloudflare Web Analytics</strong>（原生免费、零资源开销查看访客地域、IP 与请求次数），或通过 <strong>Cloudflare Logpush</strong> 流式归档至指定日志分析平台，杜绝单点内存泄露。</p>
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

    // 前端防内存溢出 LRU 目录缓存 (上限 50 个目录)
    dirCache: new Map(),

    // 新增：安全与管理后台状态
    showLogin: false,
    showForgotTips: false,
    loginUsername: "",
    loginPassword: "",
    isLoggedIn: false,
    rememberMe: true,
    storageStats: {
      usedBytes: 0,
      quotaBytes: 10 * 1024 * 1024 * 1024,
      fileCount: 0,
      folderCount: 0,
      lastUpdated: null,
      loading: true
    },
    showAdminPanel: false,
    activeTab: "storage",
    appsUpdates: {},
    editingApp: null,
    isNewApp: false
  }),

  computed: {
    breadcrumbs() {
      if (!this.cwd) return [];
      const parts = this.cwd.split("/").filter((p) => p.length > 0);
      let accum = "";
      return parts.map((part) => {
        accum += part + "/";
        return {
          name: part,
          path: accum,
        };
      });
    },

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

    // 菜单项完全移除控制台、登录与退出登录，彻底隐蔽！
    menuItems() {
      return [
        { text: '按照名称排序A-Z' },
        { text: '按照大小递增排序' },
        { text: '按照大小递减排序' },
        { text: '粘贴文件到网盘' }
      ];
    }
  },

  methods: {
    navigateTo(targetPath) {
      if (this.cwd === targetPath) return;
      this.cwd = targetPath;
    },

    navigateUp() {
      if (!this.cwd) return;
      const parent = this.cwd.replace(/[^\/]+\/$/, "");
      this.cwd = parent;
    },

    refreshCurrentDir() {
      if (this.dirCache) {
        this.dirCache.delete(this.cwd);
      }
      this.fetchFiles(true);
      this.fetchStorageStats();
    },

    sortFiles() {
      if (!this.files || !this.files.length) return;
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
        if (this.dirCache) this.dirCache.clear();
        this.fetchFiles(true);
        this.fetchStorageStats();
      } catch (error) {
        console.log(`Create folder failed`);
      }
    },

    fetchFiles(forceRefresh = false) {
      const currentDir = this.cwd;
      if (!forceRefresh && this.dirCache && this.dirCache.has(currentDir)) {
        const cached = this.dirCache.get(currentDir);
        this.dirCache.delete(currentDir);
        this.dirCache.set(currentDir, cached);
        this.files = [...cached.files];
        this.folders = [...cached.folders];
        this.sortFiles();
        this.loading = false;
        return;
      }

      this.files = [];
      this.folders = [];
      this.loading = true;
      fetch(`/api/children/${currentDir}`)
        .then((res) => {
          if (!res.ok) {
            this.loading = false;
            return null;
          }
          return res.json();
        })
        .then((files) => {
          if (!files) return;
          this.files = files.value || [];
          this.folders = files.folders || [];
          this.sortFiles();
          this.loading = false;

          // 存入前端 LRU 缓存，严格限制上限为 50 个目录，杜绝长时间浏览导致内存溢出
          if (this.dirCache) {
            if (this.dirCache.has(currentDir)) {
              this.dirCache.delete(currentDir);
            } else if (this.dirCache.size >= 50) {
              const oldestKey = this.dirCache.keys().next().value;
              this.dirCache.delete(oldestKey);
            }
            this.dirCache.set(currentDir, {
              files: this.files,
              folders: this.folders
            });
          }
        })
        .catch(() => {
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
        case "控制台与版本管理":
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
      if (this.dirCache) this.dirCache.clear();
      this.fetchFiles(true);
      this.fetchStorageStats();
    },

    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        if (this.dirCache) this.dirCache.clear();
        this.fetchFiles(true);
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
      if (this.dirCache) this.dirCache.clear();
      this.fetchFiles(true);
      this.fetchStorageStats();
    },

    async renameFile(key) {
      const newName = window.prompt("重命名为:");
      if (!newName) return;
      await this.copyPaste(key, `${this.cwd}${newName}`);
      await axios.delete(`/api/write/items/${key}`);
      if (this.dirCache) this.dirCache.clear();
      this.fetchFiles(true);
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
        if (this.dirCache) this.dirCache.clear();
        this.fetchFiles(true);
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
          if (res.data) {
            this.storageStats = {
              ...res.data,
              loading: false
            };
          }
        })
        .catch(err => {
          console.error("获取存储统计失败:", err);
          if (this.storageStats) this.storageStats.loading = false;
        });
    },

    recalculateStorage() {
      if (!confirm("确定要全量扫描并校准存储大小吗？这可能需要几十秒。")) return;
      this.loading = true;
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
        this.fetchFiles(true);
        this.fetchStorageStats();
        // 登录成功后直接开启控制台面板
        this.openAdminPanel();
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
      alert("已成功退出管理员登录！");
      if (this.dirCache) this.dirCache.clear();
      this.fetchFiles(true);
      this.fetchStorageStats();
    },

    openAdminPanel() {
      this.showAdminPanel = true;
      this.fetchAppUpdates();
      this.fetchStorageStats();
    },

    fetchAppUpdates() {
      // 通过管理员授权接口直接从存储桶读取更新配置，杜绝请求 /raw/ 引发 401 登出
      axios.get("/api/admin/update/publish")
        .then(res => {
          this.appsUpdates = res.data.apps || {};
        })
        .catch(err => {
          console.error("获取 App 更新配置失败:", err);
          this.appsUpdates = {};
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
        if (error.response && error.response.status === 401 && error.config && !error.config.url.endsWith("/api/login")) {
          // 仅当管理员专有写操作或管理接口报错 401 时才判定 Token 失效，避免读取外链报错引发误登出
          if (error.config.url.startsWith("/api/write/") || error.config.url.startsWith("/api/admin/")) {
            this.isLoggedIn = false;
            this.showLogin = true;
          }
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
        const urlStr = typeof input === "string" ? input : (input ? input.url : "");
        if (urlStr && (urlStr.includes("/api/write/") || urlStr.includes("/api/admin/"))) {
          self.isLoggedIn = false;
          self.showLogin = true;
        }
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

    // 6. 隐蔽模式唤醒逻辑：键盘快捷键 Shift + L 直接开启控制台(已登录)或登录弹窗(未登录)
    window.addEventListener("keydown", (e) => {
      if (e.shiftKey && (e.key === "L" || e.key === "l")) {
        e.preventDefault();
        if (this.isLoggedIn) {
          this.openAdminPanel();
        } else {
          this.showLogin = true;
        }
      }
    });

    // 7. URL 暗号参数自动唤醒：?console=manage 或 ?admin=1
    try {
      const currentUrl = new URL(window.location);
      if (currentUrl.searchParams.get("console") === "manage" || currentUrl.searchParams.get("admin") === "1") {
        if (this.isLoggedIn) {
          this.openAdminPanel();
        } else {
          this.showLogin = true;
        }
        currentUrl.searchParams.delete("console");
        currentUrl.searchParams.delete("admin");
        window.history.replaceState(null, "", currentUrl.toString());
      }
    } catch (e) {}
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
/* --- 导航与面包屑工具栏 --- */
.breadcrumb-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  backdrop-filter: blur(8px);
}

.breadcrumb-path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.breadcrumb-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #0F172A;
}

.breadcrumb-item.breadcrumb-active {
  color: #0F172A;
  font-weight: 600;
}

.breadcrumb-separator {
  color: #94A3B8;
  font-size: 12px;
  user-select: none;
  margin: 0 1px;
}

.breadcrumb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #E2E8F0;
  background: #FFFFFF;
  border-radius: 6px;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
  color: #0F172A;
}

/* --- 存储容量监控卡片 --- */
.storage-widget {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.8);
  margin-bottom: 12px;
  border-radius: 8px;
  font-size: 13px;
}

.storage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-weight: 600;
  color: #1E293B;
}

.storage-info-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.storage-svg-icon {
  color: #475569;
}

.storage-progress-bar {
  height: 6px;
  background: #E2E8F0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.storage-progress-fill {
  height: 100%;
  background: #0F172A;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.storage-footer-stats {
  font-size: 11px;
  color: #64748B;
  text-align: right;
}

/* --- 登录弹窗与忘记密码指引 --- */
.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.login-svg-icon {
  color: #0F172A;
  margin-bottom: 6px;
}

.login-header h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #0F172A;
}

.login-header p {
  margin: 0;
  font-size: 12px;
  color: #64748B;
}

.login-form .input-field {
  margin-bottom: 12px;
}

.login-form .input-field input {
  width: 100%;
  padding: 10px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 13px;
  background: #FFFFFF;
}

.login-form .input-field input:focus {
  outline: none;
  border-color: #0F172A;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 12px;
}

.remember-label {
  cursor: pointer;
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.forgot-link {
  color: #475569;
  text-decoration: underline;
  cursor: pointer;
}

.forgot-link:hover {
  color: #0F172A;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #0F172A;
  border: none;
  border-radius: 6px;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: #1E293B;
}

.btn-secondary {
  width: 100%;
  padding: 9px;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  color: #334155;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: #E2E8F0;
  color: #0F172A;
}

.forgot-tips-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0F172A;
  margin-bottom: 10px;
}

.forgot-tips-header h4 {
  margin: 0;
  font-size: 15px;
}

.forgot-tips-content {
  font-size: 12px;
  line-height: 1.6;
  color: #475569;
}

.forgot-tips-content ol, .forgot-tips-content ul {
  padding-left: 18px;
  margin: 8px 0;
}

.forgot-tips-content li {
  margin-bottom: 4px;
}

.forgot-tips-content code {
  background: #F1F5F9;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 11px;
  color: #0F172A;
}

/* --- 控制台面板 --- */
.admin-panel {
  display: flex;
  flex-direction: column;
  max-height: 75vh;
  overflow-y: auto;
  min-width: 320px;
  width: 520px;
  max-width: 90vw;
  text-align: left;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 10px;
}

.admin-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0F172A;
}

.admin-header-title h3 {
  margin: 0;
  font-size: 16px;
}

.admin-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-header-logout {
  background: #FEF2F2;
  border: 1px solid #FEE2E2;
  color: #DC2626;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-header-logout:hover {
  background: #FEE2E2;
  color: #991B1B;
}

.btn-close-text {
  background: none;
  border: none;
  color: #64748B;
  font-size: 12px;
  cursor: pointer;
}

.btn-close-text:hover {
  color: #0F172A;
}

.admin-tabs {
  display: flex;
  margin-top: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #E2E8F0;
}

.admin-tabs button {
  flex: 1;
  padding: 8px 4px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  color: #64748B;
  transition: all 0.15s ease;
}

.admin-tabs button.active {
  color: #0F172A;
  border-bottom-color: #F6821F;
  font-weight: 600;
}

.panel-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed #E2E8F0;
  font-size: 13px;
  color: #334155;
}

.stat-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

@media (max-width: 480px) {
  .stat-card-grid {
    grid-template-columns: 1fr;
  }
}

.stat-mini-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 10px;
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

.stat-tip-box {
  background: #F1F5F9;
  color: #475569;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  margin: 12px 0;
  border-left: 3px solid #94A3B8;
}

.stat-tip-box p {
  margin: 0;
}

.btn-action-primary {
  width: 100%;
  padding: 10px;
  background: #0F172A;
  border: none;
  border-radius: 6px;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-action-primary:hover {
  background: #1E293B;
}

/* --- 流量防御与审计面板 --- */
.defense-panel {
  display: flex;
  flex-direction: column;
}

.defense-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.defense-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #0F172A;
}

.defense-tag {
  background: #E2E8F0;
  color: #334155;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 4px;
}

.defense-card p {
  margin: 0;
  font-size: 11px;
  color: #64748B;
  line-height: 1.5;
}

/* --- App 版本管理 --- */
.section-title-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title-btn h4 {
  margin: 0;
  font-size: 14px;
  color: #0F172A;
}

.btn-sm-primary {
  padding: 5px 10px;
  background: #0F172A;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.btn-sm-primary:hover {
  background: #1E293B;
}

.btn-sm-secondary {
  padding: 5px 10px;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  color: #334155;
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
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  margin-bottom: 6px;
  background: #F8FAFC;
}

.app-id-tag {
  font-size: 11px;
  color: #64748B;
  margin-left: 4px;
}

.app-item-meta {
  font-size: 11px;
  color: #64748B;
  margin-top: 2px;
}

.app-item-actions button {
  padding: 3px 8px;
  margin-left: 4px;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  color: #334155;
}

.btn-text-danger {
  color: #EF4444 !important;
  border-color: #FCA5A5 !important;
}

.empty-list-info, .empty-packages {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: #94A3B8;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  font-size: 11px;
  color: #475569;
  margin-bottom: 3px;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #CBD5E1;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 12px;
  background: #FFFFFF;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #0F172A;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 12px;
  color: #334155;
}

.form-group-row {
  display: flex;
  gap: 8px;
}

.form-group-row .form-group {
  flex: 1;
}

.packages-section {
  border-top: 1px solid #E2E8F0;
  margin-top: 12px;
  padding-top: 12px;
}

.package-edit-card {
  border: 1px dashed #CBD5E1;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  background: #F8FAFC;
}

.package-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.package-card-header h6 {
  margin: 0;
  font-size: 12px;
  color: #0F172A;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 15px;
  border-top: 1px solid #E2E8F0;
  padding-top: 12px;
}
</style>
