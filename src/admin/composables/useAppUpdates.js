import { reactive, toRefs } from "vue";
import http from "../../lib/request.js";
import { alertDialog, confirmDialog } from "../../lib/dialog.js";
import { parsePackageMeta } from "../lib/apkParser.js";
import { computeFileMd5 } from "../lib/hash.js";

const state = reactive({
  appsUpdates: {},
  editingApp: null,
  isNewApp: false,
  savingUpdate: false,
  changelogTab: "edit",
});

export function fetchAppUpdates() {
  http
    .get(`/api/admin/update/publish?_t=${Date.now()}`)
    .then((res) => {
      state.appsUpdates = res.data.apps || {};
    })
    .catch((err) => {
      console.error("获取 App 更新配置失败:", err);
      state.appsUpdates = {};
    });
}

function onAppIdInput() {
  if (state.isNewApp && !state.editingApp._dirCustomized) {
    const id = (state.editingApp.appId || "").trim();
    state.editingApp.apkUploadDir = id ? `update/apk/${id}` : "update/apk";
  }
}

function onApkDirInput() {
  if (state.editingApp) state.editingApp._dirCustomized = true;
}

function setAppSubDirDefault() {
  if (state.editingApp && state.editingApp.appId) {
    state.editingApp.apkUploadDir = `update/apk/${state.editingApp.appId.trim()}`;
    state.editingApp._dirCustomized = true;
  }
}

function getEffectiveAppDir(app) {
  if (!app) return "update/apk";
  let dir = (app.apkUploadDir || "").trim().replace(/^\/+|\/+$/g, "");
  if (!dir) {
    dir = app.appId ? `update/apk/${app.appId.trim()}` : "update/apk";
  }
  return dir;
}

function getPackageUploadDir(pkg) {
  const baseDir = getEffectiveAppDir(state.editingApp);
  if (pkg && pkg.subDir && pkg.subDir.trim()) {
    const sub = pkg.subDir.trim().replace(/^\/+|\/+$/g, "");
    return `${baseDir}/${sub}`;
  }
  return baseDir;
}

function createAppUpdate() {
  state.changelogTab = "edit";
  state.editingApp = {
    appId: "",
    appName: "",
    // 版本号改为选填：上传 APK/模块后自动提取填充，也可手动覆盖
    latestVersionCode: "",
    latestVersionName: "",
    updateLog: "",
    isForceUpdate: false,
    cdnCacheEnabled: false,
    cdnCacheTtl: 0,
    apkUploadDir: "update/apk",
    _dirCustomized: false,
    _verAuto: false,
    packages: [],
  };
  state.isNewApp = true;
}

function editAppUpdate(id, app) {
  state.changelogTab = "edit";
  state.editingApp = {
    appId: id,
    ...JSON.parse(JSON.stringify(app)),
    cdnCacheEnabled: !!app.cdnCacheEnabled,
    cdnCacheTtl: typeof app.cdnCacheTtl !== "undefined" ? app.cdnCacheTtl : 0,
    apkUploadDir:
      app.apkUploadDir !== undefined && app.apkUploadDir !== ""
        ? app.apkUploadDir
        : `update/apk/${id}`,
    _dirCustomized: true,
  };
  state.isNewApp = false;
}

function renderMarkdown(text) {
  if (!text || !text.trim()) {
    return '<p style="color:#94A3B8;font-style:italic;margin:6px 0;">暂无更新日志内容，请在“编辑”选项卡中填写...</p>';
  }
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^### (.*$)/gim, '<h5 style="margin:8px 0 4px;font-size:13px;font-weight:700;color:#0F172A;">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 style="margin:10px 0 4px;font-size:14px;font-weight:700;color:#0F172A;">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 style="margin:12px 0 6px;font-size:15px;font-weight:700;color:#0F172A;">$1</h3>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#0F172A;">$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/gim, '<code style="background:#F1F5F9;color:#E11D48;padding:2px 6px;border-radius:4px;font-size:11px;font-family:monospace;">$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener" style="color:#2563EB;text-decoration:underline;">$1</a>');

  const lines = html.split("\n");
  let inList = false;
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        result.push('<ul style="margin:4px 0;padding-left:20px;line-height:1.6;color:#334155;">');
        inList = true;
      }
      result.push(`<li style="margin-bottom:3px;">${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (trimmed.length > 0) {
        result.push(`<p style="margin:4px 0;line-height:1.6;color:#334155;">${line}</p>`);
      }
    }
  }
  if (inList) result.push("</ul>");
  return result.join("");
}

function insertMdPrefix(prefix) {
  if (!state.editingApp) return;
  const cur = state.editingApp.updateLog || "";
  state.editingApp.updateLog = cur && !cur.endsWith("\n") ? cur + "\n" + prefix : cur + prefix;
}

function insertMdWrap(before, after) {
  if (!state.editingApp) return;
  state.editingApp.updateLog = (state.editingApp.updateLog || "") + before + "内容" + after;
}

async function deleteAppUpdate(id) {
  const ok = await confirmDialog(`确定要彻底删除该应用 (${id}) 的更新配置吗？`, {
    title: "删除应用",
    danger: true,
    okText: "删除",
  });
  if (!ok) return;
  try {
    await http.post("/api/admin/update/publish", { appId: id, deleteAction: true });
    await alertDialog("删除成功！");
    fetchAppUpdates();
  } catch (err) {
    await alertDialog("删除失败：" + (err.response?.data?.error || err.message));
  }
}

function addPackageItem() {
  state.editingApp.packages.push({
    packageId: "",
    packageName: "",
    subDir: "",
    versionCode: state.editingApp.latestVersionCode,
    versionName: state.editingApp.latestVersionName,
    description: "",
    downloadUrl: "",
    apkSize: 0,
    apkMd5: "",
  });
}

function removePackageItem(idx) {
  state.editingApp.packages.splice(idx, 1);
}

function triggerApkSelect(idx) {
  const input = document.getElementById("apkFileInput_" + idx);
  if (input) input.click();
}

function onApkFileDrop(ev, pkg) {
  pkg._dragOver = false;
  let files = [];
  if (ev.dataTransfer.items) {
    files = [...ev.dataTransfer.items]
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
  }
  if (!files.length && ev.dataTransfer.files) {
    files = Array.from(ev.dataTransfer.files);
  }
  if (files.length > 0) uploadApkForPackage(files[0], pkg);
}

function onApkFileSelected(ev, pkg) {
  const files = ev.target.files;
  if (files && files.length > 0) {
    uploadApkForPackage(files[0], pkg);
    ev.target.value = "";
  }
}

// 将 APK/模块包内提取的元数据回填到表单（版本号免手填的核心逻辑）
function applyPackageMeta(pkg, meta) {
  if (meta.versionCode !== null && meta.versionCode !== undefined) {
    pkg.versionCode = meta.versionCode;
    pkg._verAuto = true;
  }
  if (meta.versionName) {
    pkg.versionName = meta.versionName;
  }
  // manifest 内的真实包名比文件名更准确，仅在用户未手动编辑过 packageId 时覆盖
  if (meta.packageName && (!pkg.packageId || pkg._idAuto)) {
    pkg.packageId = meta.packageName;
    pkg._idAuto = true;
  }
  // 应用级"最新版本"同步：为空或此前由上传自动填充时才覆盖，手动编辑过则尊重手填值
  const app = state.editingApp;
  if (app && meta.versionCode !== null && meta.versionCode !== undefined) {
    if (!app.latestVersionCode || app._verAuto) {
      app.latestVersionCode = meta.versionCode;
      if (meta.versionName && (!app.latestVersionName || app._verAuto)) {
        app.latestVersionName = meta.versionName;
      }
      app._verAuto = true;
    }
  }
}

async function uploadApkForPackage(file, pkg) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".apk")) {
    const ok = await confirmDialog(`文件 "${file.name}" 不是 .apk 格式，确定要作为 Android 安装包上传吗？`, {
      title: "格式确认",
      okText: "继续上传",
    });
    if (!ok) return;
  }

  // 快照：上传失败时还原本次自动填充/变更的文件信息，
  // 避免 APK 被拦截未上传后，表单里残留大小、MD5、名称等"看起来已成功"的数据
  const prev = {
    apkSize: pkg.apkSize,
    apkMd5: pkg.apkMd5,
    packageId: pkg.packageId,
    packageName: pkg.packageName,
    versionCode: pkg.versionCode,
    versionName: pkg.versionName,
    _idAuto: pkg._idAuto,
    _nameAuto: pkg._nameAuto,
    _verAuto: pkg._verAuto,
  };
  const seq = (pkg._uploadSeq = (pkg._uploadSeq || 0) + 1);

  pkg._uploading = true;
  pkg._uploadFileName = file.name;
  pkg._uploadProgress = 0;
  pkg.apkSize = file.size;
  // 重传时先清除上一个 APK 的残留校验值
  pkg.apkMd5 = "";
  pkg.downloadUrl = "";

  const baseName = file.name.replace(/\.apk$/i, "");
  // 包唯一标识/显示名称跟随新文件刷新的条件：尚未填写，或此前由上传自动填充且用户未手动编辑过
  if (!pkg.packageId || pkg._idAuto) {
    pkg.packageId = baseName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    pkg._idAuto = true;
  }
  if (!pkg.packageName || pkg._nameAuto) {
    pkg.packageName = baseName;
    pkg._nameAuto = true;
  }
  // 版本号不再从应用级配置复制：异步从包内 AndroidManifest.xml / module.prop 自动提取

  computeFileMd5(file).then((md5) => {
    // 仅当仍是本次上传时才回填，避免失败还原后未完成的 MD5 计算又把值写回
    if (pkg._uploadSeq === seq && md5) pkg.apkMd5 = md5;
  });

  parsePackageMeta(file).then((meta) => {
    if (pkg._uploadSeq !== seq) return;
    if (meta) {
      applyPackageMeta(pkg, meta);
    } else if (state.editingApp) {
      // 解析失败（非包文件/损坏压缩包等）回退：沿用应用级手填版本号
      if (state.editingApp.latestVersionCode) pkg.versionCode = state.editingApp.latestVersionCode;
      if (state.editingApp.latestVersionName) pkg.versionName = state.editingApp.latestVersionName;
    }
  });

  const uploadDir = getPackageUploadDir(pkg);

  try {
    await http.put(
      `/api/write/items/${uploadDir}/${encodeURIComponent(file.name)}`,
      file,
      {
        onUploadProgress: (e) => {
          if (e.total) pkg._uploadProgress = Math.round((e.loaded * 100) / e.total);
        },
        headers: { "Content-Type": "application/vnd.android.package-archive" },
      }
    );
    pkg.downloadUrl = `/raw/${uploadDir}/${encodeURIComponent(file.name)}`;
    pkg._uploading = false;
    pkg._uploadFileName = "";
  } catch (err) {
    pkg._uploading = false;
    pkg._uploadFileName = "";
    pkg._uploadSeq++; // 使本次未完成的 MD5/版本号回填失效
    pkg.apkSize = prev.apkSize;
    pkg.apkMd5 = prev.apkMd5;
    pkg.packageId = prev.packageId;
    pkg.packageName = prev.packageName;
    pkg.versionCode = prev.versionCode;
    pkg.versionName = prev.versionName;
    pkg._idAuto = prev._idAuto;
    pkg._nameAuto = prev._nameAuto;
    pkg._verAuto = prev._verAuto;
    await alertDialog("APK 安装包上传失败：" + (err.response?.data?.error || err.message));
  }
}

async function saveAppUpdate() {
  // 版本号已支持从上传的 APK/模块自动提取，发布时缺失会由后端从 packages 派生，故只强制应用标识
  if (!state.editingApp.appId || !state.editingApp.appName) {
    await alertDialog("请填写所有必填字段 (*)");
    return;
  }

  if (state.editingApp.packages) {
    for (const pkg of state.editingApp.packages) {
      if (!pkg.versionCode) pkg.versionCode = parseInt(state.editingApp.latestVersionCode, 10);
      if (!pkg.versionName) pkg.versionName = state.editingApp.latestVersionName;
    }
  }

  state.savingUpdate = true;
  try {
    await http.post("/api/admin/update/publish", state.editingApp);
    await alertDialog("应用更新发布成功！");
    state.editingApp = null;
    fetchAppUpdates();
  } catch (err) {
    await alertDialog("保存发布失败：" + (err.response?.data?.error || err.message));
  } finally {
    state.savingUpdate = false;
  }
}

export function useAppUpdates() {
  return {
    ...toRefs(state),
    fetchAppUpdates,
    onAppIdInput,
    onApkDirInput,
    setAppSubDirDefault,
    getEffectiveAppDir,
    getPackageUploadDir,
    createAppUpdate,
    editAppUpdate,
    renderMarkdown,
    insertMdPrefix,
    insertMdWrap,
    deleteAppUpdate,
    addPackageItem,
    removePackageItem,
    triggerApkSelect,
    onApkFileDrop,
    onApkFileSelected,
    uploadApkForPackage,
    saveAppUpdate,
  };
}
