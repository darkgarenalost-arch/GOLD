import { sendTradeAlerts } from "@/lib/alerts/notifiers";
import { getEnv } from "@/lib/env";
import { scoreFundamentals } from "@/lib/analysis/fundamentals";
import { calculateBiasScore } from "@/lib/analysis/scoring";
import { buildTradeSetup } from "@/lib/analysis/trade-setup";
import { getCorrelations, getGoldMarketSnapshot } from "@/lib/market/data-sources";
import { getNewsSentiment } from "@/lib/news/rss";
import { calculateIndicators, detectMarketStructure } from "@/lib/technical/indicators";
import type { AnalysisReport } from "@/lib/types";
import { formatUsd, round } from "@/lib/utils";

export async function runFullAnalysis(options: { sendAlerts?: boolean } = {}): Promise<AnalysisReport> {
  const env = getEnv();
  const warnings: string[] = [];
  const [market, correlations, news] = await Promise.all([
    getGoldMarketSnapshot(),
    getCorrelations().catch((error) => {
      warnings.push(`Correlation fetch degraded: ${String(error)}`);
      return [];
    }),
    getNewsSentiment().catch((error) => {
      warnings.push(`News fetch degraded: ${String(error)}`);
      return { score: 50, sentiment: "neutral" as const, items: [] };
    })
  ]);
  const indicators = calculateIndicators(market.candles);
  const structure = detectMarketStructure(market.candles, indicators);
  const fundamentals = scoreFundamentals(correlations);
  const score = calculateBiasScore({
    price: market.price,
    indicators,
    structure,
    news,
    fundamentals,
    correlations
  });
  const tradeSetup = buildTradeSetup({
    price: market.price,
    indicators,
    structure,
    score,
    minScore: env.ALERT_MIN_SCORE
  });
  const report: AnalysisReport = {
    generatedAt: new Date().toISOString(),
    market,
    indicators,
    structure,
    news,
    fundamentals,
    correlations,
    score,
    tradeSetup,
    report: [
      `Current bias: ${score.bias.toUpperCase()} with ${score.total}/100 confluence.`,
      `Gold trades near ${formatUsd(market.price)} (${round(market.changePercent, 2)}%).`,
      `Trend is ${structure.trend}; structure ${structure.bos ? "confirms BOS" : "has no fresh BOS"} and ${
        structure.liquiditySweep ? "shows a liquidity sweep" : "shows no immediate sweep"
      }.`,
      `Fundamental proxy bias is ${fundamentals.bias}; news sentiment is ${news.sentiment}.`,
      tradeSetup
        ? `Actionable setup: ${tradeSetup.direction} from ${tradeSetup.entry}, SL ${tradeSetup.stopLoss}, TP2 ${tradeSetup.takeProfit2}.`
        : "Recommendation: wait for stronger confluence before alerting."
    ].join(" "),
    health: {
      status: warnings.length > 0 ? "degraded" : "ok",
      warnings,
      dataProvider: market.provider
    },
    performance: {
      trackedSignals: 0,
      winRate: 0,
      profitFactor: 0,
      averageRiskReward: tradeSetup?.riskReward ?? 0,
      maxDrawdown: 0
    }
  };

  if (options.sendAlerts && tradeSetup) {
    const alertResult = await sendTradeAlerts(report);
    if (alertResult.errors.length > 0) {
      report.health.warnings.push(...alertResult.errors);
      report.health.status = "degraded";
    }
  }

  return report;
}
