<template>
  <teleport to="body">
    <div v-if="show" class="share-mask" @click.self="close">
      <div class="share-dialog" @click.stop>
        <div class="share-header">
          <span class="share-title">
            {{ isFolder ? '分享文件夹' : '分享文件' }}：{{ displayName }}
          </span>
          <button class="share-close" @click="close" aria-label="关闭">×</button>
        </div>

        <div class="share-body">
          <!-- 新建分享 -->
          <div class="share-section">
            <h4 class="section-title">创建分享链接</h4>
            <div class="options-row">
              <label class="option-label">
                有效期
                <select v-model="options.expiresInDays" :disabled="creating" class="option-select">
                  <option :value="1">1 天</option>
                  <option :value="7">7 天</option>
                  <option :value="30">30 天</option>
                  <option :value="0">永久有效</option>
                </select>
              </label>
              <label class="option-label option-grow">
                提取码（可选）
                <input
                  v-model.trim="options.code"
                  type="text"
                  class="option-input"
                  placeholder="留空则无需提取码"
                  maxlength="32"
                  :disabled="creating"
                />
              </label>
            </div>
            <p v-if="createError" class="share-error">⚠️ {{ createError }}</p>

            <!-- 生成结果 -->
            <div v-if="result" class="share-result">
              <input class="result-url" type="text" readonly :value="result.url" @focus="$event.target.select()" />
              <button class="btn-copy" @click="copyResult">复制链接</button>
            </div>
            <p v-if="result" class="result-meta">
              {{ result.expiresAt === 0 ? '永久有效' : '有效期至 ' + formatDate(result.expiresAt) }}
              {{ result.hasCode ? '· 已启用提取码' : '' }}
            </p>

            <button class="btn-create" :disabled="creating" @click="create">
              {{ creating ? '生成中...' : '生成分享链接' }}
            </button>
          </div>

          <!-- 该路径的已有分享 -->
          <div class="share-section">
            <h4 class="section-title">
              此{{ isFolder ? '文件夹' : '文件' }}的已有分享
              <button class="btn-refresh" :disabled="loadingShares" @click="loadShares">
                {{ loadingShares ? '刷新中...' : '刷新' }}
              </button>
            </h4>
            <p v-if="sharesError" class="share-error">⚠️ {{ sharesError }}</p>
            <div v-if="loadingShares" class="share-loading"><div class="spinner"></div></div>
            <p v-else-if="!filteredShares.length" class="share-empty">暂无分享记录</p>
            <ul v-else class="share-list">
              <li v-for="s in filteredShares" :key="s.token" class="share-item">
                <div class="share-item-main">
                  <span class="share-item-name" :title="s.path">
                    {{ s.type === 'folder' ? '📁' : '📄' }} {{ s.name }}
                  </span>
                  <span class="share-item-meta">
                    <em :class="s.expired ? 'expired' : 'active'">{{ s.expired ? '已过期' : '有效' }}</em>
                    <template v-if="s.hasCode"> · 提取码</template>
                    · 下载 {{ s.downloads }} 次
                    · {{ s.expiresAt === 0 ? '永久' : formatDate(s.expiresAt) }}
                  </span>
                </div>
                <div class="share-item-actions">
                  <button class="btn-sm" :disabled="revokingToken === s.token" @click="copyShare(s)">复制</button>
                  <button class="btn-sm danger" :disabled="revokingToken === s.token" @click="revoke(s)">
                    {{ revokingToken === s.token ? '撤销中...' : '撤销' }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { createShare, listShares, deleteShare, buildShareUrl } from "../lib/share.js";
import { confirmDialog } from "../lib/dialog.js";
import { toastSuccess, toastError } from "../lib/toast.js";

export default {
  name: "ShareDialog",
  props: {
    show: { type: Boolean, default: false },
    // 文件 key 或以 / 结尾的文件夹路径
    sharePath: { type: String, default: "" },
  },
  emits: ["update:show"],
  data() {
    return {
      options: { expiresInDays: 7, code: "" },
      creating: false,
      createError: null,
      result: null,
      shares: [],
      loadingShares: false,
      sharesError: null,
      revokingToken: null,
    };
  },
  computed: {
    isFolder() {
      return this.sharePath.endsWith("/");
    },
    displayName() {
      return this.sharePath.split("/").filter(Boolean).pop() || this.sharePath || "-";
    },
    filteredShares() {
      return this.shares.filter((s) => s.path === this.sharePath);
    },
  },
  watch: {
    show(val) {
      if (val) {
        // 每次打开重置状态
        this.options = { expiresInDays: 7, code: "" };
        this.result = null;
        this.createError = null;
        this.sharesError = null;
        this.loadShares();
      }
    },
  },
  methods: {
    close() {
      this.$emit("update:show", false);
    },
    formatDate(ts) {
      return new Date(ts).toLocaleString("zh-CN", { hour12: false });
    },
    async loadShares() {
      this.loadingShares = true;
      this.sharesError = null;
      try {
        const res = await listShares();
        this.shares = res.data?.value || [];
      } catch (err) {
        const status = err.response?.status;
        this.sharesError =
          status === 401
            ? "没有操作权限（分享管理仅限管理员）"
            : err.response?.data?.error || err.message;
        this.shares = [];
      } finally {
        this.loadingShares = false;
      }
    },
    async create() {
      if (this.creating) return; // 防重复点击
      this.creating = true;
      this.createError = null;
      this.result = null;
      try {
        const res = await createShare({
          path: this.sharePath,
          expiresInDays: this.options.expiresInDays,
          code: this.options.code,
        });
        this.result = {
          url: res.data?.url || buildShareUrl(res.data?.token),
          expiresAt: res.data?.expiresAt ?? 0,
          hasCode: !!res.data?.hasCode,
        };
        this.loadShares();
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
          this.createError = "没有读取权限，无法分享该内容";
        } else {
          this.createError = err.response?.data?.error || err.message || "创建失败，请重试";
        }
      } finally {
        this.creating = false;
      }
    },
    async copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // 非安全上下文（http://）下 clipboard API 不可用，降级 execCommand
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          return ok;
        } catch (e2) {
          return false;
        }
      }
    },
    async copyResult() {
      const ok = await this.copyText(this.result.url);
      if (ok) toastSuccess("分享链接已复制");
      else toastError("复制失败，请手动选择链接复制");
    },
    async copyShare(share) {
      const ok = await this.copyText(buildShareUrl(share.token));
      if (ok) toastSuccess("分享链接已复制");
      else toastError("复制失败，请手动复制");
    },
    async revoke(share) {
      if (this.revokingToken) return; // 防重复点击
      const ok = await confirmDialog(
        `撤销后链接立即失效，确定撤销「${share.name}」的分享吗？`,
        { title: "撤销分享", danger: true, okText: "撤销" }
      );
      if (!ok) return;
      this.revokingToken = share.token;
      try {
        await deleteShare(share.token);
        toastSuccess("分享已撤销");
        this.loadShares();
      } catch (err) {
        const status = err.response?.status;
        toastError(
          status === 401
            ? "没有操作权限，撤销失败"
            : "撤销失败：" + (err.response?.data?.error || err.message)
        );
      } finally {
        this.revokingToken = null;
      }
    },
  },
};
</script>

<style scoped>
.share-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.share-dialog {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}
.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #F1F5F9;
}
.share-title {
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.share-close {
  border: none;
  background: none;
  font-size: 22px;
  color: #94A3B8;
  cursor: pointer;
  line-height: 1;
  padding: 2px 6px;
}
.share-close:hover { color: #475569; }
.share-body {
  padding: 16px 18px;
  overflow-y: auto;
}
.share-section + .share-section { margin-top: 20px; }
.section-title {
  font-size: 13px;
  color: #475569;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.options-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.option-label {
  font-size: 12px;
  color: #64748B;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.option-grow { flex: 1; min-width: 160px; }
.option-select,
.option-input {
  padding: 8px 10px;
  border: 1px solid #CBD5E1;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
  color: #1E293B;
}
.option-select:focus,
.option-input:focus { border-color: #3B82F6; }
.btn-create {
  margin-top: 12px;
  width: 100%;
  padding: 9px 0;
  border: none;
  border-radius: 8px;
  background: #2563EB;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.btn-create:hover:not(:disabled) { background: #1D4ED8; }
.btn-create:disabled { opacity: 0.6; cursor: not-allowed; }
.share-result {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
.result-url {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #BFDBFE;
  background: #EFF6FF;
  border-radius: 8px;
  font-size: 12px;
  color: #1D4ED8;
  outline: none;
  min-width: 0;
}
.btn-copy {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #10B981;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.btn-copy:hover { background: #059669; }
.result-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #64748B;
}
.share-error {
  margin-top: 8px;
  font-size: 12px;
  color: #DC2626;
}
.share-empty {
  font-size: 13px;
  color: #94A3B8;
  text-align: center;
  padding: 14px 0;
}
.share-loading {
  display: flex;
  justify-content: center;
  padding: 14px 0;
}
.spinner {
  width: 22px;
  height: 22px;
  border: 3px solid #E2E8F0;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: share-spin 0.8s linear infinite;
}
@keyframes share-spin {
  to { transform: rotate(360deg); }
}
.share-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.share-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid #F1F5F9;
}
.share-item:last-child { border-bottom: none; }
.share-item-main { min-width: 0; }
.share-item-name {
  display: block;
  font-size: 13px;
  color: #1E293B;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.share-item-meta {
  display: block;
  font-size: 12px;
  color: #94A3B8;
  margin-top: 2px;
}
.share-item-meta em { font-style: normal; }
.share-item-meta .active { color: #10B981; }
.share-item-meta .expired { color: #F59E0B; }
.share-item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  cursor: pointer;
}
.btn-sm:hover:not(:disabled) { background: #F8FAFC; }
.btn-sm.danger {
  color: #DC2626;
  border-color: #FECACA;
}
.btn-sm.danger:hover:not(:disabled) { background: #FEF2F2; }
.btn-sm:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-refresh {
  border: none;
  background: none;
  color: #3B82F6;
  font-size: 12px;
  cursor: pointer;
}
.btn-refresh:disabled { color: #94A3B8; cursor: not-allowed; }
</style>
