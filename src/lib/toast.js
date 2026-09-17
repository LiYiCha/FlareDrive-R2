import { reactive } from "vue";

let _id = 0;

export const toastState = reactive({
  items: [], // { id, kind, message, duration }
});

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 2500;

function push(kind, message, duration = DEFAULT_DURATION) {
  // 超出上限时移除最早的
  if (toastState.items.length >= MAX_TOASTS) {
    toastState.items.shift();
  }
  const id = ++_id;
  const item = { id, kind, message, duration };
  toastState.items.push(item);
  setTimeout(() => dismiss(id), duration);
  return id;
}

export function dismiss(id) {
  const idx = toastState.items.findIndex((t) => t.id === id);
  if (idx >= 0) toastState.items.splice(idx, 1);
}

export function toastSuccess(message, duration) {
  return push("success", message, duration);
}
export function toastError(message, duration) {
  return push("error", message, duration || 3500);
}
export function toastInfo(message, duration) {
  return push("info", message, duration);
}
export function toastWarn(message, duration) {
  return push("warn", message, duration || 3000);
}
