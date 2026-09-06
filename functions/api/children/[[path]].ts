import { notFound, parseBucketPath } from "@/utils/bucket";
import { can_access_path, get_allow_list } from "@/utils/auth";

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    const prefix = path && `${path}/`;
    if (!bucket || prefix.startsWith("_$flaredrive$/")) return notFound();
    const allowList = await get_allow_list(context);
    if (!allowList) {
      return new Response("没有读取权限", { status: 401 });
    }
    if (prefix && !await can_access_path(context, prefix)) {
      return new Response("没有读取权限", { status: 401 });
    }

    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
    });
    let objKeys = objList.objects
      .filter((obj) => !obj.key.endsWith("/_$folder$"))
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata, etag } = obj;
        // Clean ETag (remove quotes)
        const cleanEtag = etag ? etag.replace(/"/g, "") : "";
        return { key, size, uploaded, httpMetadata, customMetadata, etag: cleanEtag };
      });

    let folders = objList.delimitedPrefixes;
    if (!path)
      folders = folders.filter((folder) => folder !== "_$flaredrive$/");
    if (!allowList.includes("*") && !path) {
      objKeys = objKeys.filter((obj) =>
        allowList.some((allow) => obj.key.startsWith(allow))
      );
      folders = folders.filter((folder) =>
        allowList.some((allow) => folder.startsWith(allow))
      );
      for (const allow of allowList) {
        if (!folders.includes(allow)) folders.push(allow);
      }
    }

    return new Response(JSON.stringify({ value: objKeys, folders }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=5, stale-while-revalidate=30"
      },
    });
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
