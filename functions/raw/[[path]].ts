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

  // 3. CDN 强缓存优化
  if (path.startsWith("_$flaredrive$/thumbnails/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // 判断该路径是否为游客 (GUEST) 可直接免登访问的公共文件
    const guestValue = context.env["GUEST"];
    if (guestValue) {
      const guestAllowList = guestValue.split(",").map((entry: string) => entry.trim());
      const isPublic = guestAllowList.includes("*") || guestAllowList.some((allow: string) => path.startsWith(allow));
      if (isPublic) {
        // 公共下载直链文件（例如 APK 包、分享的图片等）开启 CDN 强缓存
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  }

  return new Response(response.body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText
  });
}
