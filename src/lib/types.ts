export type Direction = "bullish" | "bearish" | "neutral";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketSnapshot = {
  symbol: string;
  provider: string;
  fetchedAt: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  candles: Candle[];
};

export type IndicatorSet = {
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
  rsi14: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  };
  atr14: number;
  adx14: number;
  stochastic: {
    k: number;
    d: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  vwap: number;
};

export type MarketStructure = {
  trend: Direction;
  primaryTrend: Direction;
  secondaryTrend: Direction;
  intradayTrend: Direction;
  latestSwingHigh: number;
  latestSwingLow: number;
  bos: boolean;
  choch: boolean;
  liquiditySweep: boolean;
  rangeBound: boolean;
  fairValueGap: boolean;
  premiumDiscount: "premium" | "discount" | "equilibrium";
};

export type NewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt?: string;
  sentiment: Direction;
};

export type CorrelationPoint = {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
  goldImpact: Direction;
  note: string;
};

export type ScoreBreakdown = {
  trend: number;
  structure: number;
  indicators: number;
  fundamentals: number;
  news: number;
  volatility: number;
};

export type TradeSetup = {
  id: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward: number;
  confidence: number;
  priority: Priority;
  reasons: string[];
  createdAt: string;
};

export type AnalysisReport = {
  generatedAt: string;
  market: MarketSnapshot;
  indicators: IndicatorSet;
  structure: MarketStructure;
  news: {
    score: number;
    sentiment: Direction;
    items: NewsItem[];
  };
  fundamentals: {
    score: number;
    bias: Direction;
    drivers: string[];
  };
  correlations: CorrelationPoint[];
  score: {
    total: number;
    bias: Direction;
    confidence: number;
    breakdown: ScoreBreakdown;
  };
  tradeSetup: TradeSetup | null;
  report: string;
  health: {
    status: "ok" | "degraded";
    warnings: string[];
    dataProvider: string;
  };
  performance: {
    trackedSignals: number;
    winRate: number;
    profitFactor: number;
    averageRiskReward: number;
    maxDrawdown: number;
  };
};
