import { parseBucketPath } from "@/utils/bucket";
import { readMetrics, toKvStats } from "@/utils/metrics";

const METADATA_PATH = "_$flaredrive$/metadata/storage_usage.json";
const DEFAULT_QUOTA = 10 * 1024 * 1024 * 1024; // 10 GB

export async function recalculateStorage(bucket: any, quotaBytes: number): Promise<any> {
  let totalSize = 0;
  let fileCount = 0;
  let folderCount = 0;
  let cursor: string | undefined = undefined;

  do {
    const list: any = await bucket.list({ cursor });
    for (const obj of list.objects) {
      const key = obj.key;
      // 排除系统目录及标记目录本身文件夹占位符
      if (key.startsWith("_$flaredrive$/")) {
        continue;
      }
      if (key.endsWith("/_$folder$") || key.endsWith("_$folder$")) {
        folderCount++;
        continue;
      }
      totalSize += obj.size;
      fileCount++;
    }
    cursor = list.cursor;
  } while (cursor);

  const stats = {
    usedBytes: totalSize,
    quotaBytes: quotaBytes,
    fileCount: fileCount,
    folderCount: folderCount,
    lastUpdated: Date.now()
  };

  await bucket.put(METADATA_PATH, JSON.stringify(stats), {
    httpMetadata: { contentType: "application/json" }
  });

  return stats;
}

export async function onRequestGet(context: any) {
  const [bucket] = parseBucketPath(context);
  if (!bucket) {
    return new Response("Storage Bucket Not Configured", { status: 500 });
  }

  const quotaBytes = DEFAULT_QUOTA;

  try {
    const metadataObj = await bucket.get(METADATA_PATH);
    if (!metadataObj) {
      let kvStats: any = null;
      if (context.env?.KV) {
        try {
          kvStats = toKvStats(await readMetrics(context.env.KV));
        } catch (kvErr) {
          kvStats = { enabled: false };
        }
      } else {
        kvStats = { enabled: false };
      }

      const initialStats = {
        usedBytes: 0,
        quotaBytes: quotaBytes,
        fileCount: 0,
        folderCount: 0,
        lastUpdated: null,
        initialized: false,
        kvStats
      };
      if (context.waitUntil) {
        context.waitUntil(recalculateStorage(bucket, quotaBytes).catch(() => {}));
      }
      return new Response(JSON.stringify(initialStats), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const statsText = await metadataObj.text();
    const stats = JSON.parse(statsText);
    
    // 允许配置变化时动态更新额度上限
    if (stats.quotaBytes !== quotaBytes) {
      stats.quotaBytes = quotaBytes;
      await bucket.put(METADATA_PATH, JSON.stringify(stats), {
        httpMetadata: { contentType: "application/json" }
      });
    }

    // 检查并提取 KV 中的实时操作、流量、下载与请求日志
    let kvStats: any = null;
    if (context.env?.KV) {
      try {
        kvStats = toKvStats(await readMetrics(context.env.KV));
      } catch (kvErr) {
        kvStats = { enabled: false };
      }
    } else {
      kvStats = { enabled: false };
    }

    return new Response(JSON.stringify({
      ...stats,
      kvStats
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300"
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
