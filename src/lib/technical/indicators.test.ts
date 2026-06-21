import { describe, expect, it } from "vitest";
import { calculateIndicators, detectMarketStructure, ema, rsi } from "@/lib/technical/indicators";
import type { Candle } from "@/lib/types";

function candles(count: number): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 2000 + index * 2;
    return {
      time: new Date(1_700_000_000_000 + index * 60_000).toISOString(),
      open: close - 1,
      high: close + 3,
      low: close - 3,
      close,
      volume: 1000 + index
    };
  });
}

describe("technical indicators", () => {
  it("calculates EMA series without losing length", () => {
    const values = [1, 2, 3, 4, 5];
    expect(ema(values, 3)).toHaveLength(values.length);
  });

  it("returns high RSI for persistent gains", () => {
    const values = Array.from({ length: 30 }, (_, index) => index + 1);
    expect(rsi(values)).toBeGreaterThan(90);
  });

  it("detects bullish structure in rising candles", () => {
    const sample = candles(240);
    const indicators = calculateIndicators(sample);
    const structure = detectMarketStructure(sample, indicators);
    expect(structure.trend).toBe("bullish");
    expect(indicators.ema20).toBeGreaterThan(indicators.ema50);
  });
});
