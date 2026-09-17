<script setup>
import { useAdminSession } from "../composables/useAdminSession.js";
const { session, handleLogin } = useAdminSession();
</script>

<template>
  <div class="admin-auth-screen">
    <div class="auth-card">
      <div class="auth-card-header">
        <img src="/assets/homescreen.png" alt="FlareDrive" style="height: 36px; margin-bottom: 8px" />
        <h2 class="auth-title">FlareDrive 管理中心</h2>
        <p class="auth-desc">请输入管理员凭证以解锁运维与应用管理面板</p>
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="auth-field">
          <label>管理员账号</label>
          <input type="text" v-model="session.loginUsername" placeholder="账号 " required autocomplete="username" />
        </div>
        <div class="auth-field">
          <label>管理员密码</label>
          <input type="password" v-model="session.loginPassword" placeholder="密码" required autocomplete="current-password" />
        </div>

        <div class="auth-options">
          <label class="remember-label">
            <input type="checkbox" v-model="session.rememberMe" /> 保持登录状态
          </label>
          <a href="javascript:void(0)" class="auth-help-link" @click="session.showForgotTips = true">凭证重置指南</a>
        </div>

        <button type="submit" class="btn-auth-submit" :disabled="session.authLoading">
          {{ session.authLoading ? "正在验证..." : "进入管理控制台" }}
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
</template>
