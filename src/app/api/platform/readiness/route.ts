import { getRequestTrace, jsonWithTrace } from "@/lib/platform/observability";
import { getPlatformReadinessPayload } from "@/lib/platform/readiness.server";

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  return jsonWithTrace(trace, getPlatformReadinessPayload());
}
