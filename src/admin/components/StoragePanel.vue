<script setup>
import { onMounted } from "vue";
import { useStorage } from "../composables/useStorage.js";
import { useOfficialR2 } from "../composables/useOfficialR2.js";
import { formatSize } from "../../lib/format.js";

const { storageStats, storageLoading, storageError, fetchStorageStats, recalculateStorage } = useStorage();
const { officialR2, fetchOfficialR2Metrics } = useOfficialR2();

onMounted(() => {
  fetchStorageStats();
});
</script>

<template>
  <div class="dash-content-card">
    <div class="dash-card-header">
      <h3>存储空间与对象概览</h3>
      <span class="dash-card-subtitle">实时监控 Cloudflare R2 存储桶对象分布及容量</span>
    </div>

    <!-- 错误提示条 -->
    <div v-if="storageError" style="margin-top: 12px; padding: 10px 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; font-size: 13px; color: #991B1B; display: flex; justify-content: space-between; align-items: center;">
      <span>⚠️ 数据加载失败：{{ storageError }}</span>
      <button class="btn-sm-secondary" @click="fetchStorageStats(true)" style="padding: 4px 12px; font-size: 12px;">重试</button>
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
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div>
          <h3 style="margin: 0;">S3 操作与网络流量指标</h3>
          <span class="dash-card-subtitle">
            由 Cloudflare 边缘节点在请求处理期间异步捕获与持久化记录
          </span>
        </div>
        <div v-if="storageStats?.kvStats?.enabled" style="font-size: 12px; color: #10B981; display: flex; align-items: center; gap: 4px; font-weight: 500;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
          KV 边缘审计已激活
        </div>
        <div v-else style="font-size: 12px; color: #F59E0B; display: flex; align-items: center; gap: 4px; font-weight: 500;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></span>
          未绑定 KV (计数未启动)
        </div>
      </div>
    </div>

    <!-- 未绑定 KV 提示条 -->
    <div v-if="!storageStats?.kvStats?.enabled" style="margin-top: 12px; padding: 12px 16px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; font-size: 13px; color: #92400E; line-height: 1.6;">
      <strong>ℹ️ 为什么此模块暂未计数？</strong>
      <p style="margin: 4px 0 0 0;">
        Cloudflare Pages / Workers 属于无状态边缘计算，每次请求结束后内存即销毁，因此请求数、S3 操作数及传输流量<strong>必须依赖 Cloudflare KV 数据库才能跨请求持久化累计</strong>。<br />
        若您需要开启实时计数，请在 Cloudflare Pages 设置中的 <code>Functions → KV namespace bindings</code> 添加绑定（变量名必须严格为 <code>KV</code>）并重新部署。上方的存储用量与文件总数来自 R2 元数据的增量统计，如发现与实际不符，可使用下方的「重新扫描并校准存储大小」进行全桶重算。
      </p>
    </div>

    <div class="stat-card-grid">
      <div class="stat-mini-card">
        <div class="card-label">S3 A 类操作 (写入/变更)</div>
        <div class="card-value">
          <template v-if="storageStats?.kvStats?.enabled">
            {{ storageStats.kvStats.classA }} <span class="card-unit">次已执行</span>
          </template>
          <template v-else><span style="color: #94A3B8; font-size: 16px;">未开启统计</span></template>
        </div>
        <div class="card-desc">PutObject / 分片上传 / 删除 / 创建文件夹</div>
      </div>

      <div class="stat-mini-card">
        <div class="card-label">S3 B 类操作 (读取/检索)</div>
        <div class="card-value">
          <template v-if="storageStats?.kvStats?.enabled">
            {{ storageStats.kvStats.classB }} <span class="card-unit">次已执行</span>
          </template>
          <template v-else><span style="color: #94A3B8; font-size: 16px;">未开启统计</span></template>
        </div>
        <div class="card-desc">GetObject / ListObjects / 文件下载与目录检索</div>
      </div>

      <div class="stat-mini-card">
        <div class="card-label">总请求数 (Requests)</div>
        <div class="card-value">
          <template v-if="storageStats?.kvStats?.enabled">
            {{ storageStats.kvStats.totalRequests }} <span class="card-unit">次请求</span>
          </template>
          <template v-else><span style="color: #94A3B8; font-size: 16px;">未开启统计</span></template>
        </div>
        <div class="card-desc">全站 API、浏览与资源访问总计</div>
      </div>

      <div class="stat-mini-card">
        <div class="card-label">总下载量 (Downloads)</div>
        <div class="card-value">
          <template v-if="storageStats?.kvStats?.enabled">
            {{ storageStats.kvStats.totalDownloads || 0 }} <span class="card-unit">次文件下载</span>
          </template>
          <template v-else><span style="color: #94A3B8; font-size: 16px;">未开启统计</span></template>
        </div>
        <div class="card-desc">/raw/ 资源与 APK 文件外链下载次数</div>
      </div>

      <div class="stat-mini-card">
        <div class="card-label">累计传输流量 (Traffic)</div>
        <div class="card-value">
          <template v-if="storageStats?.kvStats?.enabled">
            {{ formatSize(storageStats.kvStats.totalTrafficBytes || 0) }}
          </template>
          <template v-else><span style="color: #94A3B8; font-size: 16px;">未开启统计</span></template>
        </div>
        <div class="card-desc">经由 Cloudflare 边缘节点传输的数据流</div>
      </div>

      <div class="stat-mini-card">
        <div class="card-label">最新访客 IP / 地域</div>
        <div class="card-value">
          <template v-if="storageStats?.kvStats?.enabled && storageStats.kvStats.lastClient">
            {{ storageStats.kvStats.lastClient.ip }} <span class="card-unit">[{{ storageStats.kvStats.lastClient.country }}]</span>
          </template>
          <template v-else><span style="color: #94A3B8; font-size: 16px;">未开启统计</span></template>
        </div>
        <div class="card-desc">
          {{ storageStats?.kvStats?.enabled ? 'KV 实时捕获记录' : '绑定 KV 后将自动捕获最新访客网络信息' }}
        </div>
      </div>
    </div>

    <!-- Cloudflare 官方 R2 账单指标面板 (GraphQL API，非本地计数) -->
    <div class="dash-card-header" style="margin-top: 32px;">
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px;">
        <div>
          <h3 style="margin: 0;">Cloudflare 官方账单 R2 操作指标 (GraphQL API)</h3>
          <span class="dash-card-subtitle">直接对接 Cloudflare 计费后台拉取的 A 类/B 类调用次数，非内部埋点</span>
        </div>
        <button class="btn-sm-primary" :disabled="officialR2.loading" @click="fetchOfficialR2Metrics">
          {{ officialR2.loading ? '正在调取官方 API...' : '从 Cloudflare 官方拉取 A/B 数据' }}
        </button>
      </div>
    </div>

    <!-- 未配置 CF_ACCOUNT_ID / CF_API_TOKEN 提示 -->
    <div v-if="officialR2.loaded && !officialR2.data?.configured" style="margin-top: 12px; padding: 14px 16px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; font-size: 13px; color: #1E40AF; line-height: 1.6;">
      <strong>📌 如何直接获取 Cloudflare 官方权威 A/B 数据？</strong>
      <p style="margin: 4px 0 0 0;">
        Cloudflare 官方提供了统一的 <strong>GraphQL Analytics API</strong> 直接记录每一个 Bucket 产生的权威 Class A 和 Class B 次数。<br />
        若需一键调取，请在 Cloudflare Pages <code>Settings → Environment Variables</code> 中添加：<br />
        1. <code>CF_ACCOUNT_ID</code>: 您的 Cloudflare 账户 ID (在控制台概览右侧可复制)<br />
        2. <code>CF_API_TOKEN</code>: 具有 <code>Account Analytics: Read</code> 权限的 API 令牌<br />
        保存后重新部署，即可在此直接拉取官方月度计费单中的调用数！
      </p>
    </div>

    <!-- 官方数据展示面板 -->
    <div v-if="officialR2.loaded && officialR2.data?.success" style="margin-top: 14px;">
      <div class="stat-card-grid">
        <div class="stat-mini-card" style="border-top: 3px solid #2563EB;">
          <div class="card-label">官方 Class A 操作数</div>
          <div class="card-value" style="color: #2563EB;">
            {{ officialR2.data.officialClassA }} <span class="card-unit">次</span>
          </div>
          <div class="card-desc">Cloudflare 官方计费统计 (写入/List/修改)</div>
        </div>

        <div class="stat-mini-card" style="border-top: 3px solid #10B981;">
          <div class="card-value" style="color: #10B981;">
            {{ officialR2.data.officialClassB }} <span class="card-unit">次</span>
          </div>
          <div class="card-label">官方 Class B 操作数</div>
          <div class="card-desc">Cloudflare 官方计费统计 (读取/下载/元数据)</div>
        </div>

        <div class="stat-mini-card">
          <div class="card-label">官方总请求数 / 流量</div>
          <div class="card-value">
            {{ officialR2.data.totalRequests }} <span class="card-unit">次</span>
          </div>
          <div class="card-desc">出网流量：{{ formatSize(officialR2.data.totalBytes || 0) }}</div>
        </div>
      </div>

      <!-- 操作明细表格 -->
      <div v-if="officialR2.data.actionBreakdown?.length" style="margin-top: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px;">
        <strong style="font-size: 13px; color: #1E293B;">官方操作类型明细分布 (最近 {{ officialR2.data.timeRange?.days || 30 }} 天)：</strong>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
          <span v-for="item in officialR2.data.actionBreakdown" :key="item.actionType" style="background: #fff; border: 1px solid #CBD5E1; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #334155;">
            <strong>{{ item.actionType }}</strong> ({{ item.classType }} 类): <strong>{{ item.requests }}</strong> 次
          </span>
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
</template>
