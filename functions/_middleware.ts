export async function onRequest(context: any) {
  const { request, env, next, waitUntil } = context;
  const kv = env.KV;
  const url = new URL(request.url);

  // 立即执行主业务逻辑获取响应
  const response = await next();

  // 若环境绑定了 KV 数据库，后台异步采集真实指标与访问日志 (完全不阻塞客户端响应)
  if (kv && waitUntil) {
    waitUntil((async () => {
      try {
        const pathname = url.pathname;
        if (pathname.startsWith("/api/") || pathname.startsWith("/raw/")) {
          // 1. 获取响应大小与状态
          const contentLengthStr = response.headers.get("content-length");
          const respBytes = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;
          const status = response.status;
          const clientIp = request.headers.get("cf-connecting-ip") || "127.0.0.1";
          const country = request.headers.get("cf-ipcountry") || "CN";
          const method = request.method;
          const isDownload = pathname.startsWith("/raw/");

          // 2. 并行读取当前统计数据
          const [reqsStr, dlStr, trafficStr, classAStr, classBStr, logsStr] = await Promise.all([
            kv.get("metrics:requests"),
            kv.get("metrics:downloads"),
            kv.get("metrics:traffic_bytes"),
            kv.get("metrics:class_a"),
            kv.get("metrics:class_b"),
            kv.get("metrics:recent_logs")
          ]);

          const totalReq = (parseInt(reqsStr || "0", 10)) + 1;
          const totalDl = (parseInt(dlStr || "0", 10)) + (isDownload ? 1 : 0);
          const totalTraffic = (parseInt(trafficStr || "0", 10)) + (respBytes || 0);

          let classA = parseInt(classAStr || "0", 10);
          let classB = parseInt(classBStr || "0", 10);

          let opType = "API 请求";
          if (
            method === "PUT" ||
            method === "POST" ||
            method === "DELETE" ||
            pathname.startsWith("/api/write/")
          ) {
            classA += 1;
            opType = "S3 A类写入";
          } else if (method === "GET" && pathname.startsWith("/api/children/")) {
            classB += 1;
            opType = "S3 B类检索";
          } else if (isDownload) {
            classB += 1;
            opType = "文件下载";
          }

          // 3. 构建滑动窗口最近访问记录 (最新 30 条真实请求流水)
          let recentLogs: any[] = [];
          try {
            if (logsStr) recentLogs = JSON.parse(logsStr);
          } catch (e) {}

          recentLogs.unshift({
            time: Date.now(),
            ip: clientIp,
            country,
            method,
            path: pathname,
            status,
            bytes: respBytes,
            opType
          });
          if (recentLogs.length > 30) {
            recentLogs = recentLogs.slice(0, 30);
          }

          // 4. 并行持久化写入 KV
          await Promise.all([
            kv.put("metrics:requests", totalReq.toString()),
            kv.put("metrics:downloads", totalDl.toString()),
            kv.put("metrics:traffic_bytes", totalTraffic.toString()),
            kv.put("metrics:class_a", classA.toString()),
            kv.put("metrics:class_b", classB.toString()),
            kv.put("metrics:last_client", JSON.stringify({ ip: clientIp, country, time: Date.now() })),
            kv.put("metrics:recent_logs", JSON.stringify(recentLogs))
          ]);
        }
      } catch (e) {
        // 静默异常，确保绝不影响主业务
      }
    })());
  }

  return response;
}
