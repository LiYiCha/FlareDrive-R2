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

  const { username, password } = body;
  if (!username || !password) {
    return new Response(JSON.stringify({ error: "用户名和密码不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }


  // 3. 验证身份凭证
  let isAuthenticated = false;

  if (typeof env[`${username}:${password}`] === "string") {
    // 环境变量中存在 "用户名:密码" 的授权项 (如 admin:123456)
    isAuthenticated = true;
  } else if (env.admin) {
    // 兼容 admin=username:password 模式
    try {
      const parts = env.admin.split(":");
      if (parts.length === 2) {
        const [u, p] = parts;
        if (timingSafeEqual(username, u) && timingSafeEqual(password, p)) {
          isAuthenticated = true;
        }
      }
    } catch (e) {
      // 忽略解析错误
    }
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
