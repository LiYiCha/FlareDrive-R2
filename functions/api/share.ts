import { can_access_path, get_allow_list } from "@/utils/auth";
import {
  SHARE_KV_PREFIX,
  generateShareToken,
  hashAccessCode,
  isShareExpired,
  normalizeShareTarget,
  readShare,
  writeShare,
  ShareRecord,
} from "@/utils/share";

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function resolveBucket(env: any, request: Request): any {
  const driveid = new URL(request.url).hostname.replace(/\..*/, "");
  return env[driveid] || env["BUCKET"];
}

/** 创建分享链接。分享是"读取权限"的委托：登录用户只能分享自己有权读取的路径。 */
export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;
  const kv = env.KV;
  if (!kv) return json({ error: "分享功能需要绑定 KV 存储（变量名必须为 KV）" }, 503);

  const allowList = await get_allow_list(context);
  if (!allowList) {
    return new Response("没有读取权限", { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "请求体格式错误" }, 400);
  }

  const target = normalizeShareTarget(String(body?.path ?? ""));
  if (!target) return json({ error: "分享路径不合法" }, 400);

  if (!(await can_access_path(context, target))) {
    return new Response("没有读取权限", { status: 401 });
  }

  const bucket = resolveBucket(env, request);
  if (!bucket) return json({ error: "存储桶未绑定" }, 503);

  // 校验目标真实存在，避免生成死链（文件夹按 _$folder$ 占位符约定探测）
  const isFolder = target.endsWith("/");
  const probeKey = isFolder ? `${target}_$folder$` : target;
  const existing = await bucket.head(probeKey);
  if (!existing) {
    return json({ error: isFolder ? "文件夹不存在或已被删除" : "文件不存在或已被删除" }, 404);
  }

  // 有效期（天）：0 = 永久；上限 3650 天
  let expiresInDays = Number(body?.expiresInDays);
  if (!Number.isFinite(expiresInDays) || expiresInDays < 0) expiresInDays = 7;
  if (expiresInDays > 3650) expiresInDays = 3650;

  // 可选提取码：仅存 SHA-256 哈希，KV 泄露也无法还原明文
  let codeHash = "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (code) {
    if (code.length < 4 || code.length > 32) {
      return json({ error: "提取码长度需在 4-32 位之间" }, 400);
    }
    codeHash = await hashAccessCode(code);
  }

  const token = generateShareToken();
  const record: ShareRecord = {
    path: target,
    type: isFolder ? "folder" : "file",
    name: target.split("/").filter(Boolean).pop() || target,
    createdAt: Date.now(),
    expiresAt: expiresInDays > 0 ? Date.now() + expiresInDays * 86400000 : 0,
    codeHash,
    downloads: 0,
    // 记录文件元信息，预览落地页可零 R2 读操作渲染
    size: isFolder ? undefined : existing.size,
    contentType: isFolder ? undefined : existing.httpMetadata?.contentType || "",
  };
  await writeShare(kv, token, record);

  const origin = new URL(request.url).origin;
  return json({
    ok: true,
    token,
    url: `${origin}/s/${token}`,
    expiresAt: record.expiresAt,
    hasCode: !!codeHash,
  });
}

/** 分享管理列表（仅管理员 * 权限可见） */
export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context;
  const kv = env.KV;
  if (!kv) return json({ error: "分享功能需要绑定 KV 存储（变量名必须为 KV）" }, 503);

  const allowList = await get_allow_list(context);
  if (!allowList || !allowList.includes("*")) {
    return new Response("没有操作权限", { status: 401 });
  }

  const list = await kv.list({ prefix: SHARE_KV_PREFIX });
  const shares: any[] = [];
  for (const key of list.keys) {
    const token = key.name.slice(SHARE_KV_PREFIX.length);
    const record = await readShare(kv, token);
    if (!record) continue;
    shares.push({
      token,
      path: record.path,
      type: record.type,
      name: record.name,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      downloads: record.downloads || 0,
      size: record.size,
      contentType: record.contentType,
      expired: isShareExpired(record),
      hasCode: !!record.codeHash,
    });
  }
  shares.sort((a, b) => b.createdAt - a.createdAt);
  return json({ value: shares });
}
