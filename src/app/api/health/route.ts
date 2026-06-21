import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "gold-ai-analyst",
    runtime: "edge",
    checkedAt: new Date().toISOString()
  });
}
