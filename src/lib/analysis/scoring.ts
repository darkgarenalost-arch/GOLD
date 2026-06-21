import type { CorrelationPoint, Direction, IndicatorSet, MarketStructure, NewsItem, ScoreBreakdown } from "@/lib/types";
import { clamp } from "@/lib/utils";

function directionalScore(direction: Direction, target: Direction) {
  if (direction === "neutral") {
    return 50;
  }
  return direction === target ? 85 : 20;
}

export function calculateBiasScore(input: {
  price: number;
  indicators: IndicatorSet;
  structure: MarketStructure;
  news: { score: number; sentiment: Direction; items: NewsItem[] };
  fundamentals: { score: number; bias: Direction; drivers: string[] };
  correlations: CorrelationPoint[];
}) {
  const target: Direction =
    input.structure.trend !== "neutral"
      ? input.structure.trend
      : input.indicators.ema20 > input.indicators.ema50
        ? "bullish"
        : "bearish";

  const trend = directionalScore(input.structure.trend, target);
  const structure = clamp(
    50 +
      (input.structure.bos ? 18 : 0) -
      (input.structure.choch ? 14 : 0) +
      (input.structure.liquiditySweep ? 8 : 0) +
      (input.structure.fairValueGap ? 6 : 0) -
      (input.structure.rangeBound ? 8 : 0),
    0,
    100
  );
  const indicatorVotes = [
    input.price > input.indicators.ema20,
    input.indicators.ema20 > input.indicators.ema50,
    input.indicators.macd.histogram > 0,
    input.indicators.rsi14 > 50 && input.indicators.rsi14 < 72,
    input.indicators.adx14 > 18
  ];
  const bullishIndicatorScore = (indicatorVotes.filter(Boolean).length / indicatorVotes.length) * 100;
  const indicators = target === "bullish" ? bullishIndicatorScore : 100 - bullishIndicatorScore;
  const volatility = clamp(45 + input.indicators.adx14 + (input.structure.rangeBound ? -12 : 6), 0, 100);
  const breakdown: ScoreBreakdown = {
    trend,
    structure,
    indicators,
    fundamentals: target === "bullish" ? input.fundamentals.score : 100 - input.fundamentals.score,
    news: target === "bullish" ? input.news.score : 100 - input.news.score,
    volatility
  };
  const total =
    breakdown.trend * 0.2 +
    breakdown.structure * 0.2 +
    breakdown.indicators * 0.15 +
    breakdown.fundamentals * 0.2 +
    breakdown.news * 0.15 +
    breakdown.volatility * 0.1;
  const bias: Direction = total > 57 ? target : total < 43 ? (target === "bullish" ? "bearish" : "bullish") : "neutral";

  return {
    total: Math.round(clamp(total, 0, 100)),
    bias,
    confidence: Math.round(clamp(Math.abs(total - 50) * 2, 0, 100)),
    breakdown
  };
}
