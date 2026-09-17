<template>
  <div class="main"
      @dragenter.prevent
      @dragover.prevent
      @drop.prevent="onDrop"
      @contextmenu.self.prevent="openBlankContextMenu"
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

        <!-- 全局搜索结果面板 (当搜索框有内容时展示) -->
        <div v-if="search.trim()" class="search-results-panel">
          <div class="search-results-header">
            <div class="search-info">
              <span>全盘搜索结果: "<strong>{{ search }}</strong>"</span>
              <span v-if="!searchLoading" class="search-count">共检索到 {{ searchResults.length }} 个文件</span>
            </div>
            <button class="btn-clear-search" @click="search = ''">返回目录浏览</button>
          </div>

          <div v-if="searchLoading" style="margin: 35px 0; text-align: center">
            <span style="font-size: 15px; color: #64748B;">正在进行跨目录全盘极速检索...</span>
          </div>

          <ul v-else-if="searchResults.length" class="file-list">
            <li v-for="file in searchResults" :key="file.key">
              <div 
                tabindex="0" 
                class="file-item search-file-item" 
                @click="preview(file.key)"
                @contextmenu.prevent.stop="openItemContextMenu($event, file, false)"
              >
                <MimeIcon :content-type="file.httpMetadata?.contentType" :thumbnail="file.customMetadata?.thumbnail ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png` : null" />
                <div class="file-info-container">
                  <div class="file-name" v-text="file.key.split('/').pop()"></div>
                  <div class="file-attr">
                    <span class="search-file-path" @click.stop="navigateToParent(file.key)" title="点击直达所在目录">
                      📁 /{{ file.key.substring(0, file.key.lastIndexOf('/') + 1) }}
                    </span>
                    <span v-text="formatSize(file.size)"></span>
                    <span v-text="new Date(file.uploaded).toLocaleDateString()"></span>
                  </div>
                </div>
                <div class="search-item-actions">
                  <button class="btn-goto-folder" @click.stop="navigateToParent(file.key)" title="直接前往该文件所在目录">
                    直达目录
                  </button>
                  <div style="margin-left: 8px;" @click.stop="openItemContextMenu($event, file, false)">
                    <svg t="1741761103305" class="icon" viewBox="0 0 1024 1024" width="24" height="24">
                      <path d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z" fill="#64748B"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <div v-else style="margin: 40px 0; text-align: center">
            <span style="font-size: 15px; color: #94A3B8;">未在网盘中找到与 "{{ search }}" 匹配的文件</span>
          </div>
        </div>

        <!-- 普通目录浏览视图 -->
        <template v-else>
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
                    <path d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245333-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 341.333333V192a64 64 0 0 0-60.245333-63.893333L810.666667 128z" fill="#2c2c2c" p-id="6485"></path>
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
                @click="preview(file.key)"
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
                    <path d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245333-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 341.333333V192a64 64 0 0 0-60.245333-63.893333L810.666667 128z" fill="#2c2c2c" p-id="6485"></path>
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
        </template>
      </div><!-- end file-list-container -->
      
      <div style="flex:1" @contextmenu.prevent="openBlankContextMenu"></div>
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
          <button @click="openShareDialog(); showContextMenu = false;">
            <span>分享...</span>
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
          <a :href="rawUrl(focusedItem?.key)" target="_blank" download @click="showContextMenu = false;">
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
          <button @click="openShareDialog(); showContextMenu = false;">
            <span>分享...</span>
          </button>
        </li>
        <li>
          <button style="color: #EF4444" @click="removeFile(focusedItem); showContextMenu = false;">
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
          <button class="btn-primary" :disabled="loading" @click="confirmMove">
            {{ loading ? '移动中...' : '移动到此处' }}
          </button>
        </div>
      </div>
    </Dialog>

    <DialogHost />
    <ToastHost />
    <PreviewDialog
      v-model:show="showPreviewDialog"
      :file-key="previewFileKey"
      :token="authToken"
      @copy-success="onPreviewCopySuccess"
      @copy-failed="onPreviewCopyFailed"
    />

    <!-- 可控分享弹窗：生成 / 管理 / 撤销分享链接 -->
    <ShareDialog v-model:show="showShareDialog" :share-path="sharePath" />
  </div>
</template>

<script>
import http, { handleUnauthorized } from "./lib/request.js";
import { alertDialog, confirmDialog, promptDialog } from "./lib/dialog.js";
import { toastSuccess, toastError, toastWarn } from "./lib/toast.js";
import {
  generateThumbnail,
  blobDigest,
  multipartUpload,
  SIZE_LIMIT,
} from "./lib/upload.js";
import Dialog from "./components/Dialog.vue";
import Menu from "./components/Menu.vue";
import MimeIcon from "./components/MimeIcon.vue";
import UploadPopup from "./components/UploadPopup.vue";
import Footer from "./components/Footer.vue";
import DialogHost from "./components/DialogHost.vue";
import ToastHost from "./components/ToastHost.vue";
import PreviewDialog from "./components/PreviewDialog.vue";
import ShareDialog from "./components/ShareDialog.vue";
import { encodeKey, FOLDER_PLACEHOLDER } from "./lib/key.js";

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
    searchResults: [],
    searchLoading: false,
    searchTimer: null,
    showContextMenu: false,
    showMenu: false,
    showUploadPopup: false,
    showPreviewDialog: false,
    previewFileKey: "",
    showShareDialog: false,
    sharePath: "",
    uploadProgress: null,
    uploadQueue: [],

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
    moveCandidateFolders: [],

    // 上传队列成功/失败计数（用于最终汇总提示）
    uploadSuccessCount: 0,
    uploadFailCount: 0,
  }),

  computed: {
    authToken() {
      return localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token") || "";
    },
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

    menuItems() {
      const items = [
        { text: '按照名称排序A-Z' },
        { text: '按照大小递增排序' },
        { text: '按照大小递减排序' },
        { text: '粘贴文件到网盘' },
        { text: '清空本地浏览器缓存' }
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
      this.invalidateDirCache(this.cwd);
      this.fetchFiles(true);
      this.fetchStorageStats(true);
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

    // 打开分享弹窗：文件夹 focusedItem 为完整路径字符串，文件为 { key } 对象
    openShareDialog() {
      const item = this.focusedItem;
      this.sharePath = typeof item === "string" ? item : (item?.key || "");
      if (!this.sharePath) return;
      this.showShareDialog = true;
    },

    async copyPaste(source, target) {
      const encodedTarget = target.split('/').map(s => encodeURIComponent(s)).join('/');
      const uploadUrl = `/api/write/items/${encodedTarget}`;
      // HTTP header 只能是 ASCII，中文/特殊字符必须 encode
      // 后端 handler 会 decodeURIComponent 还原后再 bucket.get
      await http.put(uploadUrl, "", {
        headers: { "x-amz-copy-source": encodeURIComponent(source) },
      });
    },

    async createFolder() {
      if (this.loading) return;
      const input = await promptDialog({
        title: "新建文件夹",
        placeholder: "请输入文件夹名称",
        okText: "创建",
      });
      const folderName = (input || "").trim();
      if (!folderName) return;
      this.showUploadPopup = false;
      this.showBlankContextMenu = false;
      this.loading = true;
      try {
        const fullFolderKey = `${this.cwd}${folderName}/_$folder$`;
        const encodedFolderKey = fullFolderKey.split('/').map(s => encodeURIComponent(s)).join('/');
        const uploadUrl = `/api/write/items/${encodedFolderKey}`;
        await http.put(uploadUrl, "");
        this.invalidateDirCache(this.cwd);
        await this.fetchFiles(true);
        this.fetchStorageStats(true);
        toastSuccess(`已创建文件夹: ${folderName}`);
      } catch (error) {
        const status = error.response?.status;
        if (status !== 401 && status !== 403) {
          toastError('创建文件夹失败: ' + this.extractServerError(error));
        }
      } finally {
        this.loading = false;
      }
    },

    getDirCache(dir) {
      const now = Date.now();
      // 1. 优先从内存 Map 读取 (0ms 瞬时响应)
      if (this.dirCache && this.dirCache.has(dir)) {
        const item = this.dirCache.get(dir);
        if (item && (now - item.time < 86400000)) { // 浏览器内 24 小时长期持久缓存
          return item;
        }
      }
      // 2. 真正存储到浏览器持久存储 (localStorage) 中，即使完全关闭浏览器重新打开依然有效
      try {
        const stored = localStorage.getItem(`flaredrive_dircache_${dir}`) || sessionStorage.getItem(`flaredrive_dircache_${dir}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (now - parsed.time < 86400000)) {
            if (this.dirCache) this.dirCache.set(dir, parsed);
            return parsed;
          }
        }
      } catch (e) {}
      return null;
    },

    setDirCache(dir, files, folders) {
      const now = Date.now();
      const payload = {
        files: [...files],
        folders: [...folders],
        time: now
      };
      if (this.dirCache) {
        if (this.dirCache.has(dir)) {
          this.dirCache.delete(dir);
        } else if (this.dirCache.size >= 50) {
          const oldestKey = this.dirCache.keys().next().value;
          this.dirCache.delete(oldestKey);
        }
        this.dirCache.set(dir, payload);
      }
      try {
        const serialized = JSON.stringify(payload);
        localStorage.setItem(`flaredrive_dircache_${dir}`, serialized);
        sessionStorage.setItem(`flaredrive_dircache_${dir}`, serialized);
      } catch (e) {}
    },

    invalidateDirCache(dir = null) {
      if (dir === null) {
        if (this.dirCache) this.dirCache.clear();
        try {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith("flaredrive_dircache_")) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
          });
        } catch (e) {}
      } else {
        if (this.dirCache) this.dirCache.delete(dir);
        try {
          localStorage.removeItem(`flaredrive_dircache_${dir}`);
          sessionStorage.removeItem(`flaredrive_dircache_${dir}`);
        } catch (e) {}
      }
    },

    async fetchFiles(forceRefresh = false) {
      const currentDir = this.cwd;
      const now = Date.now();

      // SWR (Stale-While-Revalidate) 极速长缓存策略
      if (!forceRefresh) {
        const cached = this.getDirCache(currentDir);
        if (cached) {
          this.files = [...cached.files];
          this.folders = [...cached.folders];
          this.sortFiles();
          this.loading = false;
          // 3 分钟以内直接视为新鲜缓存，完全不发网络请求，0 R2 开销
          if (now - cached.time < 180000) {
            return;
          }
          // 超过 3 分钟但小于 30 分钟的，先秒开展示，再后台静默请求更新
        }
      }

      if (!this.files.length && !this.folders.length) {
        this.loading = true;
      }
      try {
        const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        // 强制刷新时加时间戳，绕过浏览器对列表响应的 HTTP 缓存/SWR
        const listUrl = `/api/children/${currentDir}${forceRefresh ? `?_t=${Date.now()}` : ""}`;
        const res = await fetch(listUrl, { headers, cache: forceRefresh ? "no-store" : "default" });
        if (!res.ok) {
          this.loading = false;
          if (res.status === 401 || res.status === 403) {
            // 原生 fetch 不走 axios 拦截器，需手动接入统一未授权处理；
            // 浏览文件列表属于被动请求，silent 静默同步状态、不弹窗打扰未登录用户；
            // 同时清空列表，避免继续显示缓存中的"幻影"文件/文件夹
            handleUnauthorized(res.status, listUrl, res, { silent: true });
            this.files = [];
            this.folders = [];
          }
          return;
        }
        const files = await res.json();
        if (!files) return;
        this.files = files.value || [];
        this.folders = files.folders || [];
        this.sortFiles();
        this.loading = false;

        this.setDirCache(currentDir, this.files, this.folders);
      } catch (err) {
        this.loading = false;
      }
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

    async onMenuClick(text) {
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
        case "清空本地浏览器缓存":
          this.invalidateDirCache();
          try {
            localStorage.removeItem("flaredrive_storage_stats");
            sessionStorage.removeItem("flaredrive_storage_stats");
          } catch (e) {}
          this.fetchFiles(true);
          this.fetchStorageStats(true);
          toastSuccess("本地浏览器缓存已清空，已重新从云端同步最新数据！");
          return;
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

    rawUrl(key) {
      const base = `/raw/${key}`;
      const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
      return token ? `${base}?token=${encodeURIComponent(token)}` : base;
    },

    preview(key) {
      this.previewFileKey = key;
      this.showPreviewDialog = true;
    },

    onPreviewCopySuccess(url) {
      toastSuccess('链接已复制到剪贴板');
    },

    onPreviewCopyFailed() {
      toastError('复制失败，请手动复制链接');
    },

    async pasteFile() {
      if (!this.clipboard || this.loading) return;
      const input = await promptDialog({
        title: "重命名为",
        value: this.clipboard.split("/").pop(),
      });
      if (input === null) return;
      const newName = input === "" ? this.clipboard.split("/").pop() : input.trim();
      this.loading = true;
      try {
        await this.copyPaste(this.clipboard, `${this.cwd}${newName}`);
        this.invalidateDirCache(this.cwd);
        await this.fetchFiles(true);
        this.fetchStorageStats(true);
        toastSuccess(`已粘贴: ${newName}`);
      } catch (error) {
        const status = error.response?.status;
        if (status !== 401 && status !== 403) {
          toastError('粘贴失败: ' + this.extractServerError(error));
        }
      } finally {
        this.loading = false;
      }
    },

    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        this.invalidateDirCache(this.cwd);
        this.fetchFiles(true);
        this.fetchStorageStats(true);
        this.uploadProgress = null;
        // 上传完成后给出汇总提示（只弹一次，不刷屏）
        const total = this.uploadSuccessCount + this.uploadFailCount;
        if (total > 0) {
          if (this.uploadFailCount === 0) {
            toastSuccess(`全部上传成功！共 ${this.uploadSuccessCount} 个文件`);
          } else if (this.uploadSuccessCount === 0) {
            const details = (this.uploadFailDetails || [])
              .map((f) => `• ${f.name}：${f.reason}`)
              .join("\n");
            await alertDialog(
              `全部上传失败（${this.uploadFailCount} 个）\n\n${details}`
            );
          } else {
            const details = (this.uploadFailDetails || [])
              .map((f) => `• ${f.name}：${f.reason}`)
              .join("\n");
            await alertDialog(
              `⚠️ 上传完成：成功 ${this.uploadSuccessCount} 个，失败 ${this.uploadFailCount} 个\n\n${details}`
            );
          }
          // 汇总弹窗后清空详情，下一批上传不会继承上一批的失败记录
          this.uploadFailDetails = [];
        }
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
            await http.put(thumbnailUploadUrl, thumbnailBlob);
            thumbnailDigest = digestHex;
          } catch (error) {
            console.warn(`Upload thumbnail ${digestHex}.png failed (非致命):`, error.message);
          }
        } catch (error) {
          console.warn(`Generate thumbnail ${file.name} failed (非致命):`, error.message);
        }
      }

      try {
        // 对每个路径段单独 URL 编码，保留 / 分隔符
        const fullPath = basedir + file.name;
        const encodedPath = fullPath.split('/').map(s => encodeURIComponent(s)).join('/');
        const uploadUrl = `/api/write/items/${encodedPath}`;
        const headers = {};
        const onUploadProgress = (progressEvent) => {
          var percentCompleted =
            (progressEvent.loaded * 100) / progressEvent.total;
          this.uploadProgress = percentCompleted;
        };
        if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;
        if (file.size >= SIZE_LIMIT) {
          const encodedPath = (`${basedir}${file.name}`).split('/').map(s => encodeURIComponent(s)).join('/');
          await multipartUpload(encodedPath, file, {
            headers,
            onUploadProgress,
          });
        } else {
          await http.put(uploadUrl, file, { headers, onUploadProgress });
        }
        this.uploadSuccessCount++;
      } catch (error) {
        this.uploadFailCount++;
        const fileName = file.name || "(未知文件)";
        const status = error.response?.status;
        const serverMsg = error.response?.data?.error || error.response?.statusText || error.message;
        let detail = serverMsg;
        if (status === 401 || status === 403) {
          detail = `没有上传权限 (HTTP ${status})`;
        } else if (status === 413) {
          detail = `文件过大 (HTTP ${status})，R2 单文件上限 ${formatSize(SIZE_LIMIT)}`;
        } else if (status === 404) {
          detail = `后端接口未找到 (HTTP 404)`;
        } else if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
          detail = `网络连接失败或超时`;
        }
        console.error(`Upload ${fileName} failed:`, error);
        // 收集错误详情，最后统一弹窗，不在每个文件失败时弹窗刷屏
        if (!this.uploadFailDetails) this.uploadFailDetails = [];
        this.uploadFailDetails.push({ name: fileName, reason: detail });
      }
      setTimeout(() => this.processUploadQueue());
    },

    async removeFile(target) {
      let key = "";
      let isFolder = false;
      if (typeof target === "string") {
        key = target;
        isFolder = true;
      } else if (target && target.key) {
        key = target.key;
        isFolder = false;
      } else {
        return;
      }

      // 统一计算展示名：文件夹 "3/_$folder$" 或 "3/" → "3/"；文件取最后一段
      let displayName;
      if (isFolder) {
        let folderName = key.endsWith('_$folder$') ? key.slice(0, -'_$folder$'.length) : key;
        folderName = folderName.replace(/\/+$/, '');
        displayName = (folderName.split('/').filter(Boolean).pop() || key) + '/';
      } else {
        displayName = key.split('/').pop() || key;
      }
      if (!(await confirmDialog(`确定要删除 ${displayName} 吗？此操作不可恢复。`, {
        title: "删除确认",
        danger: true,
        okText: "删除",
      }))) return;

      try {
        this.loading = true;
        let networkErrors = 0;

        // 删除策略：
        // - 后端返回明确的 2xx：R2 delete 幂等，直接信任成功（不再发二次列表请求校验，
        //   因为 children 接口带 60 秒缓存，二次 GET 可能拿到旧数据误报"对象仍存在"）
        // - 后端返回明确错误码（401/403/500）：抛出，由 catch 与全局拦截器提示具体原因
        // - 无 HTTP 响应的网络层异常：累计，稍后拉一次列表回查真实状态
        const del = async (encoded) => {
          try {
            await http.delete(`/api/write/items/${encoded}`);
          } catch (e) {
            if (e.response) throw e;
            networkErrors++;
          }
        };

        if (isFolder) {
          // 兼容两种入参："1/"（目录路径）或 "1/_$folder$"（占位符 key），统一归一化为 "1/"
          let folderBase = key.endsWith('_$folder$') ? key.slice(0, -'_$folder$'.length) : key;
          if (!folderBase.endsWith('/')) folderBase += '/';

          // 文件夹递归物理删除
          const allItems = await this.getAllItems(folderBase);
          for (const item of allItems) {
            const encoded = item.key.split('/').map(s => encodeURIComponent(s)).join('/');
            await del(encoded);
          }

          // 文件夹占位符必须删掉，否则文件夹仍会显示。
          // 占位符格式为 <路径>/_$folder$（与 createFolder 一致），folderBase 已以 "/" 结尾，
          // 直接拼接；不能先 slice 掉斜杠，否则拼出 "test/1_$folder$"（少一个斜杠），
          // 删除的是不存在的 key（R2 幂等返回 2xx），真占位符残留导致文件夹一直显示
          const folderPlaceholder = folderBase + '_$folder$';
          const encodedHolder = folderPlaceholder.split('/').map(s => encodeURIComponent(s)).join('/');
          await del(encodedHolder);
        } else {
          // 单文件物理删除 (对各路径段做安全转义)
          const encoded = key.split('/').map(s => encodeURIComponent(s)).join('/');
          await del(encoded);
        }

        // 若删除的是更新安装包 (update/apk/...)，同步从发布清单移除
        if (key.startsWith("update/apk/") && key.toLowerCase().endsWith(".apk")) {
          await this.syncRemoveApkFromPublishConfig(key);
        }

        this.invalidateDirCache(this.cwd);
        await this.fetchFiles(true);
        this.fetchStorageStats(true);

        if (networkErrors > 0) {
          // 仅在出现过无响应网络错误时才回查真实状态
          const stillExists = await this.itemStillExists(key, isFolder);
          if (stillExists === true) {
            toastError('删除失败：网络异常，对象仍存在，请重试');
          } else if (stillExists === false) {
            toastSuccess(`已成功删除: ${displayName}`);
          }
          // null（回查也失败，如未授权/断网）时全局 401 弹窗已说明，不再重复提示
        } else {
          toastSuccess(`已成功删除: ${displayName}`);
        }
      } catch (error) {
        console.error("删除失败:", error);
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          // 全局拦截器已弹出"未授权/没有操作权限"对话框，这里不重复提示
        } else {
          toastError(`删除失败: ${this.extractServerError(error)}`);
        }
      } finally {
        this.loading = false;
      }
    },

    /** 从 axios 错误中提取人类可读的后端消息（兼容 JSON {error}、纯文本、网络错误） */
    extractServerError(error) {
      const data = error.response?.data;
      if (typeof data === "string" && data.trim()) return data.trim();
      if (data && typeof data === "object" && data.error) return data.error;
      if (error.response?.statusText) return error.response.statusText;
      if (error.code === "ERR_NETWORK") return "网络连接失败，请检查服务是否启动";
      return error.message || "未知错误";
    },

    async syncRemoveApkFromPublishConfig(apkPath) {
      try {
        const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
        if (!token) return;
        const res = await http.get(`/api/admin/update/publish?_t=${Date.now()}`).catch(() => null);
        if (!res || !res.data || !res.data.apps) return;
        const apps = res.data.apps;
        const normPath = apkPath.startsWith('/') ? apkPath : '/' + apkPath;
        const rawPath = '/raw/' + apkPath.replace(/^\/+/, '');

        for (const appId of Object.keys(apps)) {
          const app = apps[appId];
          if (!app || !Array.isArray(app.packages)) continue;
          const match = app.packages.some(p => p.downloadUrl === normPath || p.downloadUrl === rawPath || p.downloadUrl?.includes(apkPath));
          if (match) {
            const updatedPackages = app.packages.filter(p => p.downloadUrl !== normPath && p.downloadUrl !== rawPath && !p.downloadUrl?.includes(apkPath));
            await http.post("/api/admin/update/publish", {
              appId: appId,
              appName: app.appName || "芝麻-TK",
              latestVersionCode: app.latestVersionCode || 35,
              latestVersionName: app.latestVersionName || "0.5.0",
              updateLog: app.updateLog || "",
              isForceUpdate: !!app.isForceUpdate,
              apkUploadDir: app.apkUploadDir || `update/apk/${appId}`,
              packages: updatedPackages
            }).catch(() => {});
            break;
          }
        }
      } catch (e) {
        console.warn("同步移除发布清单记录失败:", e);
      }
    },

    async renameFile(key) {
      if (this.loading) return;
      const oldName = key.split('/').pop();
      const input = await promptDialog({ title: "重命名为", value: oldName });
      if (input === null) return;
      const newName = input.trim();
      if (!newName || newName === oldName) return;
      this.loading = true;
      try {
        const targetPath = `${this.cwd}${newName}`;
        await this.copyPaste(key, targetPath);
        await http.delete(`/api/write/items/${key}`);
        this.invalidateDirCache(this.cwd);
        await this.fetchFiles(true);
        this.fetchStorageStats(true);
        toastSuccess(`已重命名为 ${newName}`);
      } catch (error) {
        const status = error.response?.status;
        if (status !== 401 && status !== 403) {
          toastError('重命名失败: ' + this.extractServerError(error));
        }
      } finally {
        this.loading = false;
      }
    },

    // =========================================================================
    // 空白处右键菜单逻辑 (包含拍照上传、图片视频、其他文件、新建文件夹等)
    // =========================================================================
    openBlankContextMenu(ev) {
      ev.preventDefault();
      this.showContextMenu = false;
      const menuWidth = 200;
      const menuHeight = 260;
      this.blankMenuX = Math.max(10, Math.min(ev.clientX, window.innerWidth - menuWidth - 10));
      this.blankMenuY = Math.max(10, Math.min(ev.clientY, window.innerHeight - menuHeight - 10));
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
      const confirmMove = await confirmDialog(`确定要将文件移动到目录 "${folderName}" 吗？`, {
        title: "移动文件",
        okText: "移动",
      });
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
      const confirmMove = await confirmDialog(`确定要将文件移动到 "${targetName}" 吗？`, {
        title: "移动文件",
        okText: "移动",
      });
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
        // 用 axios http 而不是原生 fetch——确保 Authorization 拦截器生效
        const res = await http.get(`/api/children/${dirPath}`);
        const data = res.data;
        // 过滤掉当前被移动的文件夹自身（防止循环移动进自身子目录）
        const movingBase = this.movingItemKey?.endsWith("_$folder$") ? this.movingItemKey.slice(0, -9) : null;
        this.moveCandidateFolders = (data.folders || []).filter(f => !movingBase || !f.startsWith(movingBase));
      } catch (e) {
        console.warn("加载子文件夹失败:", e.response?.status, e.message);
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
      // executeMove 返回 false 表示校验未通过（如同路径），保持弹窗打开让用户重选
      const ok = await this.executeMove(this.movingItemKey, this.moveTargetPath);
      if (ok !== false) {
        this.showMoveDialog = false;
      }
    },

    async executeMove(sourceKey, targetDir) {
      if (this.loading) return;
      const isFolder = sourceKey.endsWith('_$folder$');
      let finalFileName = "";
      let sourceBasePath = "";
      if (isFolder) {
        const clean = sourceKey.slice(0, -9);
        finalFileName = clean.split('/').filter(Boolean).pop() || "";
        sourceBasePath = clean.replace(/\/$/, "") + "/";
      } else {
        finalFileName = sourceKey.split('/').pop() || "";
      }
      const normalizedPath = targetDir === '' ? '' : (targetDir.endsWith('/') ? targetDir : targetDir + '/');

      // 安全拦截 1：目标路径与源路径完全相同（移动到当前目录）——否则会先 copy 覆盖自己再 delete 删掉自己
      if (isFolder) {
        const targetBasePath = normalizedPath + finalFileName + '/';
        if (targetBasePath === sourceBasePath) {
          toastWarn('目标位置与当前位置相同，无需移动');
          return false;
        }
        // 安全拦截 2：不能把文件夹移动到它自己内部（会导致递归混乱）
        if (targetBasePath.startsWith(sourceBasePath)) {
          toastError('不能将文件夹移动到它自己或它的子目录内');
          return false;
        }
      } else {
        const targetFilePath = normalizedPath + finalFileName;
        if (targetFilePath === sourceKey) {
          toastWarn('目标位置与当前位置相同，无需移动');
          return false;
        }
      }

      this.loading = true;
      try {
        if (isFolder) {
          const targetBasePath = normalizedPath + finalFileName + '/';
          const allItems = await this.getAllItems(sourceBasePath);
          const totalItems = allItems.length;
          let processedItems = 0;

          for (const item of allItems) {
            const relativePath = item.key.substring(sourceBasePath.length);
            const newPath = targetBasePath + relativePath;
            try {
              await this.copyPaste(item.key, newPath);
              const encodedKey = item.key.split('/').map(s => encodeURIComponent(s)).join('/');
              await http.delete(`/api/write/items/${encodedKey}`);
              processedItems++;
              this.uploadProgress = (processedItems / totalItems) * 100;
            } catch (error) {
              console.error(`移动 ${item.key} 失败:`, error);
            }
          }

          // targetBasePath 已以 "/" 结尾（如 "test/2/"），直接拼占位符得到 "test/2/_$folder$"
          // 与 createFolder 的占位符格式保持一致；不能先 slice 掉斜杠，否则会变成 "test/2_$folder$"
          const targetFolderPath = targetBasePath + '_$folder$';
          await this.copyPaste(sourceKey, targetFolderPath);
          const encodedSource = sourceKey.split('/').map(s => encodeURIComponent(s)).join('/');
          await http.delete(`/api/write/items/${encodedSource}`);
          this.uploadProgress = null;
        } else {
          const targetFilePath = normalizedPath + finalFileName;
          await this.copyPaste(sourceKey, targetFilePath);
          const encodedSource = sourceKey.split('/').map(s => encodeURIComponent(s)).join('/');
          await http.delete(`/api/write/items/${encodedSource}`);
        }

        this.invalidateDirCache(this.cwd);
        this.invalidateDirCache(targetDir);
        this.invalidateDirCache(normalizedPath);
        this.search = "";
        await this.fetchFiles(true);
        this.fetchStorageStats(true);
        toastSuccess(`已成功移动到: /${normalizedPath}`);
        return true;
      } catch (error) {
        console.error('移动失败:', error);
        const status = error.response?.status;
        if (status !== 401 && status !== 403) {
          toastError('移动失败: ' + this.extractServerError(error));
        }
        // 失败后必须丢弃缓存、重新拉取真实状态，避免前端残留与 R2 实际不一致的列表
        this.invalidateDirCache(this.cwd);
        this.invalidateDirCache(normalizedPath);
        await this.fetchFiles(true).catch(() => {});
        return false;
      } finally {
        this.uploadProgress = null;
        this.loading = false;
      }
    },

    async performGlobalSearch(q) {
      try {
        const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          this.searchResults = data.results || [];
        } else {
          this.searchResults = [];
          if (res.status === 401 || res.status === 403) {
            // 搜索同样是被动请求，静默处理不弹窗
            handleUnauthorized(res.status, '/api/search', res, { silent: true });
          }
        }
      } catch (e) {
        this.searchResults = [];
      } finally {
        this.searchLoading = false;
      }
    },

    navigateToParent(key) {
      const lastSlash = key.lastIndexOf('/');
      const parentDir = lastSlash === -1 ? '' : key.substring(0, lastSlash + 1);
      this.search = '';
      this.navigateTo(parentDir);
    },

    async getAllItems(prefix) {
      const items = [];
      let marker = null;
      do {
        const url = `/api/children/${prefix}${marker ? '?marker=' + encodeURIComponent(marker) : ''}`;
        const response = await http.get(url);
        const data = response.data;
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

    /**
     * 校验对象是否仍存在于 R2（删除后做最终确认）
     * @returns {Promise<boolean|null>} true=仍存在 false=已消失 null=无法判断（请求失败）
     */
    async itemStillExists(key, isFolder) {
      try {
        if (isFolder) {
          let clean = key.endsWith('_$folder$') ? key.slice(0, -'_$folder$'.length) : key;
          clean = clean.replace(/\/+$/, '');
          const slashIdx = clean.lastIndexOf('/');
          const parent = slashIdx >= 0 ? clean.slice(0, slashIdx + 1) : '';
          const folderFull = clean + '/';
          const encParent = parent.split('/').map(s => encodeURIComponent(s)).join('/');
          const res = await http.get(`/api/children/${encParent}?_v=${Date.now()}`);
          return (res.data.folders || []).includes(folderFull);
        } else {
          const slashIdx = key.lastIndexOf('/');
          const parent = slashIdx >= 0 ? key.slice(0, slashIdx + 1) : '';
          const encParent = parent.split('/').map(s => encodeURIComponent(s)).join('/');
          const res = await http.get(`/api/children/${encParent}?_v=${Date.now()}`);
          return (res.data.value || []).some(v => v.key === key);
        }
      } catch (e) {
        return null;
      }
    },

    uploadFilesToDir(files, targetDir) {
      const normDir = targetDir === '' ? '' : (targetDir.endsWith('/') ? targetDir : targetDir + '/');
      const uploadTasks = Array.from(files).map((file) => ({
        basedir: normDir,
        file,
      }));
      // 重置本批次的成功/失败计数
      this.uploadSuccessCount = 0;
      this.uploadFailCount = 0;
      this.uploadFailDetails = [];
      this.uploadQueue.push(...uploadTasks);
      setTimeout(() => this.processUploadQueue());
    },

    uploadFiles(files) {
      this.uploadFilesToDir(files, this.cwd);
    },

    fetchStorageStats(forceRefresh = false) {
      const now = Date.now();
      if (!forceRefresh) {
        try {
          const cached = sessionStorage.getItem("flaredrive_storage_stats");
          if (cached) {
            const parsed = JSON.parse(cached);
            // 10 分钟持久缓存容量统计，避免频繁读取 R2 元数据
            if (parsed && (now - (parsed._cacheTime || 0) < 600000)) {
              this.storageStats = parsed;
              return;
            }
          }
        } catch (e) {}
      }

      // 强制刷新时加时间戳绕过浏览器 HTTP 缓存：
      // usage 接口带 Cache-Control: max-age=60, stale-while-revalidate=300，
      // 不加 _t 的话删除/上传后立刻刷新仍会拿到缓存里的旧统计（计数看似没变化）
      http.get(forceRefresh ? `/api/storage/usage?_t=${now}` : "/api/storage/usage", {
        cache: forceRefresh ? "no-store" : "default",
      })
        .then(res => {
          if (res.data) {
            const data = {
              ...res.data,
              loading: false,
              _cacheTime: Date.now()
            };
            this.storageStats = data;
            try {
              sessionStorage.setItem("flaredrive_storage_stats", JSON.stringify(data));
            } catch (e) {}
          }
        })
        .catch(err => {
          console.error("获取存储统计失败:", err);
          if (this.storageStats) this.storageStats.loading = false;
        });
    },

    async logout() {
      if (this._logoutBusy) return;
      this._logoutBusy = true;
      try {
        localStorage.removeItem("flaredrive_token");
        sessionStorage.removeItem("flaredrive_token");
        this.isLoggedIn = false;
        toastSuccess("已成功退出登录！");
        this.invalidateDirCache();
        try {
          sessionStorage.removeItem("flaredrive_storage_stats");
        } catch (e) {}
        this.fetchFiles(true);
        this.fetchStorageStats(true);
      } finally {
        this._logoutBusy = false;
      }
    },

    onFooterAdminClick() {
      // 彻底解耦：点击直接跳转至独立的后台控制台页面
      window.location.href = "/admin.html";
    }
  },

  watch: {
    search: {
      handler(val) {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        const q = (val || "").trim();
        if (!q) {
          this.searchResults = [];
          this.searchLoading = false;
          return;
        }
        this.searchLoading = true;
        this.searchTimer = setTimeout(() => {
          this.performGlobalSearch(q);
        }, 300);
      }
    },

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
            ? "Cloudflare R2 网盘文件库"
            :`${this.cwd.replace(/.*\/(?!$)|\//g, "") || "/" } - Cloudflare R2 网盘文件库`;
      },
      immediate: true,
    }
  },

  created() {
    // 1. 监听路由历史
    window.addEventListener("popstate", () => {
      const searchParams = new URL(window.location).searchParams;
      if (searchParams.get("p") !== this.cwd)
        this.cwd = searchParams.get("p") || "";
    });

    // 2. 读取持久化登录态
    const savedToken = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
    if (savedToken) {
      this.isLoggedIn = true;
    }

    // 任意接口返回 401/403 时（request.js 全局拦截器派发），同步登出态
    this._onUnauthorized = () => {
      this.isLoggedIn = false;
    };
    window.addEventListener("flaredrive:unauthorized", this._onUnauthorized);

    // 3. 存储容量异步统计
    this.fetchStorageStats();

    // 4. URL 参数暗号直达后台控制台
    try {
      const currentUrl = new URL(window.location);
      if (currentUrl.searchParams.get("console") === "manage" || currentUrl.searchParams.get("admin") === "1") {
        window.location.href = "/admin.html";
      }
    } catch (e) {}
  },

  unmounted() {
    if (this._onUnauthorized) {
      window.removeEventListener("flaredrive:unauthorized", this._onUnauthorized);
    }
  },

  components: {
    Dialog,
    DialogHost,
    ToastHost,
    PreviewDialog,
    ShareDialog,
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
  min-height: 100%;
  overflow-y: auto;
  flex-direction: column;
  background: var(--c-bg);
}

.view-content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 12px;
}

.app-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-bar);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: calc(8px + var(--safe-top)) 4px 8px;
  background: var(--c-surface-soft);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--c-border);
}

.app-title-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.app-title {
  font-size: 19px;
  font-weight: 700;
  margin: 0 12px 0 4px !important;
  white-space: nowrap;
  user-select: none;
  color: var(--c-text);
}

.app-bar input {
  flex: 1;
  min-width: 180px;
}

.menu-button {
  position: relative;
  margin-left: auto;
}

.menu-button button.circle {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--c-hover);
  font-size: 15px;
}

.file-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 2px 16px;
}

.file-list {
  flex: 1;
}

.file-item {
  background: transparent;
}

.file-item:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: -2px;
}

.file-name {
  font-size: clamp(15px, 1.6vw, 16px);
  color: var(--c-text);
}

.upload-button {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + var(--safe-bottom));
  z-index: var(--z-fab);
  width: 56px;
  height: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--c-primary);
  color: #fff;
  border-radius: 50%;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.28);
  transition: transform 0.2s, background-color 0.2s;
}

.upload-button:hover {
  background-color: var(--c-primary-hover);
  transform: scale(1.05);
}

.upload-button:active {
  transform: scale(0.96);
}

progress {
  position: fixed;
  top: var(--safe-top);
  left: 0;
  width: 100%;
  height: 4px;
  z-index: var(--z-progress);
  appearance: none;
  border: none;
}

progress::-webkit-progress-bar {
  background-color: transparent;
}

progress::-webkit-progress-value {
  background-color: var(--c-accent);
}

/* --- 面包屑导航栏 --- */
.breadcrumb-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
  box-shadow: var(--shadow-card);
}

.breadcrumb-path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  font-size: 13px;
  min-width: 0;
  flex: 1;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  min-height: 32px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--c-text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.breadcrumb-item:hover {
  background: var(--c-hover);
  color: var(--c-text);
}

.breadcrumb-active {
  color: var(--c-text);
  font-weight: 600;
}

.breadcrumb-separator {
  color: var(--c-text-faint);
  user-select: none;
  font-size: 12px;
}

.breadcrumb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  min-height: 34px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  color: var(--c-text-sub);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool:hover {
  background: var(--c-hover);
  color: var(--c-text);
}

/* --- 存储容量展示卡片 --- */
.storage-widget {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow-card);
}

.storage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--c-text-sub);
  font-weight: 500;
  margin-bottom: 6px;
}

.storage-info-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.storage-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--c-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin-bottom: 4px;
}

.storage-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-primary), var(--c-accent));
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}

.storage-footer-stats {
  font-size: 11px;
  color: var(--c-text-muted);
  display: flex;
  justify-content: flex-end;
}

/* --- 拖拽悬停反馈 (高亮指示) --- */
.folder-drop-hover {
  background-color: var(--c-accent-soft) !important;
  outline: 2px dashed var(--c-accent) !important;
  border-radius: var(--radius-sm);
}

/* --- 空白处快捷菜单 --- */
.contextmenu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 998;
}

.blank-context-menu {
  position: fixed;
  z-index: 999;
  background: var(--c-surface-soft);
  backdrop-filter: blur(14px);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-pop);
  padding: 6px;
  min-width: 200px;
  max-width: calc(100vw - 20px);
  max-height: calc(100vh - 20px - var(--safe-bottom));
  overflow-y: auto;
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
  min-height: 44px;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--c-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.1s ease;
}

.context-menu-item:hover {
  background: var(--c-hover);
}

.context-menu-item svg {
  color: var(--c-text-muted);
}

.context-menu-item:hover svg {
  color: var(--c-text);
}

.context-menu-divider {
  height: 1px;
  background: var(--c-border);
  margin: 4px 2px;
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

.contextmenu-list li:last-child {
  margin-bottom: 0;
}

.contextmenu-list button,
.contextmenu-list a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--c-text-sub);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease;
  box-sizing: border-box;
}

.contextmenu-list button:hover,
.contextmenu-list a:hover {
  background: var(--c-hover);
  color: var(--c-text);
  border-color: var(--c-border);
}

/* --- 可视化文件移动弹窗 --- */
.move-dialog-box {
  padding: 16px;
  width: min(440px, calc(100vw - 32px));
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
  padding: 10px 18px;
  min-height: 42px;
  background: var(--c-primary);
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: var(--c-primary-hover);
}

.btn-secondary {
  padding: 10px 18px;
  min-height: 42px;
  background: var(--c-hover);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  color: var(--c-text-sub);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: #e2e8f0;
  color: var(--c-text);
}

/* 全局搜索结果面板样式 */
.search-results-panel {
  padding: 6px 0;
}

.search-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--c-hover);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  border: 1px solid var(--c-border);
}

.search-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--c-text);
  min-width: 0;
}

.search-count {
  font-size: 11px;
  color: var(--c-text-muted);
  background: var(--c-surface);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--c-border-strong);
  white-space: nowrap;
}

.btn-clear-search {
  padding: 7px 14px;
  min-height: 36px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  color: var(--c-text-sub);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-clear-search:hover {
  background: var(--c-primary);
  color: #fff;
  border-color: var(--c-primary);
}

.search-file-path {
  color: var(--c-accent) !important;
  cursor: pointer;
  text-decoration: underline;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.search-item-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: 10px;
  flex-shrink: 0;
}

.btn-goto-folder {
  padding: 6px 12px;
  min-height: 34px;
  background: var(--c-accent-soft);
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-sm);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-goto-folder:hover {
  background: var(--c-accent);
  color: #fff;
  border-color: var(--c-accent);
}

/* ============ 响应式：手机端（<=640px） ============ */
@media (max-width: 640px) {
  .view-content-wrapper {
    padding: 0 6px;
  }

  /* 顶栏折成两行：第一行标题+菜单，第二行搜索框 */
  .app-bar {
    gap: 8px;
    padding: calc(8px + var(--safe-top)) 8px 8px;
  }

  .app-bar input {
    order: 3;
    flex-basis: 100%;
    min-width: 0;
  }

  .app-title-container {
    order: 1;
  }

  .menu-button {
    order: 2;
  }

  .menu-button-text {
    display: none;
  }

  .app-title {
    font-size: 17px;
    margin-right: 8px !important;
  }

  .file-list-container {
    padding: 8px 0 88px;
  }

  .file-list > li {
    margin-left: 4px;
    margin-right: 4px;
  }

  .file-icon {
    width: 40px;
    height: 40px;
  }

  /* 文件属性行允许折行，防止长名称/日期溢出 */
  .file-attr {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }

  .storage-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .storage-footer-stats {
    justify-content: flex-start;
  }

  .breadcrumb-toolbar {
    padding: 8px 10px;
  }

  .breadcrumb-actions {
    width: 100%;
    justify-content: flex-end;
  }

  /* 右键菜单改为接近底部的动作面板，保证触屏可达 */
  .blank-context-menu {
    min-width: 0;
    width: calc(100vw - 24px);
    left: 12px !important;
    right: 12px;
    bottom: calc(12px + var(--safe-bottom));
    top: auto !important;
    max-height: 60vh;
    border-radius: var(--radius-lg);
  }

  .search-info {
    font-size: 12px;
  }

  .search-file-path {
    max-width: 140px;
  }

  .search-results-header {
    flex-direction: column;
    align-items: stretch;
  }

  .move-dialog-actions {
    flex-direction: column-reverse;
  }

  .move-dialog-actions button {
    width: 100%;
  }

  .btn-move-nav {
    min-height: 36px;
  }
}
</style>
