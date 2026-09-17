import { reactive } from "vue";
import http from "../../lib/request.js";
import { alertDialog } from "../../lib/dialog.js";

const officialR2 = reactive({
  loading: false,
  loaded: false,
  data: null,
});

async function fetchOfficialR2Metrics() {
  officialR2.loading = true;
  try {
    const res = await http.get("/api/admin/metrics/r2?days=30");
    officialR2.loaded = true;
    officialR2.data = res.data;
    if (res.data?.error) {
      await alertDialog("查询失败: " + res.data.error);
    }
  } catch (err) {
    await alertDialog(
      "拉取官方指标失败: " + (err.response?.data?.error || err.message)
    );
  } finally {
    officialR2.loading = false;
  }
}

export function useOfficialR2() {
  // 直接返回 reactive 对象，不要 toRefs 拆成一堆 Ref
  // 调用方用法：const { officialR2, fetchOfficialR2Metrics } = useOfficialR2();
  return { officialR2, fetchOfficialR2Metrics };
}
