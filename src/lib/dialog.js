import { reactive } from "vue";

/**
 * 全局 Promise 化弹窗，替代浏览器原生 alert/confirm/prompt。
 * 由 <DialogHost /> 渲染，任意模块直接调用即可。
 */
export const dialogState = reactive({
  visible: false,
  kind: "alert", // alert | confirm | prompt
  title: "",
  message: "",
  value: "",
  placeholder: "",
  danger: false,
  okText: "确定",
  cancelText: "取消",
  _resolve: null,
});

function open(options) {
  Object.assign(dialogState, {
    visible: true,
    kind: "alert",
    title: "提示",
    message: "",
    value: "",
    placeholder: "",
    danger: false,
    okText: "确定",
    cancelText: "取消",
    ...options,
  });
  return new Promise((resolve) => {
    dialogState._resolve = resolve;
  });
}

export function alertDialog(message, title = "提示") {
  return open({ kind: "alert", message: String(message ?? ""), title });
}

export function confirmDialog(message, options = {}) {
  return open({
    kind: "confirm",
    message: String(message ?? ""),
    title: options.title || "请确认",
    danger: !!options.danger,
    okText: options.okText || (options.danger ? "删除" : "确定"),
    cancelText: options.cancelText || "取消",
  });
}

export function promptDialog(options = {}) {
  return open({
    kind: "prompt",
    title: options.title || "请输入",
    message: options.label || options.message || "",
    value: options.value ?? "",
    placeholder: options.placeholder || "",
    okText: options.okText || "确定",
    cancelText: options.cancelText || "取消",
  });
}

export function resolveDialog(result) {
  dialogState.visible = false;
  const resolve = dialogState._resolve;
  dialogState._resolve = null;
  if (resolve) resolve(result);
}
