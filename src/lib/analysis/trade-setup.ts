import type { AnalysisReport, IndicatorSet, MarketStructure, TradeSetup } from "@/lib/types";
import { round } from "@/lib/utils";

export function buildTradeSetup(input: {
  price: number;
  indicators: IndicatorSet;
  structure: MarketStructure;
  score: AnalysisReport["score"];
  minScore: number;
}): TradeSetup | null {
  if (input.score.total < input.minScore || input.score.bias === "neutral") {
    return null;
  }

  const atr = Math.max(input.indicators.atr14, input.price * 0.0015);
  const isLong = input.score.bias === "bullish";
  const entry = input.price;
  const stopLoss = isLong ? entry - atr * 1.2 : entry + atr * 1.2;
  const takeProfit1 = isLong ? entry + atr * 1.4 : entry - atr * 1.4;
  const takeProfit2 = isLong ? entry + atr * 2.3 : entry - atr * 2.3;
  const takeProfit3 = isLong ? entry + atr * 3.2 : entry - atr * 3.2;
  const riskReward = Math.abs((takeProfit2 - entry) / (entry - stopLoss));
  const reasons = [
    `${input.structure.trend.toUpperCase()} multi-timeframe trend`,
    input.structure.bos ? "Break of structure confirmed" : "Structure holding inside current range",
    input.structure.liquiditySweep ? "Liquidity sweep detected near recent swing" : "No immediate sweep risk detected",
    input.indicators.macd.histogram > 0 ? "MACD momentum supports upside" : "MACD momentum supports downside",
    `ATR-based volatility allows ${round(riskReward, 2)}R target`
  ];

  return {
    id: `${Date.now()}-${isLong ? "long" : "short"}`,
    direction: isLong ? "LONG" : "SHORT",
    entry: round(entry),
    stopLoss: round(stopLoss),
    takeProfit1: round(takeProfit1),
    takeProfit2: round(takeProfit2),
    takeProfit3: round(takeProfit3),
    riskReward: round(riskReward, 2),
    confidence: input.score.total,
    priority: input.score.total >= 90 ? "CRITICAL" : input.score.total >= 84 ? "HIGH" : "MEDIUM",
    reasons,
    createdAt: new Date().toISOString()
  };
}
