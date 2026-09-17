<script setup>
import { onMounted, ref } from "vue";
import { listShares, deleteShare, buildShareUrl } from "../../lib/share.js";
import { confirmDialog } from "../../lib/dialog.js";
import { toastSuccess, toastError } from "../../lib/toast.js";

const shares = ref([]);
const loading = ref(false);
const error = ref("");
const revokingToken = ref("");

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const res = await listShares();
    shares.value = res.data?.value || [];
  } catch (err) {
    const status = err.response?.status;
    error.value =
      status === 401
        ? "没有操作权限（分享管理仅限管理员账号）"
        : err.response?.data?.error || err.message || "加载失败";
    shares.value = [];
  } finally {
    loading.value = false;
  }
}

async function copyLink(share) {
  const url = buildShareUrl(share.token);
  try {
    await navigator.clipboard.writeText(url);
    toastSuccess("分享链接已复制");
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toastSuccess("分享链接已复制");
    } catch (e2) {
      toastError("复制失败，请手动复制：" + url);
    }
  }
}

async function revoke(share) {
  if (revokingToken.value) return; // 防重复点击
  const ok = await confirmDialog(
    `撤销后链接立即失效，确定撤销「${share.name}」的分享吗？`,
    { title: "撤销分享", danger: true, okText: "撤销" }
  );
  if (!ok) return;
  revokingToken.value = share.token;
  try {
    await deleteShare(share.token);
    toastSuccess("分享已撤销");
    await load();
  } catch (err) {
    const status = err.response?.status;
    toastError(
      status === 401
        ? "没有操作权限，撤销失败"
        : "撤销失败：" + (err.response?.data?.error || err.message)
    );
  } finally {
    revokingToken.value = "";
  }
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

function expiryText(share) {
  return share.expiresAt === 0 ? "永久有效" : formatDate(share.expiresAt);
}

onMounted(load);
</script>

<template>
  <div class="dash-content-card">
    <div class="dash-card-header">
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div>
          <h3>分享管理</h3>
          <span class="dash-card-subtitle">
            通过 /s/ 链接对外分享文件与文件夹，链接可设置有效期与提取码，随时撤销立即失效
          </span>
        </div>
        <button class="btn-sm-secondary" :disabled="loading" @click="load" style="padding: 6px 14px; font-size: 12px;">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </button>
      </div>
    </div>

    <div v-if="error" style="margin-top: 12px; padding: 10px 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; font-size: 13px; color: #991B1B; display: flex; justify-content: space-between; align-items: center;">
      <span>⚠️ {{ error }}</span>
      <button class="btn-sm-secondary" @click="load" style="padding: 4px 12px; font-size: 12px;">重试</button>
    </div>

    <div style="margin-top: 16px; overflow-x: auto;">
      <table v-if="shares.length" style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="text-align: left; color: #64748B; border-bottom: 1px solid #E2E8F0;">
            <th style="padding: 8px 10px;">名称</th>
            <th style="padding: 8px 10px;">类型</th>
            <th style="padding: 8px 10px;">路径</th>
            <th style="padding: 8px 10px;">状态</th>
            <th style="padding: 8px 10px;">提取码</th>
            <th style="padding: 8px 10px;">下载次数</th>
            <th style="padding: 8px 10px;">过期时间</th>
            <th style="padding: 8px 10px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in shares" :key="s.token" style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px; font-weight: 500; color: #1E293B;">{{ s.name }}</td>
            <td style="padding: 10px; color: #64748B;">{{ s.type === 'folder' ? '📁 文件夹' : '📄 文件' }}</td>
            <td style="padding: 10px; color: #94A3B8; font-size: 12px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="s.path">{{ s.path }}</td>
            <td style="padding: 10px;">
              <span :style="{ color: s.expired ? '#F59E0B' : '#10B981', fontSize: '12px' }">
                ● {{ s.expired ? '已过期' : '有效' }}
              </span>
            </td>
            <td style="padding: 10px; color: #64748B;">{{ s.hasCode ? '已启用' : '—' }}</td>
            <td style="padding: 10px; color: #64748B;">{{ s.downloads }}</td>
            <td style="padding: 10px; color: #64748B; font-size: 12px;">{{ expiryText(s) }}</td>
            <td style="padding: 10px; white-space: nowrap;">
              <button class="btn-sm-secondary" @click="copyLink(s)" style="padding: 4px 10px; font-size: 12px; margin-right: 6px;">复制链接</button>
              <button class="btn-sm-secondary" :disabled="revokingToken === s.token" @click="revoke(s)" style="padding: 4px 10px; font-size: 12px; color: #DC2626; border-color: #FECACA;">
                {{ revokingToken === s.token ? '撤销中...' : '撤销' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="!loading && !error" style="text-align: center; color: #94A3B8; font-size: 13px; padding: 32px 0;">
        暂无分享记录 —— 在网盘中右键文件/文件夹选择「分享...」即可创建
      </div>
      <div v-else-if="loading" style="text-align: center; color: #94A3B8; font-size: 13px; padding: 32px 0;">
        加载中...
      </div>
    </div>
  </div>
</template>
