import { describe, expect, it } from "vitest";
import { calculateBiasScore } from "@/lib/analysis/scoring";
import type { IndicatorSet, MarketStructure } from "@/lib/types";

const indicators: IndicatorSet = {
  ema20: 2410,
  ema50: 2390,
  ema100: 2360,
  ema200: 2300,
  rsi14: 61,
  macd: { line: 12, signal: 8, histogram: 4 },
  atr14: 14,
  adx14: 28,
  stochastic: { k: 62, d: 60 },
  bollinger: { upper: 2435, middle: 2400, lower: 2365 },
  vwap: 2395
};

const structure: MarketStructure = {
  trend: "bullish",
  primaryTrend: "bullish",
  secondaryTrend: "bullish",
  intradayTrend: "bullish",
  latestSwingHigh: 2420,
  latestSwingLow: 2350,
  bos: true,
  choch: false,
  liquiditySweep: true,
  rangeBound: false,
  fairValueGap: true,
  premiumDiscount: "discount"
};

describe("bias scoring", () => {
  it("scores aligned bullish confluence above alert area", () => {
    const score = calculateBiasScore({
      price: 2415,
      indicators,
      structure,
      news: { score: 70, sentiment: "bullish", items: [] },
      fundamentals: { score: 68, bias: "bullish", drivers: [] },
      correlations: []
    });

    expect(score.bias).toBe("bullish");
    expect(score.total).toBeGreaterThanOrEqual(70);
  });
});
