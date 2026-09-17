import {
  hashAccessCode,
  isShareExpired,
  readShare,
  resolveWithinFolderScope,
  writeShare,
} from "@/utils/share";

/**
 * 公开分享访问入口：GET /s/<token>
 * - 无记录 / 已过期 / 已撤销 → 统一 404 页（不区分原因，防探测）
 * - 有提取码 → ?code= 校验，缺失或错误时返回提取码表单页
 * - file 分享 → 流式返回文件（支持 Range 断点续传）
 * - folder 分享 → 极简目录列表页，子路径 ?path= 严格限制在分享前缀内
 * - 所有响应 Cache-Control: private, no-store —— 撤销后边缘缓存不会续命
 */

// 可在线预览的 MIME 前缀（其余以附件形式下载）
const INLINE_TYPE_RE = /^((image|video|audio)\/|application\/pdf|text\/plain)/;

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtSize(size: number): string {
  if (!size || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = size;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function pageShell(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #F1F5F9; min-height: 100vh;
    display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px;
    color: #1E293B;
  }
  .card {
    background: #fff; border-radius: 14px; padding: 32px;
    width: 100%; max-width: 720px; box-shadow: 0 4px 24px rgba(15, 23, 42, .08);
  }
  .center { text-align: center; }
  .icon { font-size: 44px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin-bottom: 8px; }
  .sub { font-size: 13px; color: #64748B; line-height: 1.6; }
  .err { color: #DC2626; font-size: 13px; margin-top: 8px; }
  input[type="text"], input[type="password"] {
    width: 100%; padding: 10px 12px; margin: 16px 0 12px; font-size: 15px;
    border: 1px solid #CBD5E1; border-radius: 8px; outline: none;
  }
  input[type="text"]:focus, input[type="password"]:focus { border-color: #3B82F6; }
  button {
    width: 100%; padding: 10px 0; font-size: 15px; color: #fff; background: #2563EB;
    border: none; border-radius: 8px; cursor: pointer;
  }
  button:hover { background: #1D4ED8; }
  .crumb { font-size: 13px; color: #64748B; margin-bottom: 14px; word-break: break-all; }
  .crumb a { color: #2563EB; text-decoration: none; }
  .row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 8px; text-decoration: none; color: inherit;
  }
  .row:hover { background: #F1F5F9; }
  .row + .row { border-top: 1px solid #F1F5F9; }
  .row .name { flex: 1; font-size: 14px; word-break: break-all; }
  .row .meta { font-size: 12px; color: #94A3B8; white-space: nowrap; }
  .empty { text-align: center; color: #94A3B8; font-size: 14px; padding: 24px 0; }
  .pv { width: 100%; border-radius: 10px; margin: 14px 0 4px; max-height: 65vh; object-fit: contain; background: #0F172A08; }
  iframe.pv { height: 62vh; border: 1px solid #E2E8F0; }
  .file-head { display: flex; align-items: center; gap: 12px; }
  .file-badge { font-size: 12px; color: #64748B; background: #F1F5F9; border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
  .btn-dl {
    display: block; text-align: center; text-decoration: none; margin-top: 16px;
    padding: 11px 0; font-size: 15px; color: #fff; background: #2563EB; border-radius: 8px;
  }
  .btn-dl:hover { background: #1D4ED8; }
  .hint { text-align: center; color: #94A3B8; font-size: 12px; margin-top: 10px; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/** 统一 404：不存在 / 已过期 / 已撤销 / 越界 一律同文案，防枚举探测 */
function notFoundPage(): Response {
  return pageShell(
    "分享不可用",
    `<div class="card center"><div class="icon">🔗</div>
     <h1>分享不存在或已过期</h1>
     <p class="sub">链接可能已被分享者撤销，或已超出有效期。</p></div>`,
    404
  );
}

function unavailablePage(): Response {
  return pageShell(
    "分享服务暂不可用",
    `<div class="card center"><div class="icon">🛠️</div>
     <h1>分享服务暂不可用</h1>
     <p class="sub">服务端未绑定 KV 存储（变量名必须为 KV），请联系管理员配置。</p></div>`,
    503
  );
}

function codePromptPage(token: string, subPath: string, wrong: boolean): Response {
  return pageShell(
    "提取码访问",
    `<div class="card" style="max-width: 380px;">
       <h1 style="text-align:center;">🔒 此分享已启用提取码</h1>
       ${wrong ? `<p class="err" style="text-align:center;">提取码不正确，请重试</p>` : ""}
       <form method="GET" action="/s/${esc(token)}">
         ${subPath ? `<input type="hidden" name="path" value="${esc(subPath)}">` : ""}
         <input type="text" name="code" placeholder="请输入提取码" required autofocus autocomplete="off">
         <button type="submit">访问分享内容</button>
       </form>
     </div>`,
    401
  );
}

function folderListPage(
  token: string,
  recordPath: string,
  recordName: string,
  subPath: string,
  folders: string[],
  files: any[],
  code: string
): Response {
  const codeQs = code ? `&code=${encodeURIComponent(code)}` : "";
  const subLink = (p: string) => `/s/${esc(token)}?path=${encodeURIComponent(p)}${codeQs}`;
  // ?path= 必须是相对分享前缀的路径（/s/ 端点会重新拼接 record.path）
  const rel = (full: string) => (full.startsWith(recordPath) ? full.slice(recordPath.length) : full);

  // 面包屑：分享名 / 子目录逐级
  const parts = subPath ? subPath.replace(/\/+$/, "").split("/") : [];
  let crumbs = `<a href="/s/${esc(token)}${codeQs ? `?code=${encodeURIComponent(code)}` : ""}">${esc(recordName)}</a>`;
  let acc = "";
  for (const part of parts) {
    acc += `${part}/`;
    crumbs += ` / <a href="${subLink(acc)}">${esc(part)}</a>`;
  }

  const folderRows = folders
    .map((full: string) => {
      const name = full.replace(/\/+$/, "").split("/").pop() || full;
      return `<a class="row" href="${subLink(rel(full))}">
        <span>📁</span><span class="name">${esc(name)}</span><span class="meta">文件夹</span>
      </a>`;
    })
    .join("");

  const fileRows = files
    .map((obj: any) => {
      const name = obj.key.split("/").pop() || obj.key;
      return `<a class="row" href="${subLink(rel(obj.key))}">
        <span>📄</span><span class="name">${esc(name)}</span><span class="meta">${fmtSize(obj.size || 0)}</span>
      </a>`;
    })
    .join("");

  const listHtml =
    folderRows + fileRows ||
    `<div class="empty">此文件夹为空</div>`;

  return pageShell(
    recordName,
    `<div class="card">
       <div class="crumb">📂 ${crumbs}</div>
       ${listHtml}
     </div>`
  );
}

/** 文件预览落地页：默认入口，仅 1 次 KV 读（元信息来自分享记录），不触碰 R2 */
function fileLandingPage(
  token: string,
  opts: { name: string; size?: number; contentType?: string; code: string; subPath?: string }
): Response {
  const keep: string[] = [];
  if (opts.subPath) keep.push(`path=${encodeURIComponent(opts.subPath)}`);
  if (opts.code) keep.push(`code=${encodeURIComponent(opts.code)}`);
  const qs = keep.length ? `&${keep.join("&")}` : "";
  const pvUrl = `/s/${esc(token)}?pv=1${qs}`;
  const dlUrl = `/s/${esc(token)}?dl=1${qs}`;

  const ct = opts.contentType || "";
  const canPreview = !!ct && INLINE_TYPE_RE.test(ct);
  let previewHtml = "";
  if (canPreview) {
    if (ct.startsWith("image/")) {
      previewHtml = `<img class="pv" src="${pvUrl}" alt="${esc(opts.name)}">`;
    } else if (ct.startsWith("video/")) {
      previewHtml = `<video class="pv" controls preload="metadata" src="${pvUrl}"></video>`;
    } else if (ct.startsWith("audio/")) {
      previewHtml = `<audio controls style="width:100%;margin:14px 0 4px" src="${pvUrl}"></audio>`;
    } else {
      // application/pdf、text/plain 用 iframe 浏览器内建查看器
      previewHtml = `<iframe class="pv" src="${pvUrl}"></iframe>`;
    }
  }

  const sizeText = typeof opts.size === "number" && opts.size >= 0 ? fmtSize(opts.size) : "";
  const badges = [
    `<span class="file-badge">${sizeText || "未知大小"}</span>`,
    ct ? `<span class="file-badge">${esc(ct)}</span>` : "",
  ].join("");

  return pageShell(
    opts.name,
    `<div class="card">
       <div class="file-head">
         <span style="font-size: 30px;">📄</span>
         <div style="min-width: 0;">
           <h1 style="word-break: break-all;">${esc(opts.name)}</h1>
           ${badges}
         </div>
       </div>
       ${previewHtml || `<p class="hint" style="margin-top: 14px;">此文件类型不支持在线预览，请下载后查看</p>`}
       <a class="btn-dl" href="${dlUrl}" download>⬇️ 下载文件${sizeText ? ` (${sizeText})` : ""}</a>
       <p class="hint">仅在实际预览或下载时才会读取文件内容</p>
     </div>`
  );
}

/** 解析 Range 头：返回 R2 range 对象；null = 忽略（返回完整内容）；"invalid" = 416 */
function parseRange(header: string, size: number): { offset: number; length: number } | null | "invalid" {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, s, e] = m;
  if (s === "" && e === "") return null;
  if (s === "") {
    // bytes=-N：取末尾 N 字节
    const n = parseInt(e, 10);
    if (Number.isNaN(n) || n <= 0) return null;
    const length = Math.min(n, size);
    return { offset: size - length, length };
  }
  const start = parseInt(s, 10);
  if (Number.isNaN(start) || start >= size) return "invalid";
  const end = e === "" ? size - 1 : Math.min(parseInt(e, 10), size - 1);
  if (Number.isNaN(end) || end < start) return "invalid";
  return { offset: start, length: end - start + 1 };
}

function contentDisposition(contentType: string, name: string, mode: "pv" | "dl"): string {
  // dl=1 一律附件下载；pv 仅可预览类型 inline（其余类型浏览器会按附件处理）
  const disposition = mode === "dl" ? "attachment" : INLINE_TYPE_RE.test(contentType) ? "inline" : "attachment";
  const fallback = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * 流式返回文件内容。
 * 资源优化：仅带 Range 头（视频拖动/断点续传）时才先 head 获取大小校验；
 * 普通请求直接 get 一次完成（从返回的 R2Object 上取 size/contentType），减少 R2 读操作。
 */
async function serveObject(
  bucket: any,
  key: string,
  name: string,
  request: Request,
  mode: "pv" | "dl",
  contentTypeHint?: string
): Promise<Response> {
  const rangeHeader = request.headers.get("range");
  let status = 200;
  let range: { offset: number; length: number } | undefined;
  let size = 0;
  let contentType = contentTypeHint || "";

  let obj: any;
  if (rangeHeader) {
    const head = await bucket.head(key);
    if (!head) return notFoundPage();
    size = head.size || 0;
    contentType = contentType || head.httpMetadata?.contentType || "application/octet-stream";
    const parsed = parseRange(rangeHeader, size);
    if (parsed === "invalid") {
      return new Response("Range Not Satisfiable", { status: 416 });
    }
    if (parsed) {
      status = 206;
      range = parsed;
      obj = await bucket.get(key, { range: parsed });
    } else {
      obj = await bucket.get(key);
    }
  } else {
    obj = await bucket.get(key);
  }
  if (!obj || !obj.body) return notFoundPage();

  size = size || obj.size || 0;
  contentType = contentType || obj.httpMetadata?.contentType || "application/octet-stream";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", contentDisposition(contentType, name, mode));
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  if (status === 206 && range) {
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${size}`);
    headers.set("Content-Length", String(range.length));
  } else if (size > 0) {
    headers.set("Content-Length", String(size));
  }
  return new Response(obj.body, { status, headers });
}

export async function onRequestGet(context: any): Promise<Response> {
  const { request, env, params, waitUntil } = context;
  const kv = env.KV;
  const driveid = new URL(request.url).hostname.replace(/\..*/, "");
  const bucket = env[driveid] || env["BUCKET"];
  if (!kv || !bucket) return unavailablePage();

  const urlObj = new URL(request.url);
  const token = String(params.token || "");
  const record = await readShare(kv, token);
  if (!record || isShareExpired(record)) return notFoundPage();

  // 提取码校验（存的是 SHA-256 哈希，比对哈希值）
  const submittedCode = urlObj.searchParams.get("code") || "";
  if (record.codeHash) {
    const ok = submittedCode && (await hashAccessCode(submittedCode)) === record.codeHash;
    if (!ok) {
      return codePromptPage(token, urlObj.searchParams.get("path") || "", !!submittedCode);
    }
  }

  // 访问模型（节省资源）：
  //   默认     → 预览落地页（仅 1 次 KV 读，零 R2 操作）
  //   ?pv=1    → 预览内容（可预览类型 inline，供落地页 <img>/<video>/<iframe> 加载）
  //   ?dl=1    → 附件下载（仅此情况计入下载次数）
  const mode = urlObj.searchParams.get("dl") ? "dl" : urlObj.searchParams.get("pv") ? "pv" : "page";

  // 仅真实下载（dl=1）计数（与指标同策略，接受轻微并发竞态）
  const countDownload = () => {
    if (!waitUntil) return;
    waitUntil(
      (async () => {
        try {
          record.downloads = (record.downloads || 0) + 1;
          await writeShare(kv, token, record);
        } catch (e) {
          // 静默失败，不影响下载本身
        }
      })()
    );
  };

  if (record.type === "file") {
    if (mode === "page") {
      return fileLandingPage(token, {
        name: record.name,
        size: record.size,
        contentType: record.contentType,
        code: submittedCode,
      });
    }
    if (mode === "dl") countDownload();
    return serveObject(bucket, record.path, record.name, request, mode, record.contentType);
  }

  // folder 分享：解析子路径，严格限制在分享前缀内
  const subPath = urlObj.searchParams.get("path") || "";
  let full = resolveWithinFolderScope(record.path, subPath);
  if (!full) return notFoundPage();

  // 未带尾斜杠时优先按文件处理（存在即返回文件）；否则按目录列表展示
  if (!full.endsWith("/")) {
    const item = await bucket.head(full);
    if (item) {
      const name = full.split("/").pop() || record.name;
      if (mode === "page") {
        return fileLandingPage(token, {
          name,
          size: item.size,
          contentType: item.httpMetadata?.contentType || "",
          code: submittedCode,
          subPath,
        });
      }
      if (mode === "dl") countDownload();
      return serveObject(bucket, full, name, request, mode, item.httpMetadata?.contentType || "");
    }
    full += "/";
  }

  const objList = await bucket.list({
    prefix: full,
    delimiter: "/",
    include: ["httpMetadata"],
  });
  const folders = (objList.delimitedPrefixes || []).filter((f: string) => !f.startsWith("_$"));
  const files = (objList.objects || []).filter(
    (o: any) => !o.key.endsWith("/_$folder$") && !o.key.startsWith("_$")
  );
  const displayName = full.replace(/\/+$/, "").split("/").pop() || record.name;
  return folderListPage(
    token,
    record.path,
    displayName,
    full.slice(record.path.length),
    folders,
    files,
    submittedCode
  );
}
