import { reactive } from "vue";
import http from "../../lib/request.js";
import { alertDialog } from "../../lib/dialog.js";
import { fetchStorageStats } from "./useStorage.js";
import { fetchAppUpdates } from "./useAppUpdates.js";

const session = reactive({
  isLoggedIn: false,
  authLoading: false,
  loginUsername: "",
  loginPassword: "",
  rememberMe: true,
  showForgotTips: false,
});

async function handleLogin() {
  if (!session.loginUsername || !session.loginPassword) {
    await alertDialog("账号和密码不能为空");
    return;
  }
  session.authLoading = true;
  try {
    const res = await http.post("/api/login", {
      username: session.loginUsername,
      password: session.loginPassword,
    });
    const token = res.data.token;
    if (session.rememberMe) {
      localStorage.setItem("flaredrive_token", token);
    } else {
      sessionStorage.setItem("flaredrive_token", token);
    }
    session.isLoggedIn = true;
    fetchStorageStats();
    fetchAppUpdates();
    // 若从主站未授权跳转而来（URL 带 redirect），登录后回跳来源页
    try {
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      if (redirect && redirect.startsWith("/") && !redirect.startsWith("/admin")) {
        setTimeout(() => { window.location.href = redirect; }, 500);
      }
    } catch (e) {}
  } catch (err) {
    await alertDialog("登录失败：" + (err.response?.data?.error || err.message));
  } finally {
    session.authLoading = false;
  }
}

function logout() {
  localStorage.removeItem("flaredrive_token");
  sessionStorage.removeItem("flaredrive_token");
  session.isLoggedIn = false;
}

/** 页面初始化时恢复登录态 */
function restoreSession() {
  const token = localStorage.getItem("flaredrive_token") || sessionStorage.getItem("flaredrive_token");
  if (token) {
    session.isLoggedIn = true;
    fetchStorageStats();
    fetchAppUpdates();
  }
}

// 任意请求遇到 401（登录接口除外）自动退出登录态
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.config &&
      !error.config.url.endsWith("/api/login")
    ) {
      session.isLoggedIn = false;
    }
    return Promise.reject(error);
  }
);

export function useAdminSession() {
  return { session, handleLogin, logout, restoreSession };
}
