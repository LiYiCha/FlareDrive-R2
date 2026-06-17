import { parseBucketPath } from "@/utils/bucket";
import { get_allow_list } from "@/utils/auth";

const UPDATE_METADATA_PATH = "_$flaredrive$/metadata/app_updates.json";

export async function onRequestPost(context: any) {
  // 1. 验证管理员权限 (需要包含 '*' 的权限)
  const allowList = await get_allow_list(context);
  if (!allowList || !allowList.includes("*")) {
    return new Response(JSON.stringify({ error: "没有操作权限" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const [bucket] = parseBucketPath(context);
  if (!bucket) {
    return new Response("Storage Bucket Not Configured", { status: 500 });
  }

  let body: any;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "无效的 JSON 格式" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { appId, appName, latestVersionCode, latestVersionName, updateLog, isForceUpdate, packages, deleteAction } = body;

  try {
    // 2. 读取现有的更新配置
    let updateConfig: any = { apps: {} };
    const configObj = await bucket.get(UPDATE_METADATA_PATH);
    if (configObj) {
      try {
        updateConfig = JSON.parse(await configObj.text());
      } catch (err) {
        // 解析失败使用初始结构
      }
    }

    if (!updateConfig.apps) {
      updateConfig.apps = {};
    }

    if (deleteAction) {
      // 执行删除操作
      if (updateConfig.apps[appId]) {
        delete updateConfig.apps[appId];
      }
      await bucket.put(UPDATE_METADATA_PATH, JSON.stringify(updateConfig), {
        httpMetadata: { contentType: "application/json" }
      });

      // 缓存清理
      try {
        const cache = (caches as any).default;
        const url = new URL(context.request.url);
        url.pathname = "/api/update";
        url.search = `?app_id=${appId}`;
        context.waitUntil(cache.delete(new Request(url.toString()), { ignoreMethod: true }));
      } catch (e) {}

      return new Response(JSON.stringify({ success: true, message: "删除成功" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!appId || !appName || !latestVersionCode || !latestVersionName) {
      return new Response(JSON.stringify({ error: "必填字段 (appId, appName, latestVersionCode, latestVersionName) 缺失" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. 写入/更新该 App 的配置
    updateConfig.apps[appId] = {
      appName,
      latestVersionCode: parseInt(latestVersionCode, 10),
      latestVersionName,
      updateLog: updateLog || "",
      isForceUpdate: !!isForceUpdate,
      packages: packages || [],
      lastUpdated: Date.now()
    };

    // 4. 保存回 R2
    await bucket.put(UPDATE_METADATA_PATH, JSON.stringify(updateConfig), {
      httpMetadata: { contentType: "application/json" }
    });

    // 5. 极速清除该 app_id 的 CDN 缓存
    try {
      const cache = (caches as any).default;
      const url = new URL(context.request.url);
      url.pathname = "/api/update";
      url.search = `?app_id=${appId}`;
      context.waitUntil(
        cache.delete(new Request(url.toString()), { ignoreMethod: true })
      );
    } catch (cacheErr) {
      console.error("Purging update cache failed:", cacheErr);
    }

    return new Response(JSON.stringify({ success: true, app: updateConfig.apps[appId] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
