/**
 * 分享功能共享工具：KV 记录读写、token 生成、提取码哈希、路径范围校验。
 * 分享记录存储在 KV 中（与指标共用绑定，变量名 KV）：
 *   Key:   share:<token>     (token 为 128 位随机 base64url，不可枚举)
 *   Value: ShareRecord JSON
 */

export const SHARE_KV_PREFIX = "share:";

export interface ShareRecord {
  /** 文件 key，或以 / 结尾的文件夹前缀 */
  path: string;
  /** file | folder */
  type: "file" | "folder";
  /** 展示名（最后一段） */
  name: string;
  createdAt: number;
  /** 过期时间戳(ms)；0 = 永久有效 */
  expiresAt: number;
  /** 提取码 SHA-256 十六进制；空串 = 无提取码 */
  codeHash: string;
  /** 通过 /s/ 链接成功下载文件的次数 */
  downloads: number;
  /** 文件大小（字节）与 MIME 类型：创建时从存在性校验的 head 结果顺手记录，
   *  使预览落地页无需任何 R2 读操作即可渲染；旧记录可能缺失 */
  size?: number;
  contentType?: string;
}

/** 生成 128 位随机 URL 安全 token（非 JWT，泄露范围仅限该分享） */
export function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function hashAccessCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function readShare(kv: any, token: string): Promise<ShareRecord | null> {
  try {
    const raw = await kv.get(`${SHARE_KV_PREFIX}${token}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function writeShare(kv: any, token: string, record: ShareRecord): Promise<void> {
  await kv.put(`${SHARE_KV_PREFIX}${token}`, JSON.stringify(record));
}

export function isShareExpired(record: ShareRecord): boolean {
  return record.expiresAt > 0 && Date.now() > record.expiresAt;
}

/**
 * 归一化分享目标路径：统一斜杠、去掉前导斜杠。
 * 文件不带尾斜杠，文件夹保证尾斜杠；包含 ".." 视为非法，返回 null。
 */
export function normalizeShareTarget(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "");
  if (!cleaned) return null;
  const isFolder = cleaned.endsWith("/");
  const segments = cleaned.split("/").filter(Boolean);
  if (segments.some((seg) => seg === "." || seg === "..")) return null;
  return segments.join("/") + (isFolder ? "/" : "");
}

/**
 * 解析 folder 分享中的子路径，确保结果严格位于分享前缀内（防越权浏览）。
 * 返回 null 表示越界。
 */
export function resolveWithinFolderScope(folderPrefix: string, subPath: string): string | null {
  if (!folderPrefix.endsWith("/")) return null;
  if (!subPath) return folderPrefix;
  const cleaned = subPath.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "");
  if (!cleaned) return folderPrefix;
  const segments = cleaned.split("/").filter(Boolean);
  if (segments.some((seg) => seg === "." || seg === "..")) return null;
  return folderPrefix + segments.join("/") + (cleaned.endsWith("/") ? "/" : "");
}
