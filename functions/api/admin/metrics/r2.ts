import { get_allow_list } from "@/utils/auth";

export async function onRequestGet(context: any) {
  // 1. 管理员鉴权 (未登录或无通配权限返回 404)
  const allowList = await get_allow_list(context);
  if (!allowList || !allowList.includes("*")) {
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const accountId = context.env["CF_ACCOUNT_ID"] || context.env["CLOUDFLARE_ACCOUNT_ID"];
  const apiToken = context.env["CF_API_TOKEN"] || context.env["CLOUDFLARE_API_TOKEN"];

  if (!accountId || !apiToken) {
    return new Response(JSON.stringify({
      configured: false,
      message: "未配置 Cloudflare 官方 API 凭据。请在 Cloudflare Pages 设置中的 Environment Variables 添加 CF_ACCOUNT_ID 和 CF_API_TOKEN (需授予 Account Analytics 读取权限)。",
      docs: "https://developers.cloudflare.com/analytics/graphql-api/"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(context.request.url);
    // 默认查询最近 30 天的官方账单周期指标
    const days = parseInt(url.searchParams.get("days") || "30", 10);
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const endDate = now.toISOString();

    const graphqlQuery = {
      query: `
        query GetR2Operations($accountTag: String!, $start: String!, $end: String!) {
          viewer {
            accounts(filter: { accountTag: $accountTag }) {
              r2OperationsAdaptiveGroups(
                limit: 1000
                filter: {
                  datetime_geq: $start
                  datetime_leq: $end
                }
              ) {
                dimensions {
                  actionType
                  classType
                }
                sum {
                  requests
                  responseObjectSizeBytes
                }
              }
            }
          }
        }
      `,
      variables: {
        accountTag: accountId.trim(),
        start: startDate,
        end: endDate
      }
    };

    const cfResp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!cfResp.ok) {
      const errText = await cfResp.text();
      return new Response(JSON.stringify({
        configured: true,
        success: false,
        error: `Cloudflare GraphQL 请求失败 (${cfResp.status}): ${errText}`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const cfData: any = await cfResp.json();
    if (cfData.errors && cfData.errors.length > 0) {
      return new Response(JSON.stringify({
        configured: true,
        success: false,
        error: cfData.errors.map((e: any) => e.message).join("; ")
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const groups = cfData.data?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups || [];

    let totalClassA = 0;
    let totalClassB = 0;
    let totalRequests = 0;
    let totalBytes = 0;
    const actions: any[] = [];

    for (const g of groups) {
      const reqs = g.sum?.requests || 0;
      const bytes = g.sum?.responseObjectSizeBytes || 0;
      const classType = g.dimensions?.classType || "Other";
      const actionType = g.dimensions?.actionType || "Unknown";

      if (classType === "A") {
        totalClassA += reqs;
      } else if (classType === "B") {
        totalClassB += reqs;
      }

      totalRequests += reqs;
      totalBytes += bytes;

      actions.push({
        actionType,
        classType,
        requests: reqs,
        bytes
      });
    }

    // 按请求次数倒序排列操作
    actions.sort((a, b) => b.requests - a.requests);

    return new Response(JSON.stringify({
      configured: true,
      success: true,
      source: "Cloudflare Official GraphQL Billing Analytics",
      timeRange: {
        days,
        start: startDate,
        end: endDate
      },
      officialClassA: totalClassA,
      officialClassB: totalClassB,
      totalRequests,
      totalBytes,
      actionBreakdown: actions
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300"
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({
      configured: true,
      success: false,
      error: e.toString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
