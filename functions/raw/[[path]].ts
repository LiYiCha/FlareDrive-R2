import { notFound, parseBucketPath } from "@/utils/bucket";
import { can_access_path } from "@/utils/auth";

export async function onRequestGet(context: any) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  // 1. 异步鉴权校验，并移除 WWW-Authenticate 避免浏览器弹窗
  if (!await can_access_path(context, path || "")) {
    return new Response("没有读取权限", { status: 401 });
  }

  // 2. 通过重定向或回源代理下载
  // 拼接 R2 公开直链域名进行 fetch，CF 会自动处理 Range (分片/断点续传) 以及静态资源优化
  const urlObj = new URL(context.request.url);
  const rawPrefix = "/raw/";
  const index = urlObj.pathname.indexOf(rawPrefix);
  const subPath = index !== -1 ? urlObj.pathname.substring(index + rawPrefix.length) : path;
  const pubUrl = (context.env["PUBURL"] || "").trim().replace(/\/+$/, "");
  let response: Response;

  if (pubUrl) {
    const cleanSubPath = (subPath || "").replace(/^\/+/, "");
    const url = `${pubUrl}/${cleanSubPath}${urlObj.search}`;

    const fetchOptions: RequestInit = {
      headers: context.request.headers,
      method: context.request.method,
      redirect: "follow",
    };

    if (context.request.method !== "GET" && context.request.method !== "HEAD") {
      fetchOptions.body = context.request.body;
    }

    response = await fetch(new Request(url, fetchOptions));
  } else {
    // 未配置 PUBURL 时直接从 R2 存储桶读取，支持原生 Range 断点续传
    const cleanSubPath = (subPath || "").replace(/^\/+/, "");
    const object = await bucket.get(cleanSubPath, {
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

  // 3. CDN 缓存策略与自定义控制 (默认不长久强缓存，避免替换 APK 后客户端无法获取最新文件)
  if (path.startsWith("_$flaredrive$/thumbnails/")) {
    // 缩略图由于包含摘要哈希 (digestHex.png)，内容改变文件名必变，可安全缓存 30 天
    headers.set("Cache-Control", "public, max-age=2592000");
  } else {
    // 判断该路径是否为可公开下载的文件（例如 update/ 安装包或 GUEST 目录）
    const isUpdateDir = path.startsWith("update/") || path === "update";
    const guestValue = context.env["GUEST"];
    let isPublic = isUpdateDir;
    if (!isPublic && guestValue) {
      const guestAllowList = guestValue.split(",").map((entry: string) => entry.trim());
      isPublic = guestAllowList.includes("*") || guestAllowList.some((allow: string) => path.startsWith(allow));
    }
    if (isPublic) {
      // 支持手动开启与自定义缓存时间：
      // 1. 环境变量控制：ENABLE_PUBLIC_CDN_CACHE="true" 与 CDN_CACHE_TTL=秒数
      // 2. 带版本参数直链 (如 ?v=xxx)：自动启用安全缓存
      const enableCdn = context.env["ENABLE_PUBLIC_CDN_CACHE"] === "true" || context.env["ENABLE_APK_CDN_CACHE"] === "true";
      const customTtl = parseInt(context.env["CDN_CACHE_TTL"] || "0", 10);
      const hasVersionParam = urlObj.searchParams.has("v") || urlObj.searchParams.has("version");

      if (enableCdn || customTtl > 0 || hasVersionParam) {
        const ttl = customTtl > 0 ? customTtl : 86400; // 若未指定具体秒数则默认 1 天
        headers.set("Cache-Control", `public, max-age=${ttl}, stale-while-revalidate=3600`);
      } else {
        // 默认模式：不强缓存，确保更换 APK 安装包或更新文件后立即生效
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        headers.set("Pragma", "no-cache");
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
