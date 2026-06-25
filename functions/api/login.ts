import { signJWT } from "@/utils/jwt";
import { timingSafeEqual } from "@/utils/auth";

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const clientIP = request.headers.get("CF-Connecting-IP") || "127.0.0.1";

  // 1. IP 级频率限制 (如果绑定了 KV)
  const kv = env.KV;
  const rateLimitKey = `login_fail:${clientIP}`;
  if (kv) {
    const failedCountStr = await kv.get(rateLimitKey);
    const failedCount = failedCountStr ? parseInt(failedCountStr, 10) : 0;
    if (failedCount >= 5) {
      return new Response(
        JSON.stringify({ error: "尝试登录次数过多，请 15 分钟后再试" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "无效的请求格式" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { username, password, turnstileToken } = body;
  if (!username || !password) {
    return new Response(JSON.stringify({ error: "用户名和密码不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Cloudflare Turnstile 人机校验 (如果配置了密钥)
  if (env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: "人机验证令牌缺失" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v/siteverify",
      {
        method: "POST",
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: clientIP,
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const outcome: any = await verifyResponse.json();
    if (!outcome.success) {
      return new Response(JSON.stringify({ error: "人机校验失败，请重试" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 3. 密码验证逻辑 (双轨兼容: ADMIN_PASSWORD_HASH 或 原版 admin 环境变量)
  let isAuthenticated = false;
  const configuredUser = env.ADMIN_USERNAME || "admin";

  const adminHash = env.ADMIN_PASSWORD_HASH;
  if (adminHash) {
    // A. 哈希匹配模式
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (
      timingSafeEqual(username, configuredUser) &&
      timingSafeEqual(hashHex, adminHash)
    ) {
      isAuthenticated = true;
    }
  } else if (env.admin) {
    // B. 兼容原版 admin 变量明文模式 (例如 admin=username:password)
    try {
      const parts = env.admin.split(":");
      if (parts.length === 2) {
        const [u, p] = parts;
        if (timingSafeEqual(username, u) && timingSafeEqual(password, p)) {
          isAuthenticated = true;
        }
      }
    } catch (e) {
      // 解析失败忽略
    }
  } else if (typeof env[`${username}:${password}`] === "string") {
    // C. 兼容自定义 allow-list 配置名明文模式 (用户名:密码 作为环境变量)
    isAuthenticated = true;
  }

  if (!isAuthenticated) {
    // 登录失败，增加计数 (如果绑定了 KV)
    if (kv) {
      const failedCountStr = await kv.get(rateLimitKey);
      const failedCount = failedCountStr ? parseInt(failedCountStr, 10) : 0;
      await kv.put(rateLimitKey, (failedCount + 1).toString(), {
        expirationTtl: 900, // 15分钟
      });
    }

    return new Response(JSON.stringify({ error: "用户名或密码错误" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 登录成功，清除失败计数
  if (kv) {
    await kv.delete(rateLimitKey);
  }

  // 4. 生成 JWT Token
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    return new Response(JSON.stringify({ error: "服务器未配置 JWT_SECRET 环境变量" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const token = await signJWT({ username }, jwtSecret);

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
