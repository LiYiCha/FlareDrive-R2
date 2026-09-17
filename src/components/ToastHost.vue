<script setup>
import { toastState, dismiss } from "../lib/toast.js";

const ICONS = {
  success: "✓",
  error: "✕",
  warn: "!",
  info: "i",
};
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="t-host">
    <div
      v-for="t in toastState.items"
      :key="t.id"
      class="t-item"
      :class="`t-${t.kind}`"
      @click="dismiss(t.id)"
    >
      <span class="t-icon">{{ ICONS[t.kind] }}</span>
      <span class="t-msg">{{ t.message }}</span>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.t-host {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10001; /* 比 DialogHost 高一点 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.t-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  min-width: 200px;
  max-width: 420px;
  border-radius: 10px;
  box-shadow: 0 8px 24px -8px rgba(15, 23, 42, 0.35);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: #fff;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.t-item:active {
  transform: scale(0.97);
}

.t-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.t-msg {
  white-space: pre-wrap;
  word-break: break-word;
}

/* 主题色 */
.t-success {
  background: #16a34a;
}
.t-success .t-icon {
  background: rgba(255, 255, 255, 0.25);
}

.t-error {
  background: #ef4444;
}
.t-error .t-icon {
  background: rgba(255, 255, 255, 0.25);
}

.t-warn {
  background: #f59e0b;
}
.t-warn .t-icon {
  background: rgba(255, 255, 255, 0.3);
}

.t-info {
  background: #3b82f6;
}
.t-info .t-icon {
  background: rgba(255, 255, 255, 0.25);
}

/* 动画 */
.toast-enter-active {
  animation: toast-in 0.22s ease both;
}
.toast-leave-active {
  animation: toast-out 0.18s ease both;
}
.toast-move {
  transition: transform 0.18s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
}
</style>
