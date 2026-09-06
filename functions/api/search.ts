import { notFound, parseBucketPath } from "@/utils/bucket";
import { get_allow_list } from "@/utils/auth";

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();
    if (!query) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const [bucket] = parseBucketPath(context);
    if (!bucket) return notFound();

    const allowList = await get_allow_list(context);
    if (!allowList) {
      return new Response("没有读取权限", { status: 401 });
    }

    const results: any[] = [];
    let cursor: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 5;

    do {
      pageCount++;
      const list: any = await bucket.list({
        cursor,
        limit: 1000,
        include: ["httpMetadata", "customMetadata"]
      });

      for (const obj of list.objects) {
        const key: string = obj.key;
        if (key.startsWith("_$flaredrive$/") || key.endsWith("/_$folder$")) {
          continue;
        }

        if (!allowList.includes("*")) {
          const allowed = key.startsWith("update/") || allowList.some((allow: string) => key.startsWith(allow));
          if (!allowed) continue;
        }

        const fileName = key.split("/").pop() || "";
        if (fileName.toLowerCase().includes(query) || key.toLowerCase().includes(query)) {
          const cleanEtag = obj.etag ? obj.etag.replace(/"/g, "") : "";
          results.push({
            key: obj.key,
            size: obj.size,
            uploaded: obj.uploaded,
            httpMetadata: obj.httpMetadata,
            customMetadata: obj.customMetadata,
            etag: cleanEtag
          });

          if (results.length >= 100) {
            break;
          }
        }
      }

      if (results.length >= 100 || pageCount >= maxPages) {
        break;
      }
      cursor = list.cursor;
    } while (cursor);

    return new Response(JSON.stringify({ results, query }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120"
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
