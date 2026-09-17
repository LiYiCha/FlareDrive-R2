import { reactive, toRefs } from "vue";
import http from "../../lib/request.js";
import { alertDialog, confirmDialog } from "../../lib/dialog.js";

const state = reactive({
  storageStats: {
    usedBytes: 0,
    quotaBytes: 10 * 1024 * 1024 * 1024,
    fileCount: 0,
    folderCount: 0,
    lastUpdated: null,
    loading: true,
    kvStats: null,
  },
  storageLoading: false,
  storageError: null, // 最近一次 fetchStorageStats 失败时的错误信息
  _hasAlertedError: false, // 防重复弹窗：同一次失败周期只弹一次
});

export function fetchStorageStats(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem("flaredrive_storage_stats");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && now - (parsed._cacheTime || 0) < 300000) {
          Object.assign(state.storageStats, parsed);
          return;
        }
      }
    } catch (e) {}
  }
  state.storageStats.loading = true;
  state.storageError = null;
  state._hasAlertedError = false; // 开始新周期，重置
  http
    .get(forceRefresh ? `/api/storage/usage?_t=${now}` : "/api/storage/usage", {
      cache: forceRefresh ? "no-store" : "default",
    })
    .then((res) => {
      if (res.data) {
        const data = { ...res.data, loading: false, _cacheTime: Date.now() };
        Object.assign(state.storageStats, data);
        state.storageError = null;
        try {
          sessionStorage.setItem("flaredrive_storage_stats", JSON.stringify(data));
        } catch (e) {}
      }
    })
    .catch((err) => {
      const msg = err.response?.data?.error || err.response?.statusText || err.message;
      console.error("获取存储统计失败:", err);
      state.storageStats.loading = false;
      state.storageError = msg;
      if (!state._hasAlertedError) {
        state._hasAlertedError = true;
        alertDialog("获取存储统计失败：" + msg);
      }
    });
}

async function recalculateStorage() {
  const ok = await confirmDialog(
    "确定要全量扫描并校准存储大小吗？文件较多时可能需要几十秒。",
    { title: "全桶校准", okText: "开始校准" }
  );
  if (!ok) return;
  state.storageLoading = true;
  try {
    const res = await http.post("/api/storage/recalculate");
    if (res.data.success) {
      const data = { ...res.data.stats, loading: false, _cacheTime: Date.now() };
      Object.assign(state.storageStats, data);
      try {
        sessionStorage.setItem("flaredrive_storage_stats", JSON.stringify(data));
      } catch (e) {}
      await alertDialog("容量校准成功！");
    }
  } catch (err) {
    await alertDialog("校准容量失败：" + (err.response?.data?.error || err.message));
  } finally {
    state.storageLoading = false;
  }
}

export function useStorage() {
  return { ...toRefs(state), fetchStorageStats, recalculateStorage };
}
