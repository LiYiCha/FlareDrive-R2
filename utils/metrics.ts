export const METRICS_KEY = "metrics:summary";

export interface MetricsSummary {
  requests: number;
  downloads: number;
  traffic_bytes: number;
  class_a: number;
  class_b: number;
  last_client: { ip: string; country: string; time: number } | null;
  recent_logs: any[];
}

export function emptyMetrics(): MetricsSummary {
  return {
    requests: 0,
    downloads: 0,
    traffic_bytes: 0,
    class_a: 0,
    class_b: 0,
    last_client: null,
    recent_logs: [],
  };
}

async function readLegacyMetrics(kv: any): Promise<MetricsSummary> {
  const [reqsStr, dlStr, trafficStr, classAStr, classBStr, lastClientStr, logsStr] = await Promise.all([
    kv.get("metrics:requests"),
    kv.get("metrics:downloads"),
    kv.get("metrics:traffic_bytes"),
    kv.get("metrics:class_a"),
    kv.get("metrics:class_b"),
    kv.get("metrics:last_client"),
    kv.get("metrics:recent_logs"),
  ]);

  let recentLogs: any[] = [];
  let lastClient = null;
  try {
    if (logsStr) recentLogs = JSON.parse(logsStr);
  } catch (e) {}
  try {
    if (lastClientStr) lastClient = JSON.parse(lastClientStr);
  } catch (e) {}

  return {
    requests: parseInt(reqsStr || "0", 10),
    downloads: parseInt(dlStr || "0", 10),
    traffic_bytes: parseInt(trafficStr || "0", 10),
    class_a: parseInt(classAStr || "0", 10),
    class_b: parseInt(classBStr || "0", 10),
    last_client: lastClient,
    recent_logs: recentLogs,
  };
}

export async function readMetrics(kv: any): Promise<MetricsSummary> {
  const raw = await kv.get(METRICS_KEY);
  if (raw) {
    try {
      return { ...emptyMetrics(), ...JSON.parse(raw) };
    } catch (e) {}
  }
  return await readLegacyMetrics(kv);
}

export function toKvStats(metrics: MetricsSummary) {
  return {
    enabled: true,
    classA: metrics.class_a,
    classB: metrics.class_b,
    totalRequests: metrics.requests,
    totalDownloads: metrics.downloads,
    totalTrafficBytes: metrics.traffic_bytes,
    lastClient: metrics.last_client,
    recentLogs: metrics.recent_logs,
  };
}
