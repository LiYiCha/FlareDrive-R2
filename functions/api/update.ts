import { parseBucketPath } from "@/utils/bucket";

const UPDATE_METADATA_PATH = "_$flaredrive$/metadata/app_updates.json";

export async function onRequestGet(context: any) {
  const [bucket] = parseBucketPath(context);
  if (!bucket) {
    return new Response("Storage Bucket Not Configured", { status: 500 });
  }

  const url = new URL(context.request.url);
  const appId = url.searchParams.get("app_id");

  if (!appId) {
    return new Response(JSON.stringify({ error: "参数 app_id 缺失" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 使用 Cloudflare Cache API 缓存更新查询接口，避免大量 R2 读操作
  const cache = (caches as any).default;
  const cacheKey = new Request(url.toString());
  
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const updateObj = await bucket.get(UPDATE_METADATA_PATH);
    if (!updateObj) {
      const resp = new Response(JSON.stringify({ error: "暂无更新配置" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
      return resp;
    }

    const updatesText = await updateObj.text();
    const updateConfig = JSON.parse(updatesText);

    const appInfo = updateConfig.apps ? updateConfig.apps[appId] : null;

    if (!appInfo) {
      const resp = new Response(JSON.stringify({ hasUpdate: false, message: "未找到该应用的更新配置" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return resp;
    }

    const resp = new Response(JSON.stringify({ hasUpdate: true, appId, ...appInfo }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      }
    });

    // 写入 CDN 缓存
    context.waitUntil(cache.put(cacheKey, resp.clone()));

    return resp;
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
