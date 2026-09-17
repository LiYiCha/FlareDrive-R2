import { get_allow_list } from "@/utils/auth";
import { SHARE_KV_PREFIX, readShare } from "@/utils/share";

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** 撤销分享：直接删除 KV 记录，链接立即失效（KV 全球传播延迟约 60 秒内） */
export async function onRequestDelete(context: any): Promise<Response> {
  const { env, params } = context;
  const kv = env.KV;
  if (!kv) return json({ error: "分享功能需要绑定 KV 存储（变量名必须为 KV）" }, 503);

  const allowList = await get_allow_list(context);
  if (!allowList || !allowList.includes("*")) {
    return new Response("没有操作权限", { status: 401 });
  }

  const token = String(params.token || "");
  if (!token) return json({ error: "缺少分享 token" }, 400);

  const record = await readShare(kv, token);
  if (!record) return json({ error: "分享不存在或已被撤销" }, 404);

  await kv.delete(`${SHARE_KV_PREFIX}${token}`);
  return json({ ok: true, deleted: token });
}
