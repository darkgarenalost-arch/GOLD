import { NextResponse } from "next/server";
import { runFullAnalysis } from "@/lib/analysis/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 25;

export async function GET() {
  try {
    const report = await runFullAnalysis({ sendAlerts: false });
    return NextResponse.json(report, {
      headers: {
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to generate market analysis.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 503 }
    );
  }
}
