import { verifyJWT } from "./jwt";

const THUMBNAIL_PREFIX = "_$flaredrive$/thumbnails/";

function parseAllowList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizePath(p: string): string {
  return p.replace(/^\/+/, "").replace(/\/+$/, "");
}

function matchesAllowList(targetPath: string, allowList: string[]): boolean {
  if (allowList.includes("*")) return true;
  const cleanTarget = normalizePath(targetPath);
  return allowList.some((allow) => {
    const cleanAllow = normalizePath(allow);
    if (!cleanAllow) return false;
    return cleanTarget === cleanAllow || cleanTarget.startsWith(cleanAllow + "/");
  });
}

// Timing safe equality helper for string verification
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function getAllowListForRequest(context: any): Promise<string[] | null> {
  const { request, env } = context;
  const headers = new Headers(request.headers);
  const authorization = headers.get("Authorization");

  if (authorization) {
    // 1. 优先尝试 Bearer JWT Token 验证
    if (authorization.startsWith("Bearer ")) {
      const token = authorization.substring(7).trim();
      const secret = env.JWT_SECRET;
      if (!secret) return null;
      const payload = await verifyJWT(token, secret);
      if (payload && payload.username) {
        // 如果 Token 中已签发权限，直接使用
        if (payload.allowList) {
          return parseAllowList(payload.allowList);
        }

        const username = payload.username;
        let allowConfig: string | undefined = env[username];
        if (!allowConfig) {
          for (const key of Object.keys(env)) {
            if (key.startsWith(`${username}_`) || key.startsWith(`${username}:`)) {
              allowConfig = env[key];
              break;
            }
          }
        }

        if (allowConfig) {
          return parseAllowList(allowConfig);
        }

        if (username === "admin") {
          return ["*"];
        }
      }
    }

    // 2. 备用支持原有的 Basic Auth 验证 (兼容旧 API 或工具)
    if (authorization.startsWith("Basic ")) {
      try {
        const account = atob(authorization.split("Basic ")[1]);
        if (account && env[account]) {
          return parseAllowList(env[account]);
        }
      } catch (e) {
        // 解码失败忽略
      }
    }
  }

  // 3. 访客 GUEST 与公开路径 PUBLIC_PATHS 权限
  const guestConfig = env["GUEST"] || "";
  const publicPathsConfig = env["PUBLIC_PATHS"] || "";
  const combinedPublicList = [
    ...parseAllowList(guestConfig),
    ...parseAllowList(publicPathsConfig),
  ];

  if (combinedPublicList.length > 0) {
    return combinedPublicList;
  }

  return null;
}

export async function can_access_path(context: any, targetPath: string): Promise<boolean> {
  if (targetPath.startsWith(THUMBNAIL_PREFIX)) return true;

  const env = context.env || {};
  const cleanTarget = normalizePath(targetPath);

  // 1. 环境变量控制：ALLOW_PUBLIC_UPDATE（默认 true，允许免登录直接下载 update/ 目录下的更新安装包）
  // 用户可在 Cloudflare 环境变量中显式配置 ALLOW_PUBLIC_UPDATE=false 将其关闭
  const allowPublicUpdate = env["ALLOW_PUBLIC_UPDATE"] !== "false" && env["ALLOW_PUBLIC_UPDATE"] !== false;
  const isUpdateDir = cleanTarget === "update" || cleanTarget.startsWith("update/");
  if (isUpdateDir && allowPublicUpdate) {
    return true;
  }

  // 2. 检验环境变量 GUEST/PUBLIC_PATHS 白名单或登录凭据白名单
  const allowList = await getAllowListForRequest(context);
  if (!allowList) return false;
  return matchesAllowList(targetPath, allowList);
}

export async function can_write_path(context: any, targetPath: string): Promise<boolean> {
  const allowList = await getAllowListForRequest(context);
  if (!allowList) return false;
  const cleanTarget = normalizePath(targetPath);
  // update/ 软件更新发布目录的写入操作严格要求管理员权限 (*)
  if (cleanTarget === "update" || cleanTarget.startsWith("update/")) {
    return allowList.includes("*");
  }
  return matchesAllowList(targetPath, allowList);
}

export async function get_allow_list(context: any): Promise<string[] | null> {
  return getAllowListForRequest(context);
}

export async function get_auth_status(context: any): Promise<boolean> {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith("/api/write/items/")) {
    const dopath = url.pathname.split("/api/write/items/")[1];
    if (!dopath) return false;
    return can_write_path(context, dopath);
  } else if (url.pathname.startsWith("/api/write/s3/")) {
    const pathSegments = context.params.path || [];
    if (pathSegments.length <= 1) {
      // 存储桶级操作（如列出桶内文件、删除桶等），仅限管理员 (*)
      const allowList = await get_allow_list(context);
      return !!(allowList && allowList.includes("*"));
    }
    // S3 client 拼接的文件路径格式为: bucket_name/key
    const key = pathSegments.slice(1).join("/");
    return can_write_path(context, key);
  }
  return false;
}
