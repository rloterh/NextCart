import { NextResponse } from "next/server";

function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestTrace(request: Request) {
  const incomingId = request.headers.get("x-request-id");
  const requestId = incomingId?.trim() || createRequestId();

  return {
    requestId,
    startedAt: new Date().toISOString(),
    method: request.method,
    pathname: new URL(request.url).pathname,
  };
}

export function jsonWithTrace<T>(trace: { requestId: string }, body: T, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("x-request-id", trace.requestId);
  return response;
}

export function logPlatformEvent({
  level,
  message,
  trace,
  detail,
}: {
  level: "info" | "warn" | "error";
  message: string;
  trace: { requestId: string; method?: string; pathname?: string };
  detail?: unknown;
}) {
  const payload = {
    level,
    message,
    requestId: trace.requestId,
    method: trace.method,
    pathname: trace.pathname,
    detail,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
