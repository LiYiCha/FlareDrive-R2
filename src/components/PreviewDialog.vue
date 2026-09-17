<template>
  <teleport to="body">
    <div v-if="show" class="preview-mask" @click.self="close">
      <div class="preview-dialog" @click.stop>
        <div class="preview-header">
          <span class="preview-title" :title="displayTitle">{{ displayTitle }}</span>
          <button class="preview-close" @click="close" aria-label="关闭">×</button>
        </div>

        <div class="preview-body">
          <!-- loading overlay (自己写的，不依赖任何 directive) -->
          <div v-if="loading" class="preview-loading">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>

          <!-- 图片 -->
          <img
            v-else-if="previewType === 'image'"
            :src="previewUrl"
            class="preview-image"
            alt="preview"
            @error="onError"
          />

          <!-- 视频 -->
          <video
            v-else-if="previewType === 'video'"
            :src="previewUrl"
            class="preview-media"
            controls
            preload="metadata"
          ></video>

          <!-- 音频 -->
          <audio
            v-else-if="previewType === 'audio'"
            :src="previewUrl"
            class="preview-audio"
            controls
          ></audio>

          <!-- PDF -->
          <iframe
            v-else-if="previewType === 'pdf'"
            :src="previewUrl"
            class="preview-pdf"
          ></iframe>

          <!-- 文本/代码 -->
          <pre
            v-else-if="previewType === 'text'"
            class="preview-text"
          ><code>{{ textContent || '加载中...' }}</code></pre>

          <!-- 不支持预览 -->
          <div v-else class="preview-unsupported">
            <div class="unsupported-icon">📄</div>
            <p>此文件类型不支持在线预览</p>
            <p class="unsupported-hint">请使用下载按钮查看</p>
          </div>

          <!-- 错误 -->
          <div v-if="error" class="preview-error">
            ⚠️ {{ error }}
          </div>
        </div>

        <div class="preview-footer">
          <button class="btn-secondary" @click="copyLink">复制链接</button>
          <a
            class="btn-primary"
            :href="downloadUrl"
            :download="displayTitle"
            target="_blank"
            rel="noopener"
          >下载</a>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'];
const VIDEO_EXT = ['mp4', 'webm', 'ogg'];
const AUDIO_EXT = ['mp3', 'wav', 'flac', 'm4a', 'aac'];
const TEXT_EXT = [
  'txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx',
  'html', 'htm', 'css', 'scss', 'less',
  'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp',
  'csv', 'log', 'xml', 'yaml', 'yml', 'ini', 'conf',
  'sh', 'bat', 'sql', 'env', 'gitignore',
];

export default {
  name: 'PreviewDialog',
  props: {
    show: { type: Boolean, default: false },
    fileKey: { type: String, default: '' },
    token: { type: String, default: '' },
  },
  emits: ['update:show', 'copy-success', 'copy-failed'],
  data() {
    return {
      loading: false,
      error: null,
      textContent: '',
    };
  },
  computed: {
    displayTitle() {
      return this.fileKey.split('/').pop() || '文件';
    },
    ext() {
      const name = this.displayTitle.toLowerCase();
      const idx = name.lastIndexOf('.');
      return idx >= 0 ? name.slice(idx + 1) : '';
    },
    previewType() {
      if (IMAGE_EXT.includes(this.ext)) return 'image';
      if (VIDEO_EXT.includes(this.ext)) return 'video';
      if (AUDIO_EXT.includes(this.ext)) return 'audio';
      if (this.ext === 'pdf') return 'pdf';
      if (TEXT_EXT.includes(this.ext)) return 'text';
      return 'other';
    },
    previewUrl() {
      const base = `/raw/${this.fileKey}`;
      return this.token ? `${base}?token=${encodeURIComponent(this.token)}` : base;
    },
    downloadUrl() {
      return this.previewUrl;
    },
  },
  watch: {
    show(val) {
      if (val && this.previewType === 'text') {
        this.fetchText();
      }
      if (!val) {
        this.textContent = '';
        this.error = null;
      }
    },
  },
  methods: {
    close() {
      this.$emit('update:show', false);
    },
    async fetchText() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(this.previewUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.textContent = await res.text();
      } catch (e) {
        this.error = '加载文件失败: ' + e.message;
      } finally {
        this.loading = false;
      }
    },
    onError() {
      this.error = '加载预览失败，文件可能不存在或无权访问';
    },
    async copyLink() {
      try {
        const fullUrl = window.location.origin + this.previewUrl;
        await navigator.clipboard.writeText(fullUrl);
        // 往上冒泡给父组件处理 toast
        this.$emit('copy-success', fullUrl);
      } catch {
        this.$emit('copy-failed');
      }
    },
  },
};
</script>

<style scoped>
.preview-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 24px;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-dialog {
  background: #fff;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.preview-title {
  font-weight: 600;
  font-size: 15px;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12px;
}

.preview-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 22px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-close:hover { background: #e5e7eb; color: #1f2937; }

.preview-body {
  flex: 1;
  overflow: auto;
  background: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  position: relative;
}

/* 自己写的 loading overlay */
.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9ca3af;
  font-size: 14px;
  background: rgba(17, 24, 39, 0.8);
  z-index: 5;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #374151;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.preview-image {
  max-width: 100%;
  max-height: calc(90vh - 140px);
  object-fit: contain;
}

.preview-media {
  max-width: 100%;
  max-height: calc(90vh - 140px);
}

.preview-audio {
  width: 80%;
  max-width: 500px;
}

.preview-pdf {
  width: 100%;
  height: calc(90vh - 140px);
  border: none;
  background: #fff;
}

.preview-text {
  width: 100%;
  max-height: calc(90vh - 140px);
  margin: 0;
  padding: 16px;
  background: #1f2937;
  color: #e5e7eb;
  font-family: 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-unsupported {
  text-align: center;
  color: #9ca3af;
  padding: 40px;
}
.unsupported-icon { font-size: 48px; margin-bottom: 12px; }
.unsupported-hint { font-size: 12px; margin-top: 4px; }

.preview-error {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #fef2f2;
  color: #dc2626;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn-primary, .btn-secondary {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  display: inline-block;
}
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #e5e7eb; color: #374151; }
.btn-secondary:hover { background: #d1d5db; }
</style>
