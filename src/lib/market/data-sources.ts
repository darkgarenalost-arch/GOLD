import type { Candle, CorrelationPoint, MarketSnapshot } from "@/lib/types";

const REQUEST_TIMEOUT_MS = 8000;

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        symbol?: string;
      };
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: unknown;
  };
};

const correlationSymbols = [
  { symbol: "DX-Y.NYB", label: "DXY", inverse: true, note: "Dollar strength usually pressures gold." },
  { symbol: "^TNX", label: "US10Y", inverse: true, note: "Higher real/yield pressure is usually bearish gold." },
  { symbol: "^IRX", label: "US02Y proxy", inverse: true, note: "Front-end yield pressure can reduce gold appeal." },
  { symbol: "SPY", label: "S&P 500", inverse: false, note: "Risk appetite can dilute safe-haven demand." },
  { symbol: "QQQ", label: "Nasdaq", inverse: false, note: "Growth risk appetite can compete with defensive flows." },
  { symbol: "CL=F", label: "Crude Oil", inverse: false, note: "Energy inflation can support hard assets." },
  { symbol: "SI=F", label: "Silver", inverse: false, note: "Precious metals confirmation." }
];

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "gold-ai-analyst/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/csv,text/plain,*/*",
        "user-agent": "gold-ai-analyst/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function candlesFromYahoo(payload: YahooChartResponse, symbol: string): Candle[] {
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];

  if (!quote || timestamps.length === 0) {
    return [];
  }

  return timestamps
    .map((time, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index] ?? 0;

      if (open == null || high == null || low == null || close == null) {
        return null;
      }

      return {
        time: new Date(time * 1000).toISOString(),
        open,
        high,
        low,
        close,
        volume: volume ?? 0
      };
    })
    .filter((candle): candle is Candle => Boolean(candle));
}

async function fetchYahooCandles(symbol: string, interval = "5m", range = "5d"): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${interval}&range=${range}&includePrePost=false`;
  const payload = await fetchJson<YahooChartResponse>(url);
  const candles = candlesFromYahoo(payload, symbol);

  if (candles.length < 20) {
    throw new Error(`Yahoo returned insufficient candles for ${symbol}`);
  }

  return candles;
}

async function fetchStooqDaily(symbol: string): Promise<Candle[]> {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  const csv = await fetchText(url);
  const rows = csv.trim().split("\n").slice(1);
  const candles = rows
    .map((row) => {
      const [date, open, high, low, close, volume] = row.split(",");
      return {
        time: new Date(`${date}T00:00:00.000Z`).toISOString(),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume) || 0
      };
    })
    .filter((candle) => Number.isFinite(candle.close));

  if (candles.length < 20) {
    throw new Error(`Stooq returned insufficient candles for ${symbol}`);
  }

  return candles.slice(-300);
}

export async function getGoldMarketSnapshot(): Promise<MarketSnapshot> {
  const attempts: Array<() => Promise<{ candles: Candle[]; provider: string; symbol: string }>> = [
    async () => ({ candles: await fetchYahooCandles("XAUUSD=X"), provider: "Yahoo Finance XAUUSD", symbol: "XAUUSD" }),
    async () => ({ candles: await fetchYahooCandles("GC=F"), provider: "Yahoo Finance Gold Futures", symbol: "GC=F" }),
    async () => ({ candles: await fetchStooqDaily("xauusd"), provider: "Stooq XAUUSD daily", symbol: "XAUUSD" })
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      const last = result.candles.at(-1);
      const previous = result.candles.at(-2);

      if (!last || !previous) {
        throw new Error("Missing latest candles");
      }

      const change = last.close - previous.close;
      const changePercent = (change / previous.close) * 100;

      return {
        symbol: result.symbol,
        provider: result.provider,
        fetchedAt: new Date().toISOString(),
        price: last.close,
        previousClose: previous.close,
        change,
        changePercent,
        candles: result.candles
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Unable to fetch gold market data: ${String(lastError)}`);
}

export async function getCorrelations(): Promise<CorrelationPoint[]> {
  const results = await Promise.allSettled(
    correlationSymbols.map(async (item) => {
      const candles = await fetchYahooCandles(item.symbol, "1d", "1mo");
      const last = candles.at(-1);
      const previous = candles.at(-2);

      if (!last || !previous) {
        throw new Error(`Missing ${item.label}`);
      }

      const changePercent = ((last.close - previous.close) / previous.close) * 100;
      const goldImpact = Math.abs(changePercent) < 0.1 ? "neutral" : item.inverse === changePercent > 0 ? "bearish" : "bullish";

      return {
        symbol: item.symbol,
        label: item.label,
        price: last.close,
        changePercent,
        goldImpact,
        note: item.note
      } satisfies CorrelationPoint;
    })
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
