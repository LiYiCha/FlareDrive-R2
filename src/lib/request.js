import axios from "axios";
import { alertDialog } from "./dialog.js";

const http = axios.create();

http.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("flaredrive_token") ||
    sessionStorage.getItem("flaredrive_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ---- 全局 401/403 无权限处理 ----
let unauthorizedHandling = false;
function isLoginRequest(url = "") {
  return String(url).includes("/api/login");
}

/** 从响应体提取后端给出的具体原因（后端写接口返回纯文本，登录等接口返回 JSON {error}） */
function readServerMessage(response) {
  const data = response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object" && data.error) return String(data.error);
  return "";
}

/**
 * 统一无权限处理：只弹出对话框告知"无权限"这一事实及其具体原因。
 * 严禁出现任何登录引导、跳转或建议文案。
 * options.silent = true 时（页面加载时的被动请求，如文件列表/搜索）只同步登录状态，不弹窗打扰用户。
 * axios 拦截器自动调用；原生 fetch 代码收到 401/403 时也应手动调用。
 */
export async function handleUnauthorized(status, url = "", response, options = {}) {
  if ((status !== 401 && status !== 403) || isLoginRequest(url) || unauthorizedHandling) {
    return;
  }

  // 仅 401（未认证）时清理失效 token 并同步应用登录状态；
  // 403（已认证但权限不足）不动登录态，只提示无权限
  if (status === 401) {
    try {
      localStorage.removeItem("flaredrive_token");
      sessionStorage.removeItem("flaredrive_token");
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent("flaredrive:unauthorized", { detail: { status } }));
    } catch (e) {}
  }

  // 被动请求静默处理：未登录浏览网站时不弹"无权限"弹窗
  if (options.silent) return;

  unauthorizedHandling = true;
  const reason = readServerMessage(response) || "没有操作权限";
  await alertDialog(reason, "无权限");
  unauthorizedHandling = false;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    if (status === 401 || status === 403) {
      handleUnauthorized(status, url, error.response);
    }
    return Promise.reject(error);
  }
);

function isSameOrigin(input) {
  try {
    const urlStr = typeof input === "string" ? input : input.url;
    return new URL(urlStr, window.location.origin).origin === window.location.origin;
  } catch (e) {
    return (
      typeof input === "string" &&
      !input.startsWith("http:") &&
      !input.startsWith("https:") &&
      !input.startsWith("//")
    );
  }
}

if (!window.__flaredriveFetchPatched) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const token =
      localStorage.getItem("flaredrive_token") ||
      sessionStorage.getItem("flaredrive_token");
    if (token && isSameOrigin(input)) {
      init.headers = new Headers(init.headers);
      init.headers.set("Authorization", `Bearer ${token}`);
    }
    return originalFetch(input, init);
  };
  window.__flaredriveFetchPatched = true;
}

export default http;
