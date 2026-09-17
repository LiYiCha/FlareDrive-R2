import { METRICS_KEY, readMetrics, emptyMetrics } from "@/utils/metrics";

export async function onRequest(context: any) {
  const { request, env, next, waitUntil } = context;
  const kv = env.KV;
  const url = new URL(request.url);

  // Chrome DevTools 打开时会自动探测该路径（自动 Workspace 连接功能），
  // 返回空 JSON 使其 200 静默通过，消除 wrangler 日志中的 404 噪音；
  // 不返回 workspace 配置字段，因此不会触发任何自动连接行为
  if (url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 立即执行主业务逻辑获取响应
  const response = await next();

  // 若环境绑定了 KV 数据库，后台异步采集指标与访问日志 (完全不阻塞客户端响应)
  if (kv && waitUntil) {
    waitUntil((async () => {
      try {
        const pathname = url.pathname;
        if (pathname.startsWith("/api/") || pathname.startsWith("/raw/")) {
          const metrics = await readMetrics(kv).catch(() => emptyMetrics());

          // 1. 更新计数
          const contentLengthStr = response.headers.get("content-length");
          const respBytes = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;
          const status = response.status;
          const clientIp = request.headers.get("cf-connecting-ip") || "127.0.0.1";
          const country = request.headers.get("cf-ipcountry") || "CN";
          const method = request.method;
          const isDownload = pathname.startsWith("/raw/");

          metrics.requests += 1;
          // 下载量只统计真正成功的下载（被 401/403/404 拦截的 /raw/ 请求不算下载次数）
          if (isDownload && status < 400) metrics.downloads += 1;
          metrics.traffic_bytes += respBytes || 0;

          // A/B 类操作计数只统计真正执行成功的请求（状态码 < 400）。
          // 被权限拦截 (401/403) 或失败的写入不应计入"写入/变更 已执行"次数
          let opType = "API 请求";
          if (
            status < 400 &&
            (method === "PUT" ||
              method === "DELETE" ||
              (method === "POST" && !pathname.startsWith("/api/login")) ||
              pathname.startsWith("/api/write/") ||
              (method === "GET" && (pathname.startsWith("/api/children/") || pathname.startsWith("/api/search"))))
          ) {
            metrics.class_a += 1;
            opType = (method === "GET") ? "R2 目录检索 (A类)" : "R2 写入/删除 (A类)";
          } else if (
            status < 400 &&
            (isDownload || (method === "GET" && pathname.startsWith("/raw/")))
          ) {
            metrics.class_b += 1;
            opType = "文件下载 (B类)";
          } else if (
            status < 400 &&
            method === "GET" && pathname.startsWith("/api/storage/")
          ) {
            metrics.class_b += 1;
            opType = "存储读取 (B类)";
          }

          // 2. 滑动窗口最近访问记录 (最新 30 条请求流水)
          metrics.recent_logs.unshift({
            time: Date.now(),
            ip: clientIp,
            country,
            method,
            path: pathname,
            status,
            bytes: respBytes,
            opType
          });
          if (metrics.recent_logs.length > 30) {
            metrics.recent_logs = metrics.recent_logs.slice(0, 30);
          }

          metrics.last_client = { ip: clientIp, country, time: Date.now() };

          // 3. 单次写入持久化全部指标
          await kv.put(METRICS_KEY, JSON.stringify(metrics));
        }
      } catch (e) {
        // 静默异常，确保绝不影响主业务
      }
    })());
  }

  return response;
}
