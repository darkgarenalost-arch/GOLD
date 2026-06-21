import { NextRequest, NextResponse } from "next/server";
import { runFullAnalysis } from "@/lib/analysis/engine";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

function isAuthorized(request: NextRequest) {
  const env = getEnv();
  const userAgent = request.headers.get("user-agent") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const cronSecretHeader = request.headers.get("x-cron-secret") ?? "";

  if (userAgent.includes("vercel-cron/1.0")) {
    return true;
  }

  if (!env.CRON_SECRET) {
    return true;
  }

  return authorization === `Bearer ${env.CRON_SECRET}` || cronSecretHeader === env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runFullAnalysis({ sendAlerts: true });
    return NextResponse.json({
      ok: true,
      generatedAt: report.generatedAt,
      score: report.score,
      alerted: Boolean(report.tradeSetup),
      health: report.health
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Scheduled analysis failed.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
