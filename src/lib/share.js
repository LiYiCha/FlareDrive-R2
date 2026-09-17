import http from "./request.js";

/** 创建分享：path 为文件 key 或以 / 结尾的文件夹路径；expiresInDays 0 = 永久 */
export function createShare({ path, expiresInDays = 7, code = "" }) {
  return http.post("/api/share", { path, expiresInDays, code });
}

/** 分享管理列表（仅管理员） */
export function listShares() {
  return http.get("/api/share");
}

/** 撤销分享 */
export function deleteShare(token) {
  return http.delete(`/api/share/${encodeURIComponent(token)}`);
}

export function buildShareUrl(token) {
  return `${window.location.origin}/s/${token}`;
}
