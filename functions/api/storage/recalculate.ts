import { parseBucketPath } from "@/utils/bucket";
import { get_allow_list } from "@/utils/auth";
import { recalculateStorage } from "./usage";

const DEFAULT_QUOTA = 10 * 1024 * 1024 * 1024; // 10 GB

export async function onRequestPost(context: any) {
  // 1. 验证管理员权限 (需要包含 '*' 的权限，无权限或未登录统一返回 404 隐蔽模式)
  const allowList = await get_allow_list(context);
  if (!allowList || !allowList.includes("*")) {
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const [bucket] = parseBucketPath(context);
  if (!bucket) {
    return new Response("Storage Bucket Not Configured", { status: 500 });
  }

  const quotaBytes = DEFAULT_QUOTA;

  try {
    const stats = await recalculateStorage(bucket, quotaBytes);
    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
