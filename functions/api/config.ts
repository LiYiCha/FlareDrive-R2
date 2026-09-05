export async function onRequestGet(context: any) {
  const { env } = context;

  return new Response(JSON.stringify({
    guestEnabled: !!env.GUEST,
    quotaBytes: 10 * 1024 * 1024 * 1024
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600" // 强缓存1小时，因为环境变量不常变
    }
  });
}
