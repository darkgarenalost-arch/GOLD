import type { CorrelationPoint, Direction } from "@/lib/types";
import { clamp } from "@/lib/utils";

export function scoreFundamentals(correlations: CorrelationPoint[]) {
  const drivers: string[] = [];
  let score = 50;

  for (const correlation of correlations) {
    if (correlation.goldImpact === "bullish") {
      score += correlation.label === "DXY" || correlation.label.includes("US") ? 8 : 4;
      drivers.push(`${correlation.label} supports gold bias`);
    }

    if (correlation.goldImpact === "bearish") {
      score -= correlation.label === "DXY" || correlation.label.includes("US") ? 8 : 4;
      drivers.push(`${correlation.label} pressures gold bias`);
    }
  }

  const bounded = clamp(score, 0, 100);
  const bias: Direction = bounded > 57 ? "bullish" : bounded < 43 ? "bearish" : "neutral";

  if (drivers.length === 0) {
    drivers.push("Macro proxies are mixed; wait for confirmation.");
  }

  return {
    score: bounded,
    bias,
    drivers: drivers.slice(0, 5)
  };
}
