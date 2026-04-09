import { NextResponse } from "next/server";
import { getPlatformReadinessPayload } from "@/lib/platform/readiness.server";

export async function GET() {
  return NextResponse.json(getPlatformReadinessPayload());
}
