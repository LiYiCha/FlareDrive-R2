<script setup>
import { nextTick } from "vue";
import { dialogState, resolveDialog } from "../lib/dialog.js";

function ok() {
  resolveDialog(dialogState.kind === "prompt" ? dialogState.value : true);
}

function cancel() {
  resolveDialog(dialogState.kind === "prompt" ? null : false);
}

function onMaskEnter() {
  if (dialogState.kind !== "prompt") cancel();
}

function onKeydown(e) {
  if (!dialogState.visible) return;
  if (e.key === "Escape") cancel();
  if (e.key === "Enter" && dialogState.kind !== "confirm") ok();
}

function focusInput() {
  if (dialogState.kind === "prompt") {
    nextTick(() => {
      const el = document.querySelector(".dialog-host-input");
      if (el) {
        el.focus();
        el.select && el.select();
      }
    });
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="dialogState.visible" class="dh-mask" @click.self="onMaskEnter" @keydown="onKeydown">
      <div class="dh-card" role="dialog" aria-modal="true">
        <h3 class="dh-title">{{ dialogState.title }}</h3>
        <p v-if="dialogState.message" class="dh-message">{{ dialogState.message }}</p>
        <input
          v-if="dialogState.kind === 'prompt'"
          v-model="dialogState.value"
          class="dialog-host-input dh-input"
          type="text"
          :placeholder="dialogState.placeholder"
          @keydown.enter.prevent="ok"
          @vue:mounted="focusInput"
        />
        <div class="dh-actions">
          <button v-if="dialogState.kind !== 'alert'" class="dh-btn" @click="cancel">
            {{ dialogState.cancelText }}
          </button>
          <button
            class="dh-btn dh-btn-primary"
            :class="{ 'dh-btn-danger': dialogState.danger }"
            @click="ok"
          >
            {{ dialogState.okText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dh-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.dh-card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.35);
}

.dh-title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.dh-message {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
}

.dh-input {
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 18px;
  outline: none;
  box-sizing: border-box;
}

.dh-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.dh-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dh-btn {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f1f5f9;
  color: #334155;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.dh-btn-primary {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}

.dh-btn-danger {
  background: #ef4444;
  border-color: #ef4444;
}
</style>
