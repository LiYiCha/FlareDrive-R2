import { notFound, parseBucketPath } from "@/utils/bucket";
import {get_auth_status} from "@/utils/auth";

export async function onRequestPostCreateMultipart(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;

  const customMetadata: Record<string, string> = {};
  if (request.headers.has("fd-thumbnail"))
    customMetadata.thumbnail = request.headers.get("fd-thumbnail");

  const multipartUpload = await bucket.createMultipartUpload(path, {
    httpMetadata: {
      contentType: request.headers.get("content-type"),
    },
    customMetadata,
  });

  return new Response(
    JSON.stringify({
      key: multipartUpload.key,
      uploadId: multipartUpload.uploadId,
    })
  );
}

export async function onRequestPostCompleteMultipart(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;
  const url = new URL(request.url);
  const uploadId = new URLSearchParams(url.search).get("uploadId");
  const multipartUpload = await bucket.resumeMultipartUpload(path, uploadId);

  const completeBody: { parts: Array<any> } = await request.json();

  try {
    const object = await multipartUpload.complete(completeBody.parts);
    
    // 增量更新存储使用情况
    try {
      const statsObj = await bucket.get("_$flaredrive$/metadata/storage_usage.json");
      if (statsObj) {
        const stats = JSON.parse(await statsObj.text());
        let oldSize = 0;
        let diffCount = 1;
        // 检查之前是否已经有同名文件
        const headObj = await bucket.head(path).catch(() => null);
        if (headObj) {
          oldSize = headObj.size;
          diffCount = 0;
        }
        stats.usedBytes = stats.usedBytes - oldSize + object.size;
        stats.fileCount += diffCount;
        stats.lastUpdated = Date.now();
        await bucket.put("_$flaredrive$/metadata/storage_usage.json", JSON.stringify(stats), {
          httpMetadata: { contentType: "application/json" }
        });
      }
    } catch (err) {
      console.error("Incremental upload size update failed: ", err);
    }

    return new Response(null, {
      headers: { etag: object.httpEtag },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 400 });
  }
}

export async function onRequestPost(context) {
  if(!await get_auth_status(context)){
    return new Response("没有操作权限", {
        status: 401,
    });
   }
  const url = new URL(context.request.url);
  const searchParams = new URLSearchParams(url.search);

  if (searchParams.has("uploads")) {
    return onRequestPostCreateMultipart(context);
  }

  if (searchParams.has("uploadId")) {
    return onRequestPostCompleteMultipart(context);
  }

  return new Response("Method not allowed", { status: 405 });
}

export async function onRequestPutMultipart(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;
  const url = new URL(request.url);

  const uploadId = new URLSearchParams(url.search).get("uploadId");
  const multipartUpload = await bucket.resumeMultipartUpload(path, uploadId);

  const partNumber = parseInt(
    new URLSearchParams(url.search).get("partNumber")
  );
  const uploadedPart = await multipartUpload.uploadPart(
    partNumber,
    request.body
  );

  return new Response(null, {
    headers: {
      "Content-Type": "application/json",
      etag: uploadedPart.etag,
    },
  });
}

export async function onRequestPut(context) {
  if(!await get_auth_status(context)){
    return new Response("没有操作权限", {
        status: 401,
    });
   }
  const url = new URL(context.request.url);

  if (new URLSearchParams(url.search).has("uploadId")) {
    return onRequestPutMultipart(context);
  }

  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;

  let content = request.body;
  const customMetadata: Record<string, string> = {};

  if (request.headers.has("x-amz-copy-source")) {
    const sourceName = decodeURIComponent(
      request.headers.get("x-amz-copy-source")
    );
    const source = await bucket.get(sourceName);
    content = source.body;
    if (source.customMetadata.thumbnail)
      customMetadata.thumbnail = source.customMetadata.thumbnail;
  }

  if (request.headers.has("fd-thumbnail"))
    customMetadata.thumbnail = request.headers.get("fd-thumbnail");

  // 增量更新存储使用情况 - 检查原大小
  let oldSize = 0;
  let diffCount = 1;
  try {
    const headObj = await bucket.head(path).catch(() => null);
    if (headObj) {
      oldSize = headObj.size;
      diffCount = 0;
    }
  } catch (e) {}

  const obj = await bucket.put(path, content, { customMetadata });
  const { key, size, uploaded } = obj;

  // 写入增量大小
  try {
    const statsObj = await bucket.get("_$flaredrive$/metadata/storage_usage.json");
    if (statsObj) {
      const stats = JSON.parse(await statsObj.text());
      stats.usedBytes = stats.usedBytes - oldSize + size;
      stats.fileCount += diffCount;
      stats.lastUpdated = Date.now();
      await bucket.put("_$flaredrive$/metadata/storage_usage.json", JSON.stringify(stats), {
        httpMetadata: { contentType: "application/json" }
      });
    }
  } catch (err) {
    console.error("Incremental upload size update failed: ", err);
  }

  return new Response(JSON.stringify({ key, size, uploaded }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestDelete(context) {
  if(!await get_auth_status(context)){
    return new Response("没有操作权限", {
        status: 401,
    });
   }
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  // 获取被删除文件的大小用于扣减
  let oldSize = 0;
  let isFolderPlaceholder = path.endsWith("/_$folder$");
  try {
    const headObj = await bucket.head(path).catch(() => null);
    if (headObj) {
      oldSize = headObj.size;
    }
  } catch (e) {}

  await bucket.delete(path);

  // 写入增量减少大小
  try {
    const statsObj = await bucket.get("_$flaredrive$/metadata/storage_usage.json");
    if (statsObj) {
      const stats = JSON.parse(await statsObj.text());
      if (isFolderPlaceholder) {
        if (stats.folderCount > 0) stats.folderCount -= 1;
      } else {
        stats.usedBytes = Math.max(0, stats.usedBytes - oldSize);
        if (stats.fileCount > 0) stats.fileCount -= 1;
      }
      stats.lastUpdated = Date.now();
      await bucket.put("_$flaredrive$/metadata/storage_usage.json", JSON.stringify(stats), {
        httpMetadata: { contentType: "application/json" }
      });
    }
  } catch (err) {
    console.error("Incremental delete size update failed: ", err);
  }

  return new Response(null, { status: 204 });
}
