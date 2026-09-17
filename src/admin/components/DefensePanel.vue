<script setup>
import { onMounted } from "vue";
import { useStorage } from "../composables/useStorage.js";
import { formatSize } from "../../lib/format.js";

const { storageStats, storageLoading, storageError, fetchStorageStats } = useStorage();

onMounted(() => {
  fetchStorageStats();
});
</script>

<template>
  <div class="dash-content-card">
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
          <strong>访问日志标准流式处理架构</strong>
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
            {{ storageStats?.kvStats?.enabled ? '由 Cloudflare KV 实时流式记录的最新访问流水 (最新 30 条记录)' : '可在 Pages 绑定 KV: KV 开启持久化实时流水审计' }}
          </span>
        </div>
        <button class="btn-sm-secondary" @click="fetchStorageStats(true)" :disabled="storageLoading">
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
        <p>绑定方式：登录 Cloudflare 控制台 -> Workers & Pages -> 进入本项目 -> 设置 -> Functions -> 绑定 KV 命名空间（变量名：<code>KV</code>）。绑定后边缘 Worker 将自动永久记录请求次数、文件下载量与出站流量流水。</p>
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
</template>
