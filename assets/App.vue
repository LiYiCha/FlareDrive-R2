<template>
  <div class="main" 
      @dragenter.prevent 
      @dragover.prevent 
      @drop.prevent="onDrop"
      @contextmenu.self.prevent="openBlankContextMenu"
      :style="{ backgroundImage: `url('${backgroundImageUrl}')` }"
  >
    <progress v-if="uploadProgress !== null" :value="uploadProgress" max="100"></progress>
    <UploadPopup v-model="showUploadPopup" @upload="onUploadClicked" @createFolder="createFolder"></UploadPopup>

    <!-- 隐藏的本地文件/拍照选择器 (支持页面空白处右键菜单触发) -->
    <input ref="cameraInput" type="file" accept="image/*" capture="camera" hidden @change="onNativeUpload($event)" />
    <input ref="mediaInput" type="file" accept="image/*,video/*" multiple hidden @change="onNativeUpload($event)" />
    <input ref="fileInput" type="file" accept="*" multiple hidden @change="onNativeUpload($event)" />

    <!-- 网盘主视图 -->
    <div class="view-content-wrapper" @contextmenu.self.prevent="openBlankContextMenu">
      <!-- 浮动上传快捷按钮 -->
      <button class="upload-button circle" @click="showUploadPopup = true" title="上传/新建">
        <svg t="1741764069699" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
          p-id="24280" width="24" height="24">
          <path
            d="M576 557.7088V934.4H448V560.4416l-43.8912 43.8848L313.6 513.8176l199.1232-199.1168 0.64 0.64 0.64-0.64 199.1232 199.1168-90.5088 90.5088L576 557.7088zM704 678.4h32c88.3648 0 160-71.6352 160-160s-71.6352-160-160-160c-20.5184 0-40.128 3.8592-58.1568 10.8992C670.336 270.1248 587.4944 192 486.4 192c-106.0416 0-192 85.9584-192 192 0 15.9104 1.9328 31.3728 5.5872 46.1568A127.7504 127.7504 0 0 0 256 422.4c-70.6944 0-128 57.3056-128 128s57.3056 128 128 128h64v128H256c-141.3824 0-256-114.6176-256-256 0-113.3184 73.632-209.4464 175.6608-243.136C210.0352 167.584 336.1216 64 486.4 64c121.312 0 227.552 67.712 281.7728 168.1792C912.0896 248.1792 1024 370.2208 1024 518.4c0 159.0592-128.9408 288-288 288h-32v-128z"
            fill="#e6e6e6" p-id="24281"></path>
        </svg>
      </button>
      
      <!-- 顶栏 -->
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
          <Menu v-model="showMenu" :items="menuItems" @click="onMenuClick"></Menu>
        </div>
      </div>

      <!-- 文件列表主区域 -->
      <div class="file-list-container" @contextmenu.prevent="openBlankContextMenu">
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

        <!-- 面包屑与路径导航栏 (支持拖放放入) -->
        <div class="breadcrumb-toolbar">
          <div class="breadcrumb-path">
            <button 
              class="breadcrumb-item" 
              :class="{ 'breadcrumb-active': cwd === '', 'folder-drop-hover': dragOverCrumb === '' }" 
              @click="navigateTo('')" 
              @dragover.prevent="onDragOverCrumb($event, '')"
              @dragleave="dragOverCrumb = null"
              @drop.prevent="onDropOnCrumb($event, '')"
              title="返回根目录 (支持文件拖拽放入)"
            >
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
                :class="{ 'breadcrumb-active': idx === breadcrumbs.length - 1, 'folder-drop-hover': dragOverCrumb === crumb.path }" 
                @click="navigateTo(crumb.path)"
                @dragover.prevent="onDragOverCrumb($event, crumb.path)"
                @dragleave="dragOverCrumb = null"
                @drop.prevent="onDropOnCrumb($event, crumb.path)"
                title="点击跳转 / 拖拽移入此目录"
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

        <!-- 文件与文件夹列表 -->
        <ul class="file-list" @contextmenu.self.prevent="openBlankContextMenu">
          <li v-if="cwd !== ''">
            <div tabindex="0" class="file-item" @click="navigateUp" @contextmenu.prevent.stop="openBlankContextMenu">
              <div class="file-icon">
                <svg viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                  <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
                </svg>
              </div>
              <div class="file-info-container"><span class="file-name">返回上级目录</span></div>
            </div>
          </li>
          
          <!-- 文件夹项目 (支持拖出移动和拖入放置) -->
          <li v-for="folder in filteredFolders" :key="folder">
            <div 
              tabindex="0" 
              class="file-item" 
              :class="{ 'folder-drop-hover': dragOverFolder === folder }"
              @click="navigateTo(folder)" 
              @contextmenu.prevent.stop="openItemContextMenu($event, folder, true)"
              draggable="true"
              @dragstart="onDragStart($event, folder + '_$folder$')"
              @dragend="onDragEnd"
              @dragover.prevent="onDragOverFolder($event, folder)"
              @dragleave="onDragLeaveFolder(folder)"
              @drop.prevent="onDropOnFolder($event, folder)"
            >
              <div class="file-icon">
                <svg viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                  <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
                </svg>
              </div>
              <div class="file-info-container"><span class="file-name" v-text="folder.match(/.*?([^/]*)\/?$/)[1]"></span></div>
              <div style="margin-right: 10px;margin-left: auto;" @click.stop="openItemContextMenu($event, folder, true)">
                <svg t="1741761103305" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6484" width="28" height="28">
                  <path d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245333-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 341.333333V192a64 64 0 0 0-60.245334-63.893333L810.666667 128z" fill="#2c2c2c" p-id="6485"></path>
                </svg>
              </div>
            </div>
          </li>

          <!-- 文件项目 (支持长按/拖动移动) -->
          <li v-for="file in filteredFiles" :key="file.key">
            <div 
              tabindex="0" 
              class="file-item" 
              style="position: relative;"
              @click="preview(`/raw/${file.key}`)" 
              @contextmenu.prevent.stop="openItemContextMenu($event, file, false)"
              draggable="true"
              @dragstart="onDragStart($event, file.key)"
              @dragend="onDragEnd"
            >
              <MimeIcon :content-type="file.httpMetadata?.contentType" :thumbnail="file.customMetadata?.thumbnail ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png` : null" />
              <div class="file-info-container">
                <div class="file-name" v-text="file.key.split('/').pop()"></div>
                <div class="file-attr">
                  <span v-text="new Date(file.uploaded).toLocaleString()"></span>
                  <span v-text="formatSize(file.size)"></span>
                </div>
              </div>
              <div style="margin-right: 10px;margin-left: auto;" @click.stop="openItemContextMenu($event, file, false)">
                <svg t="1741761103305" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6484" width="28" height="28">
                  <path d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 341.333333V192a64 64 0 0 0-60.245334-63.893333L810.666667 128z" fill="#2c2c2c" p-id="6485"></path>
                </svg>
              </div>
            </div>
          </li>
        </ul>
        
        <div v-if="loading" style="margin: 30px 0; text-align: center">
          <span style="font-size: 16px; color: #64748B;">正在加载文件...</span>
        </div>
        <div v-else-if="!filteredFiles.length && !filteredFolders.length" style="margin: 40px 0; text-align: center">
          <span style="font-size: 16px; color: #94A3B8;">当前目录为空，可右键或点击右下角按钮上传</span>
        </div>
      </div><!-- end file-list-container -->
      
      <div style="flex:1"></div>
      <Footer @open-admin="onFooterAdminClick" />
    </div>

    <!-- =========================================================================
         空白处右键快捷菜单 (包含拍照上传、图片视频、其他文件、新建文件夹等)
         ========================================================================= -->
    <div v-if="showBlankContextMenu" class="contextmenu-backdrop" @click="showBlankContextMenu = false" @contextmenu.prevent="showBlankContextMenu = false"></div>
    <div 
      v-if="showBlankContextMenu" 
      class="blank-context-menu" 
      :style="{ top: blankMenuY + 'px', left: blankMenuX + 'px' }"
      @click.stop
    >
      <div class="context-menu-header">快捷操作</div>
      <button class="context-menu-item" @click="triggerUpload('camera')">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span>拍照上传</span>
      </button>

      <button class="context-menu-item" @click="triggerUpload('media')">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>图片 / 视频</span>
      </button>

      <button class="context-menu-item" @click="triggerUpload('file')">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>其他文件</span>
      </button>

      <button class="context-menu-item" @click="triggerUpload('folder')">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          <line x1="12" y1="11" x2="12" y2="17"></line>
          <line x1="9" y1="14" x2="15" y2="14"></line>
        </svg>
        <span>新建文件夹</span>
      </button>

      <div class="context-menu-divider"></div>

      <button class="context-menu-item" @click="refreshCurrentDir(); showBlankContextMenu = false;">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>刷新目录</span>
      </button>

      <button v-if="clipboard" class="context-menu-item" @click="pasteFile(); showBlankContextMenu = false;">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        <span>粘贴文件</span>
      </button>
    </div>

    <!-- =========================================================================
         单个文件/文件夹操作弹窗
         ========================================================================= -->
    <Dialog v-model="showContextMenu">
      <div style="height: 48px; display: flex; justify-content: center; align-items: center; padding: 10px; background: #F1F5F9; margin: 0 0 12px 0; border-radius: 8px;">
        <div v-text="focusedItem?.key || focusedItem" class="contextmenu-filename" @click.stop.prevent
          style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; font-weight: 500; color: #1E293B;"></div>
      </div>
      
      <!-- 文件夹菜单 -->
      <ul v-if="typeof focusedItem === 'string'" class="contextmenu-list">
        <li>
          <button @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`); showContextMenu = false;">
            <span>复制链接</span>
          </button>
        </li>
        <li>
          <button @click="openMoveDialog(focusedItem + '_$folder$'); showContextMenu = false;">
            <span>移动到...</span>
          </button>
        </li>
        <li>
          <button style="color: #EF4444" @click="removeFile(focusedItem + '_$folder$'); showContextMenu = false;">
            <span>删除</span>
          </button>
        </li>
      </ul>

      <!-- 文件菜单 -->
      <ul v-else class="contextmenu-list">
        <li>
          <button @click="renameFile(focusedItem?.key); showContextMenu = false;">
            <span>重命名</span>
          </button>
        </li>
        <li>
          <a :href="`/raw/${focusedItem?.key}`" target="_blank" download @click="showContextMenu = false;">
            <span>下载</span>
          </a>
        </li>
        <li>
          <button @click="clipboard = focusedItem?.key; showContextMenu = false;">
            <span>复制</span>
          </button>
        </li>
        <li>
          <button @click="openMoveDialog(focusedItem?.key); showContextMenu = false;">
            <span>移动到...</span>
          </button>
        </li>
        <li>
          <button @click="copyLink(`/raw/${focusedItem?.key}`); showContextMenu = false;">
            <span>复制外链</span>
          </button>
        </li>
        <li>
          <button style="color: #EF4444" @click="removeFile(focusedItem?.key); showContextMenu = false;">
            <span>删除</span>
          </button>
        </li>
      </ul>
    </Dialog>

    <!-- =========================================================================
         可视化文件移动选择器弹窗 (比 window.prompt 更优雅便捷，支持触屏与鼠标)
         ========================================================================= -->
    <Dialog v-model="showMoveDialog">
      <div class="move-dialog-box">
        <div class="move-dialog-header">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4 5.4-5.4z"></path>
          </svg>
          <h4>移动文件/文件夹</h4>
        </div>
        
        <div class="move-item-info">
          <span>待移动对象：</span>
          <strong>{{ getFileName(movingItemKey) }}</strong>
        </div>

        <div class="move-path-selector">
          <div class="move-current-path">
            <span>目标目录：</span>
            <code>/{{ moveTargetPath }}</code>
          </div>

          <div class="move-nav-actions">
            <button class="btn-move-nav" :class="{ disabled: moveTargetPath === '' }" @click="moveNavigateTo('')" title="移动到根目录">
              📁 根目录
            </button>
            <button class="btn-move-nav" :class="{ disabled: moveTargetPath === '' }" @click="moveNavigateUp" title="返回上一级">
              ⬆️ 返回上一级
            </button>
          </div>

          <!-- 子文件夹选择列表 -->
          <div class="move-folder-list">
            <div v-if="moveCandidateFolders.length === 0" class="move-folder-empty">
              当前目录下无其他子文件夹
            </div>
            <div 
              v-for="folder in moveCandidateFolders" 
              :key="folder" 
              class="move-folder-row"
              @click="moveNavigateTo(folder)"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{{ folder.replace(/.*\/(?!$)|\//g, '') }}/</span>
              <svg class="arrow-right" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <div class="move-dialog-actions">
          <button class="btn-secondary" @click="showMoveDialog = false">取 消</button>
          <button class="btn-primary" @click="confirmMove">移动到此处</button>
        </div>
      </div>
    </Dialog>
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

    // 登录与存储统计
    isLoggedIn: false,
    storageStats: {
      usedBytes: 0,
      quotaBytes: 10 * 1024 * 1024 * 1024,
      fileCount: 0,
      folderCount: 0,
      loading: true
    },

    // 空白处右键菜单状态
    showBlankContextMenu: false,
    blankMenuX: 0,
    blankMenuY: 0,

    // 拖拽移动状态
    draggedItem: null,
    dragOverFolder: null,
    dragOverCrumb: null,

    // 可视化移动弹窗状态
    showMoveDialog: false,
    movingItemKey: null,
    moveTargetPath: "",
    moveCandidateFolders: []
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

    // 菜单项：前台保持极简与纯粹
    menuItems() {
      const items = [
        { text: '按照名称排序A-Z' },
        { text: '按照大小递增排序' },
        { text: '按照大小递减排序' },
        { text: '粘贴文件到网盘' }
      ];
      if (this.isLoggedIn) {
        items.push(
          { text: '管理控制台' },
          { text: '安全退出登录' }
        );
      }
      return items;
    }
  },

  methods: {
    getFileName(key) {
      if (!key) return "";
      let name = key.split("/").pop();
      if (name.endsWith("_$folder$")) name = name.slice(0, -9);
      return name;
    },

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
        this.showBlankContextMenu = false;
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
        case "管理控制台":
          window.location.href = "/admin.html";
          return;
        case "安全退出登录":
          this.logout();
          return;
      }
      this.sortFiles();
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
      let newName = window.prompt("重命名为:", this.clipboard.split("/").pop());
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
        this.fetchStorageStats();
        this.uploadProgress = null;
        return;
      }

      const { basedir, file } = this.uploadQueue.shift();
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
      const oldName = key.split('/').pop();
      const newName = window.prompt("重命名为:", oldName);
      if (!newName || newName === oldName) return;
      const targetPath = `${this.cwd}${newName}`;
      await this.copyPaste(key, targetPath);
      await axios.delete(`/api/write/items/${key}`);
      if (this.dirCache) this.dirCache.clear();
      this.fetchFiles(true);
    },

    // =========================================================================
    // 空白处右键菜单逻辑 (包含拍照上传、图片视频、其他文件、新建文件夹等)
    // =========================================================================
    openBlankContextMenu(ev) {
      ev.preventDefault();
      this.showContextMenu = false;
      const menuWidth = 190;
      const menuHeight = 240;
      this.blankMenuX = Math.min(ev.clientX, window.innerWidth - menuWidth - 10);
      this.blankMenuY = Math.min(ev.clientY, window.innerHeight - menuHeight - 10);
      this.showBlankContextMenu = true;
    },

    triggerUpload(type) {
      this.showBlankContextMenu = false;
      if (type === 'camera') {
        this.$refs.cameraInput?.click();
      } else if (type === 'media') {
        this.$refs.mediaInput?.click();
      } else if (type === 'file') {
        this.$refs.fileInput?.click();
      } else if (type === 'folder') {
        this.createFolder();
      }
    },

    onNativeUpload(event) {
      const target = event.target;
      if (target && target.files && target.files.length > 0) {
        this.uploadFiles(target.files);
        target.value = "";
      }
      this.showBlankContextMenu = false;
    },

    openItemContextMenu(ev, item, isFolder) {
      ev.preventDefault();
      this.showBlankContextMenu = false;
      this.focusedItem = item;
      this.showContextMenu = true;
    },

    // =========================================================================
    // 文件移动逻辑：支持鼠标拖拽移动与可视化弹窗移动两种方式
    // =========================================================================
    onDragStart(ev, itemKey) {
      this.draggedItem = itemKey;
      ev.dataTransfer.setData("text/plain", itemKey);
      ev.dataTransfer.effectAllowed = "move";
    },

    onDragEnd() {
      this.draggedItem = null;
      this.dragOverFolder = null;
      this.dragOverCrumb = null;
    },

    onDragOverFolder(ev, folder) {
      const isExternalFiles = ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes("Files");
      if (isExternalFiles) {
        this.dragOverFolder = folder;
        ev.dataTransfer.dropEffect = "copy";
        return;
      }
      if (this.draggedItem && !this.draggedItem.startsWith(folder)) {
        this.dragOverFolder = folder;
        ev.dataTransfer.dropEffect = "move";
      }
    },

    onDragLeaveFolder(folder) {
      if (this.dragOverFolder === folder) {
        this.dragOverFolder = null;
      }
    },

    onDragOverCrumb(ev, crumbPath) {
      const isExternalFiles = ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes("Files");
      if (isExternalFiles) {
        this.dragOverCrumb = crumbPath;
        ev.dataTransfer.dropEffect = "copy";
        return;
      }
      if (this.draggedItem) {
        this.dragOverCrumb = crumbPath;
        ev.dataTransfer.dropEffect = "move";
      }
    },

    async onDropOnFolder(ev, targetFolder) {
      ev.stopPropagation();
      this.dragOverFolder = null;

      // 1. 优先检查是否是从电脑本地拖拽文件直接放入该文件夹 (拖拽上传)
      let externalFiles = [];
      if (ev.dataTransfer.items) {
        externalFiles = [...ev.dataTransfer.items]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter(Boolean);
      }
      if (!externalFiles.length && ev.dataTransfer.files) {
        externalFiles = Array.from(ev.dataTransfer.files);
      }

      if (externalFiles.length > 0) {
        const destDir = targetFolder.endsWith('/') ? targetFolder : targetFolder + '/';
        this.uploadFilesToDir(externalFiles, destDir);
        return;
      }

      // 2. 否则处理网盘内部文件/文件夹的拖拽移动
      const sourceKey = this.draggedItem || ev.dataTransfer.getData("text/plain");
      this.draggedItem = null;
      if (!sourceKey || sourceKey.startsWith(targetFolder)) return;

      const folderName = targetFolder.replace(/.*\/(?!$)|\//g, '');
      const confirmMove = window.confirm(`确定要将文件移动到目录 "${folderName}" 吗？`);
      if (confirmMove) {
        await this.executeMove(sourceKey, targetFolder);
      }
    },

    async onDropOnCrumb(ev, crumbPath) {
      ev.stopPropagation();
      this.dragOverCrumb = null;

      // 1. 检查是否是从电脑本地拖拽文件放入面包屑路径 (如直接拖入“根目录”或上层目录)
      let externalFiles = [];
      if (ev.dataTransfer.items) {
        externalFiles = [...ev.dataTransfer.items]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter(Boolean);
      }
      if (!externalFiles.length && ev.dataTransfer.files) {
        externalFiles = Array.from(ev.dataTransfer.files);
      }

      if (externalFiles.length > 0) {
        const destDir = crumbPath === '' ? '' : (crumbPath.endsWith('/') ? crumbPath : crumbPath + '/');
        this.uploadFilesToDir(externalFiles, destDir);
        return;
      }

      // 2. 内部文件移动
      const sourceKey = this.draggedItem;
      this.draggedItem = null;
      if (!sourceKey) return;
      if (crumbPath === this.cwd) return; // 当前就在该目录

      const targetName = crumbPath === '' ? '根目录' : crumbPath;
      const confirmMove = window.confirm(`确定要将文件移动到 "${targetName}" 吗？`);
      if (confirmMove) {
        await this.executeMove(sourceKey, crumbPath);
      }
    },

    // 可视化移动弹窗
    openMoveDialog(key) {
      this.movingItemKey = key;
      this.moveTargetPath = this.cwd;
      this.loadMoveCandidateFolders(this.moveTargetPath);
      this.showMoveDialog = true;
    },

    async loadMoveCandidateFolders(dirPath) {
      try {
        const res = await fetch(`/api/children/${dirPath}`);
        if (res.ok) {
          const data = await res.json();
          // 过滤掉当前被移动的文件夹自身（防止循环移动进自身子目录）
          const movingBase = this.movingItemKey?.endsWith("_$folder$") ? this.movingItemKey.slice(0, -9) : null;
          this.moveCandidateFolders = (data.folders || []).filter(f => !movingBase || !f.startsWith(movingBase));
        } else {
          this.moveCandidateFolders = [];
        }
      } catch (e) {
        this.moveCandidateFolders = [];
      }
    },

    moveNavigateTo(path) {
      this.moveTargetPath = path;
      this.loadMoveCandidateFolders(path);
    },

    moveNavigateUp() {
      if (!this.moveTargetPath) return;
      const parent = this.moveTargetPath.replace(/[^\/]+\/$/, "");
      this.moveNavigateTo(parent);
    },

    async confirmMove() {
      if (!this.movingItemKey) return;
      await this.executeMove(this.movingItemKey, this.moveTargetPath);
      this.showMoveDialog = false;
    },

    async executeMove(sourceKey, targetDir) {
      const fileName = sourceKey.split('/').pop();
      const finalFileName = fileName.endsWith('_$folder$') ? fileName.slice(0, -9) : fileName;
      const normalizedPath = targetDir === '' ? '' : (targetDir.endsWith('/') ? targetDir : targetDir + '/');

      try {
        if (sourceKey.endsWith('_$folder$')) {
          const sourceBasePath = sourceKey.slice(0, -9);
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
          await this.copyPaste(sourceKey, targetFolderPath);
          await axios.delete(`/api/write/items/${sourceKey}`);
          this.uploadProgress = null;
        } else {
          const targetFilePath = normalizedPath + finalFileName;
          await this.copyPaste(sourceKey, targetFilePath);
          await axios.delete(`/api/write/items/${sourceKey}`);
        }

        if (this.dirCache) this.dirCache.clear();
        this.fetchFiles(true);
        this.fetchStorageStats();
      } catch (error) {
        console.error('移动失败:', error);
        alert('移动失败，请确认权限或网络状态');
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
        items.push(...(data.value || []));
        for (const folder of (data.folders || [])) {
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

    uploadFilesToDir(files, targetDir) {
      const normDir = targetDir === '' ? '' : (targetDir.endsWith('/') ? targetDir : targetDir + '/');
      const uploadTasks = Array.from(files).map((file) => ({
        basedir: normDir,
        file,
      }));
      this.uploadQueue.push(...uploadTasks);
      setTimeout(() => this.processUploadQueue());
    },

    uploadFiles(files) {
      this.uploadFilesToDir(files, this.cwd);
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

    logout() {
      localStorage.removeItem("flaredrive_token");
      sessionStorage.removeItem("flaredrive_token");
      this.isLoggedIn = false;
      alert("已成功退出管理员登录！");
      if (this.dirCache) this.dirCache.clear();
      this.fetchFiles(true);
      this.fetchStorageStats();
    },

    onFooterAdminClick() {
      // 彻底解耦：点击直接跳转至独立的后台控制台页面
      window.location.href = "/admin.html";
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
    // 1. 设置 JWT 自动携带及拦截器
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

    // 2. 拦截全局原生 fetch
    const originalFetch = window.fetch;
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
      return originalFetch(input, init);
    };

    // 3. 监听路由历史
    window.addEventListener("popstate", () => {
      const searchParams = new URL(window.location).searchParams;
      if (searchParams.get("p") !== this.cwd)
        this.cwd = searchParams.get("p") || "";
    });

    // 4. 读取持久化登录态
    const savedToken = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
    if (savedToken) {
      this.isLoggedIn = true;
    }

    // 5. 存储容量异步统计
    this.fetchStorageStats();

    // 6. URL 参数暗号直达后台控制台
    try {
      const currentUrl = new URL(window.location);
      if (currentUrl.searchParams.get("console") === "manage" || currentUrl.searchParams.get("admin") === "1") {
        window.location.href = "/admin.html";
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

.app-title {
  font-family: '寒蝉半圆体', -apple-system, BlinkMacSystemFont, "Segoe UI Adjusted",
    "Segoe UI", "Liberation Sans", sans-serif;
}

.app-bar input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  flex: 1;
}

.menu-button {
  margin-left: 8px;
  position: relative;
}

.file-list-container {
  padding: 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}

.file-item {
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background-color 0.2s, border-color 0.2s, transform 0.15s ease;
  user-select: none;
  cursor: pointer;
  padding: 4px 0;
}

.file-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.file-icon {
  width: 48px;
  height: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.file-info-container {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
  overflow: hidden;
}

.file-name {
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-attr {
  font-size: 12px;
  color: #666;
}

.file-attr span:not(:first-child) {
  margin-left: 8px;
}

.upload-button {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 10;
  background-color: rgb(44, 44, 44);
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  border: none;
  transition: transform 0.2s;
}

.upload-button:hover {
  transform: scale(1.05);
}

progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  z-index: 9999;
  appearance: none;
  border: none;
}

progress::-webkit-progress-bar {
  background-color: transparent;
}

progress::-webkit-progress-value {
  background-color: #0F172A;
}

/* --- 面包屑导航栏 --- */
.breadcrumb-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.breadcrumb-path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 13px;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #64748B;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.breadcrumb-item:hover {
  background: #F1F5F9;
  color: #0F172A;
}

.breadcrumb-active {
  color: #0F172A;
  font-weight: 600;
}

.breadcrumb-separator {
  color: #94A3B8;
  user-select: none;
  font-size: 12px;
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
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  color: #334155;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool:hover {
  background: #F8FAFC;
  border-color: #94A3B8;
  color: #0F172A;
}

/* --- 存储容量展示卡片 --- */
.storage-widget {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.storage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  margin-bottom: 6px;
}

.storage-info-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0F172A;
  font-weight: 600;
}

.storage-progress-bar {
  width: 100%;
  height: 6px;
  background: #E2E8F0;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 4px;
}

.storage-progress-fill {
  height: 100%;
  background: #0F172A;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.storage-footer-stats {
  font-size: 11px;
  color: #64748B;
  display: flex;
  justify-content: flex-end;
}

/* --- 拖拽悬停反馈 (高亮指示) --- */
.folder-drop-hover {
  background-color: #EFF6FF !important;
  outline: 2px dashed #3B82F6 !important;
  border-radius: 6px;
  transform: scale(1.01);
}

/* --- 空白处右键快捷菜单 --- */
.contextmenu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 998;
}

.blank-context-menu {
  position: fixed;
  z-index: 999;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  padding: 6px;
  min-width: 175px;
  animation: contextMenuFadeIn 0.12s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-header {
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  padding: 4px 8px 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #1E293B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.1s ease;
}

.context-menu-item:hover {
  background: #F1F5F9;
  color: #0F172A;
}

.context-menu-item svg {
  color: #64748B;
}

.context-menu-item:hover svg {
  color: #0F172A;
}

.context-menu-divider {
  height: 1px;
  background: #E2E8F0;
  margin: 4px 0;
}

/* --- 上下文菜单列表通用样式 --- */
.contextmenu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.contextmenu-list li {
  margin-bottom: 4px;
}

.contextmenu-list button,
.contextmenu-list a {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease;
  box-sizing: border-box;
}

.contextmenu-list button:hover,
.contextmenu-list a:hover {
  background: #F1F5F9;
  color: #0F172A;
}

/* --- 可视化文件移动弹窗 --- */
.move-dialog-box {
  padding: 16px;
  min-width: 320px;
  max-width: 440px;
  width: 100%;
}

.move-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0F172A;
  margin-bottom: 12px;
}

.move-dialog-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.move-item-info {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  color: #475569;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.move-item-info strong {
  color: #0F172A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.move-path-selector {
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 10px;
  background: #FFFFFF;
  margin-bottom: 16px;
}

.move-current-path {
  font-size: 12px;
  color: #64748B;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.move-current-path code {
  background: #F1F5F9;
  padding: 2px 6px;
  border-radius: 4px;
  color: #0F172A;
  font-family: monospace;
}

.move-nav-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.btn-move-nav {
  padding: 4px 8px;
  background: #F1F5F9;
  border: 1px solid #CBD5E1;
  border-radius: 4px;
  font-size: 11px;
  color: #334155;
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-move-nav:hover:not(.disabled) {
  background: #E2E8F0;
  color: #0F172A;
}

.btn-move-nav.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.move-folder-list {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #F1F5F9;
  border-radius: 6px;
  background: #FAFAFA;
}

.move-folder-empty {
  padding: 16px;
  text-align: center;
  font-size: 11px;
  color: #94A3B8;
}

.move-folder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #F1F5F9;
  cursor: pointer;
  font-size: 12px;
  color: #1E293B;
  transition: background 0.12s ease;
}

.move-folder-row:hover {
  background: #EFF6FF;
  color: #1D4ED8;
}

.move-folder-row .arrow-right {
  margin-left: auto;
  color: #94A3B8;
}

.move-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 16px;
  background: #0F172A;
  border: none;
  border-radius: 6px;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: #1E293B;
}

.btn-secondary {
  padding: 8px 16px;
  background: #F1F5F9;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: #E2E8F0;
  color: #0F172A;
}

.view-content-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
