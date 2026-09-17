import { notFound, parseBucketPath } from "@/utils/bucket";
import { can_access_path } from "@/utils/auth";
import { verifyJWT } from "@/utils/jwt";

function isPublicAccessible(env: any, path: string): boolean {
  if (path.startsWith("_$flaredrive$/thumbnails/")) return true;

  const allowPublicUpdate = env["ALLOW_PUBLIC_UPDATE"] !== "false" && env["ALLOW_PUBLIC_UPDATE"] !== false;
  const isUpdateDir = path.startsWith("update/") || path === "update";
  if (isUpdateDir && allowPublicUpdate) return true;

  const guestValue = env["GUEST"];
  const publicPathsValue = env["PUBLIC_PATHS"];
  const publicList = `${guestValue || ""},${publicPathsValue || ""}`
    .split(",")
    .map((entry: string) => entry.trim())
    .filter((entry: string) => entry.length > 0);
  if (publicList.includes("*")) return true;
  return publicList.some((allow: string) => path.startsWith(allow));
}

function buildPublicCacheControl(env: any, urlObj: URL, isThumbnail: boolean): string {
  if (isThumbnail) {
    return "public, max-age=2592000";
  }
  const enableCdn = env["ENABLE_PUBLIC_CDN_CACHE"] === "true" || env["ENABLE_APK_CDN_CACHE"] === "true";
  const customTtl = parseInt(env["CDN_CACHE_TTL"] || "0", 10);
  const hasVersionParam = urlObj.searchParams.has("v") || urlObj.searchParams.has("version");
  if (enableCdn || customTtl > 0 || hasVersionParam) {
    const ttl = customTtl > 0 ? customTtl : 86400;
    return `public, max-age=${ttl}, stale-while-revalidate=3600`;
  }
  return "no-cache, no-store, must-revalidate";
}

export async function onRequestGet(context: any) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const urlObj = new URL(context.request.url);

  // 1. 鉴权校验，移除 WWW-Authenticate 避免浏览器弹窗
  let accessGranted = await can_access_path(context, path || "");

  // 1b. 支持通过 URL query 携带 JWT（window.open / <a> / <img> 无法设置请求头的场景）
  if (!accessGranted) {
    const queryToken = urlObj.searchParams.get("token");
    if (queryToken && context.env.JWT_SECRET) {
      const payload = await verifyJWT(queryToken, context.env.JWT_SECRET).catch(() => null);
      if (payload && payload.username) {
        const tokenRequest = new Request(context.request.url, {
          method: context.request.method,
          headers: { Authorization: `Bearer ${queryToken}` },
        });
        accessGranted = await can_access_path(
          { ...context, request: tokenRequest },
          path || ""
        );
      }
    }
  }

  if (!accessGranted) {
    return new Response("没有读取权限", { status: 401 });
  }

  // token 仅用于本 Worker 鉴权，不透传到 R2
  const downstreamParams = new URLSearchParams(urlObj.search);
  downstreamParams.delete("token");
  const downstreamSearch = downstreamParams.toString() ? `?${downstreamParams.toString()}` : "";

  // 2. 解析路径与 R2 公开直链域名
  const rawPrefix = "/raw/";
  const index = urlObj.pathname.indexOf(rawPrefix);
  const subPath = index !== -1 ? urlObj.pathname.substring(index + rawPrefix.length) : path;
  const pubUrl = (context.env["PUBURL"] || "").trim().replace(/\/+$/, "");

  // 本地开发时 PUBURL 常指向 localhost（wrangler r2.dev 不可用），直接走 R2 绑定读取
  let isLocalPub = false;
  if (pubUrl) {
    try {
      const pubHost = new URL(pubUrl).hostname;
      isLocalPub = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(pubHost);
    } catch (e) {}
  }

  const cleanSubPath = (subPath || "").replace(/^\/+/, "");
  // R2 对象 key 是解码后的原始字符串，bucket.get 必须传解码路径（Location/回源仍用编码路径）
  let objectKey = cleanSubPath;
  try {
    objectKey = decodeURIComponent(cleanSubPath);
  } catch (e) {}
  const isThumbnail = (path || "").startsWith("_$flaredrive$/thumbnails/");
  const publicAccessible = isPublicAccessible(context.env, path || "");

  // 3. 公开文件：302 直跳 R2 公共域名，文件字节不再经过 Worker 中转
  //    可通过环境变量 ENABLE_DIRECT_REDIRECT=false 关闭；本地 localhost 不跳转
  const redirectEnabled =
    context.env["ENABLE_DIRECT_REDIRECT"] !== "false" &&
    context.env["ENABLE_DIRECT_REDIRECT"] !== false;
  if (pubUrl && !isLocalPub && publicAccessible && redirectEnabled) {
    const cacheControl = buildPublicCacheControl(context.env, urlObj, isThumbnail);
    const respHeaders = new Headers({
      Location: `${pubUrl}/${cleanSubPath}${downstreamSearch}`,
      "Cache-Control": cacheControl,
    });
    if (cacheControl.includes("no-store")) {
      respHeaders.set("Pragma", "no-cache");
    }
    return new Response(null, { status: 302, headers: respHeaders });
  }

  // 4. 读取文件：优先经 PUBURL 回源；本地 localhost 或上游 5xx/网络故障时回退到 R2 绑定直读
  let response: Response | null = null;

  if (pubUrl && !isLocalPub) {
    try {
      const upstream = await fetch(
        new Request(`${pubUrl}/${cleanSubPath}${downstreamSearch}`, {
          headers: context.request.headers,
          method: context.request.method,
          redirect: "follow",
          body:
            context.request.method !== "GET" && context.request.method !== "HEAD"
              ? context.request.body
              : undefined,
        })
      );
      if (upstream.status < 500) response = upstream;
    } catch (e) {
      response = null;
    }
  }

  if (!response) {
    // 直接从 R2 存储桶读取，支持原生 Range 断点续传
    const object = await bucket.get(objectKey, {
      range: context.request.headers,
      onlyIf: context.request.headers,
    });

    if (!object) return notFound();

    const respHeaders = new Headers();
    object.writeHttpMetadata(respHeaders);
    respHeaders.set("etag", object.httpEtag);
    if (object.range) {
      respHeaders.set("content-range", `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
      response = new Response(object.body, { headers: respHeaders, status: 206 });
    } else {
      response = new Response(object.body, { headers: respHeaders, status: 200 });
    }
  }

  const headers = new Headers(response.headers);

  // 5. CDN 缓存策略与自定义控制 (默认不长久强缓存，避免替换 APK 后客户端无法获取最新文件)
  if (isThumbnail) {
    headers.set("Cache-Control", "public, max-age=2592000");
  } else {
    const isUpdateDir = (path || "").startsWith("update/") || path === "update";
    const guestValue = context.env["GUEST"];
    let isPublic = isUpdateDir;
    if (!isPublic && guestValue) {
      const guestAllowList = guestValue.split(",").map((entry: string) => entry.trim());
      isPublic = guestAllowList.includes("*") || guestAllowList.some((allow: string) => (path || "").startsWith(allow));
    }
    if (isPublic) {
      const cacheControl = buildPublicCacheControl(context.env, urlObj, false);
      if (cacheControl.includes("no-store")) {
        headers.set("Cache-Control", cacheControl);
        headers.set("Pragma", "no-cache");
      } else {
        headers.set("Cache-Control", cacheControl);
      }
    } else {
      headers.set("Cache-Control", "private, no-cache");
    }
  }

  return new Response(response.body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText
  });
}
