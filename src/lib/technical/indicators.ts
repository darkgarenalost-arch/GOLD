import { average, standardDeviation } from "@/lib/utils";
import type { Candle, Direction, IndicatorSet, MarketStructure } from "@/lib/types";

function last(values: number[], fallback = 0) {
  return values.at(-1) ?? fallback;
}

export function ema(values: number[], period: number): number[] {
  if (values.length === 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const output = [values[0]];

  for (let index = 1; index < values.length; index += 1) {
    output.push((values[index] - output[index - 1]) * multiplier + output[index - 1]);
  }

  return output;
}

export function rsi(values: number[], period = 14): number {
  if (values.length <= period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  if (losses === 0) {
    return 100;
  }

  const relativeStrength = gains / losses;
  return 100 - 100 / (1 + relativeStrength);
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length <= period) {
    return 0;
  }

  const ranges = candles.slice(-period).map((candle, offset) => {
    const previous = candles[candles.length - period + offset - 1] ?? candle;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previous.close),
      Math.abs(candle.low - previous.close)
    );
  });

  return average(ranges);
}

export function adx(candles: Candle[], period = 14): number {
  if (candles.length <= period + 1) {
    return 20;
  }

  const sample = candles.slice(-(period + 1));
  let plusDm = 0;
  let minusDm = 0;
  let trueRange = 0;

  for (let index = 1; index < sample.length; index += 1) {
    const current = sample[index];
    const previous = sample[index - 1];
    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;
    plusDm += upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm += downMove > upMove && downMove > 0 ? downMove : 0;
    trueRange += Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
  }

  if (trueRange === 0) {
    return 20;
  }

  const plusDi = (plusDm / trueRange) * 100;
  const minusDi = (minusDm / trueRange) * 100;
  const denominator = plusDi + minusDi;

  if (denominator === 0) {
    return 20;
  }

  return (Math.abs(plusDi - minusDi) / denominator) * 100;
}

export function stochastic(candles: Candle[], period = 14): { k: number; d: number } {
  if (candles.length < period) {
    return { k: 50, d: 50 };
  }

  const recent = candles.slice(-period);
  const close = candles.at(-1)?.close ?? 0;
  const highest = Math.max(...recent.map((candle) => candle.high));
  const lowest = Math.min(...recent.map((candle) => candle.low));
  const k = highest === lowest ? 50 : ((close - lowest) / (highest - lowest)) * 100;

  return { k, d: k };
}

export function calculateIndicators(candles: Candle[]): IndicatorSet {
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const typicalPrices = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
  const volumeTotal = volumes.reduce((sum, value) => sum + value, 0);
  const vwap =
    volumeTotal > 0
      ? typicalPrices.reduce((sum, price, index) => sum + price * volumes[index], 0) / volumeTotal
      : average(typicalPrices.slice(-30));
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((value, index) => value - (ema26[index] ?? value));
  const macdSignal = ema(macdLine, 9);
  const recent = closes.slice(-20);
  const middle = average(recent);
  const deviation = standardDeviation(recent);

  return {
    ema20: last(ema(closes, 20)),
    ema50: last(ema(closes, 50)),
    ema100: last(ema(closes, 100)),
    ema200: last(ema(closes, 200)),
    rsi14: rsi(closes, 14),
    macd: {
      line: last(macdLine),
      signal: last(macdSignal),
      histogram: last(macdLine) - last(macdSignal)
    },
    atr14: atr(candles, 14),
    adx14: adx(candles, 14),
    stochastic: stochastic(candles, 14),
    bollinger: {
      upper: middle + deviation * 2,
      middle,
      lower: middle - deviation * 2
    },
    vwap
  };
}

function trendFromSlope(shortAverage: number, longAverage: number, price: number): Direction {
  const spread = ((shortAverage - longAverage) / price) * 100;
  if (spread > 0.08) {
    return "bullish";
  }
  if (spread < -0.08) {
    return "bearish";
  }
  return "neutral";
}

export function detectMarketStructure(candles: Candle[], indicators: IndicatorSet): MarketStructure {
  const price = candles.at(-1)?.close ?? 0;
  const recent = candles.slice(-50);
  const prior = candles.slice(-100, -50);
  const latestSwingHigh = Math.max(...recent.map((candle) => candle.high));
  const latestSwingLow = Math.min(...recent.map((candle) => candle.low));
  const priorHigh = prior.length > 0 ? Math.max(...prior.map((candle) => candle.high)) : latestSwingHigh;
  const priorLow = prior.length > 0 ? Math.min(...prior.map((candle) => candle.low)) : latestSwingLow;
  const primaryTrend = trendFromSlope(indicators.ema50, indicators.ema200, price);
  const secondaryTrend = trendFromSlope(indicators.ema20, indicators.ema100, price);
  const intradayTrend = trendFromSlope(indicators.ema20, indicators.ema50, price);
  const bullishVotes = [primaryTrend, secondaryTrend, intradayTrend].filter((trend) => trend === "bullish").length;
  const bearishVotes = [primaryTrend, secondaryTrend, intradayTrend].filter((trend) => trend === "bearish").length;
  const trend = bullishVotes > bearishVotes ? "bullish" : bearishVotes > bullishVotes ? "bearish" : "neutral";
  const rangeSize = latestSwingHigh - latestSwingLow;
  const rangeBound = indicators.atr14 > 0 ? rangeSize / indicators.atr14 < 8 : false;
  const bos = trend === "bullish" ? latestSwingHigh > priorHigh : trend === "bearish" ? latestSwingLow < priorLow : false;
  const choch = trend === "bullish" ? latestSwingLow < priorLow : trend === "bearish" ? latestSwingHigh > priorHigh : false;
  const lastCandle = candles.at(-1);
  const previousCandle = candles.at(-2);
  const liquiditySweep = Boolean(
    lastCandle &&
      previousCandle &&
      ((lastCandle.low < previousCandle.low && lastCandle.close > previousCandle.close) ||
        (lastCandle.high > previousCandle.high && lastCandle.close < previousCandle.close))
  );
  const fairValueGap = candles.slice(-8).some((candle, index, sample) => {
    const previous = sample[index - 1];
    return previous ? candle.low > previous.high || candle.high < previous.low : false;
  });
  const mid = latestSwingLow + rangeSize / 2;

  return {
    trend,
    primaryTrend,
    secondaryTrend,
    intradayTrend,
    latestSwingHigh,
    latestSwingLow,
    bos,
    choch,
    liquiditySweep,
    rangeBound,
    fairValueGap,
    premiumDiscount: Math.abs(price - mid) / Math.max(rangeSize, 1) < 0.1 ? "equilibrium" : price > mid ? "premium" : "discount"
  };
}
