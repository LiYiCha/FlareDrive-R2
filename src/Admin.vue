<script setup>
import { onMounted } from "vue";
import Footer from "./components/Footer.vue";
import DialogHost from "./components/DialogHost.vue";
import ToastHost from "./components/ToastHost.vue";
import AdminLogin from "./admin/components/AdminLogin.vue";
import StoragePanel from "./admin/components/StoragePanel.vue";
import UpdatesPanel from "./admin/components/UpdatesPanel.vue";
import DefensePanel from "./admin/components/DefensePanel.vue";
import SharePanel from "./admin/components/SharePanel.vue";
import { useAdminSession } from "./admin/composables/useAdminSession.js";
import { reactive } from "vue";

const { session, logout, restoreSession } = useAdminSession();
const activeTab = reactive({ value: "storage" });

onMounted(() => {
  restoreSession();
});
</script>

<template>
  <div class="admin-wrapper">
    <!-- 未登录状态：独立全屏管理员鉴权中心 -->
    <AdminLogin v-if="!session.isLoggedIn" />

    <!-- 已登录状态：独立全屏控制台工作台 -->
    <div v-else class="admin-dashboard-screen">
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

      <main class="dash-main-container">
        <nav class="dash-nav-tabs">
          <button class="dash-tab-btn" :class="{ active: activeTab.value === 'storage' }" @click="activeTab.value = 'storage'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span>S3 运维与存储</span>
          </button>
          <button class="dash-tab-btn" :class="{ active: activeTab.value === 'updates' }" @click="activeTab.value = 'updates'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span>App 版本管理</span>
          </button>
          <button class="dash-tab-btn" :class="{ active: activeTab.value === 'defense' }" @click="activeTab.value = 'defense'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>流量防御与审计</span>
          </button>
          <button class="dash-tab-btn" :class="{ active: activeTab.value === 'share' }" @click="activeTab.value = 'share'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>分享管理</span>
          </button>
        </nav>

        <StoragePanel v-if="activeTab.value === 'storage'" />
        <UpdatesPanel v-if="activeTab.value === 'updates'" />
        <DefensePanel v-if="activeTab.value === 'defense'" />
        <SharePanel v-if="activeTab.value === 'share'" />
      </main>

      <div style="flex:1"></div>
      <Footer />
    </div>

    <!-- 忘记密码/凭证配置指南弹窗 -->
    <div v-if="session.showForgotTips" class="admin-modal-overlay" @click.self="session.showForgotTips = false">
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
        <button class="btn-secondary" @click="session.showForgotTips = false" style="margin-top: 15px; width: 100%;">关闭指南</button>
      </div>
    </div>

    <DialogHost />
    <ToastHost />
  </div>
</template>
