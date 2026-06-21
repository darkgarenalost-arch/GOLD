"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Gauge,
  LineChart as LineChartIcon,
  Newspaper,
  RefreshCw,
  Settings,
  ShieldCheck,
  Signal,
  TrendingDown,
  TrendingUp,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Metric, Panel } from "@/components/ui/panel";
import type { AnalysisReport, Direction } from "@/lib/types";
import { cn, formatUsd, pct, round } from "@/lib/utils";

type TabId = "overview" | "live" | "technical" | "fundamentals" | "news" | "correlations" | "signals" | "settings";

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "live", label: "Live Analysis", icon: Activity },
  { id: "technical", label: "Technical", icon: LineChartIcon },
  { id: "fundamentals", label: "Macro", icon: ShieldCheck },
  { id: "news", label: "News", icon: Newspaper },
  { id: "correlations", label: "Correlations", icon: Signal },
  { id: "signals", label: "Signals", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings }
];

function toneForDirection(direction: Direction) {
  if (direction === "bullish") {
    return "green" as const;
  }
  if (direction === "bearish") {
    return "red" as const;
  }
  return "neutral" as const;
}

function ScoreRing({ value }: { value: number }) {
  return (
    <div
      className="grid h-32 w-32 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--gold) ${value * 3.6}deg, rgba(148, 163, 184, 0.22) 0deg)`
      }}
    >
      <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-950">
        <div className="text-center">
          <div className="text-3xl font-black text-white">{value}</div>
          <div className="text-xs font-semibold uppercase text-slate-400">Score</div>
        </div>
      </div>
    </div>
  );
}

function LoadingState({ error, onRefresh }: { error: string | null; onRefresh: () => void }) {
  return (
    <main className="gold-grid flex min-h-screen items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-xl text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-amber-300/40 bg-amber-300/15">
          {error ? <AlertTriangle className="h-6 w-6 text-red-300" /> : <RefreshCw className="h-6 w-6 animate-spin text-amber-200" />}
        </div>
        <h1 className="mt-5 text-2xl font-black text-white">GOLD AI ANALYST</h1>
        <p className="mt-2 text-sm text-slate-300">
          {error ?? "Fetching market data, technical structure, macro proxies, news, and confluence score."}
        </p>
        {error ? (
          <Button className="mt-5" variant="primary" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        ) : null}
      </Panel>
    </main>
  );
}

export function GoldDashboard() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/market/analysis", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.detail ?? "Analysis endpoint failed.");
      }

      setReport(payload as AnalysisReport);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const priceSeries = useMemo(
    () =>
      report?.market.candles.slice(-90).map((candle) => ({
        time: new Date(candle.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        price: round(candle.close, 2)
      })) ?? [],
    [report]
  );

  const breakdown = useMemo(
    () =>
      report
        ? Object.entries(report.score.breakdown).map(([name, value]) => ({
            name,
            value: round(value)
          }))
        : [],
    [report]
  );

  if (!report) {
    return <LoadingState error={error} onRefresh={refresh} />;
  }

  const biasTone = toneForDirection(report.score.bias);
  const isPositive = report.market.changePercent >= 0;
  const GeneratedIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <main className="gold-grid min-h-screen px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-white sm:text-4xl">GOLD AI ANALYST</h1>
              <Badge tone={report.health.status === "ok" ? "green" : "gold"}>{report.health.status}</Badge>
              <Badge tone={biasTone}>{report.score.bias}</Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              XAUUSD serverless analyst using free public market data, technical confluence, macro proxies, RSS news, and optional alert routing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
              Updated {new Date(report.generatedAt).toLocaleString()}
            </div>
            <Button onClick={refresh} disabled={loading} variant="primary">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-300 transition",
                  activeTab === tab.id ? "bg-amber-300 text-slate-950" : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "overview" ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel className="min-h-[440px]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase text-slate-400">{report.market.symbol}</div>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <div className="text-5xl font-black text-white">{formatUsd(report.market.price)}</div>
                    <Badge tone={isPositive ? "green" : "red"}>
                      <GeneratedIcon className="mr-1 h-3.5 w-3.5" />
                      {pct(report.market.changePercent)}
                    </Badge>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{report.report}</p>
                </div>
                <ScoreRing value={report.score.total} />
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceSeries}>
                    <defs>
                      <linearGradient id="price" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#f2b84b" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#f2b84b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,.18)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 12 }} minTickGap={24} />
                    <YAxis domain={["dataMin", "dataMax"]} tick={{ fill: "#94a3b8", fontSize: 12 }} width={72} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="price" stroke="#f2b84b" fill="url(#price)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Trend" value={report.structure.trend} detail={`${report.structure.primaryTrend} primary`} />
                <Metric label="Sentiment" value={report.news.sentiment} detail={`${round(report.news.score)} news score`} />
                <Metric label="Confidence" value={`${report.score.confidence}%`} detail="Directional conviction" />
                <Metric label="Provider" value={report.market.provider} detail="Live fallback source" />
              </div>
              <Panel>
                <h2 className="text-lg font-bold text-white">Open Opportunity</h2>
                {report.tradeSetup ? (
                  <div className="mt-4 grid gap-3 text-sm text-slate-300">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={report.tradeSetup.direction === "LONG" ? "green" : "red"}>{report.tradeSetup.direction}</Badge>
                      <Badge tone="gold">{report.tradeSetup.priority}</Badge>
                      <span>{report.tradeSetup.confidence}% confidence</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <Metric label="Entry" value={report.tradeSetup.entry} />
                      <Metric label="Stop" value={report.tradeSetup.stopLoss} />
                      <Metric label="TP2" value={report.tradeSetup.takeProfit2} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-400">No alert-grade setup is active. The engine is waiting for score and volatility confluence above the configured threshold.</p>
                )}
              </Panel>
            </div>
          </div>
        ) : null}

        {activeTab === "live" ? (
          <Panel>
            <h2 className="text-xl font-bold text-white">Live Market Report</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">{report.report}</p>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown}>
                  <CartesianGrid stroke="rgba(148,163,184,.18)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#f2b84b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        ) : null}

        {activeTab === "technical" ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              ["EMA 20", report.indicators.ema20],
              ["EMA 50", report.indicators.ema50],
              ["EMA 100", report.indicators.ema100],
              ["EMA 200", report.indicators.ema200],
              ["RSI 14", report.indicators.rsi14],
              ["ADX 14", report.indicators.adx14],
              ["ATR 14", report.indicators.atr14],
              ["VWAP", report.indicators.vwap],
              ["MACD Hist", report.indicators.macd.histogram]
            ].map(([label, value]) => (
              <Metric key={label} label={String(label)} value={round(Number(value), 2)} />
            ))}
          </div>
        ) : null}

        {activeTab === "fundamentals" ? (
          <Panel>
            <h2 className="text-xl font-bold text-white">Fundamental Bias</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge tone={toneForDirection(report.fundamentals.bias)}>{report.fundamentals.bias}</Badge>
              <span className="text-sm text-slate-300">{round(report.fundamentals.score)} / 100 macro proxy score</span>
            </div>
            <ul className="mt-5 grid gap-3">
              {report.fundamentals.drivers.map((driver) => (
                <li key={driver} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                  {driver}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {activeTab === "news" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {report.news.items.length > 0 ? (
              report.news.items.map((item) => (
                <a key={`${item.source}-${item.title}`} href={item.url || "#"} target="_blank" rel="noreferrer">
                  <Panel className="h-full transition hover:border-amber-300/60">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={toneForDirection(item.sentiment)}>{item.sentiment}</Badge>
                      <span className="text-xs text-slate-500">{item.source}</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold leading-6 text-white">{item.title}</h3>
                  </Panel>
                </a>
              ))
            ) : (
              <Panel>
                <p className="text-sm text-slate-400">No RSS items were available during this scan.</p>
              </Panel>
            )}
          </div>
        ) : null}

        {activeTab === "correlations" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {report.correlations.map((item) => (
              <Panel key={item.symbol}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.label}</h3>
                    <p className="mt-1 text-sm text-slate-400">{item.note}</p>
                  </div>
                  <Badge tone={toneForDirection(item.goldImpact)}>{item.goldImpact}</Badge>
                </div>
                <div className="mt-4 text-2xl font-black text-white">{round(item.price, 2)}</div>
                <div className={cn("mt-1 text-sm", item.changePercent >= 0 ? "text-emerald-300" : "text-red-300")}>
                  {pct(item.changePercent)}
                </div>
              </Panel>
            ))}
          </div>
        ) : null}

        {activeTab === "signals" ? (
          <Panel>
            <h2 className="text-xl font-bold text-white">Signal Engine</h2>
            {report.tradeSetup ? (
              <div className="mt-5 grid gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={report.tradeSetup.direction === "LONG" ? "green" : "red"}>{report.tradeSetup.direction}</Badge>
                  <Badge tone="gold">{report.tradeSetup.priority}</Badge>
                  <span className="text-sm text-slate-300">Risk/reward {report.tradeSetup.riskReward}R</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-5">
                  <Metric label="Entry" value={report.tradeSetup.entry} />
                  <Metric label="SL" value={report.tradeSetup.stopLoss} />
                  <Metric label="TP1" value={report.tradeSetup.takeProfit1} />
                  <Metric label="TP2" value={report.tradeSetup.takeProfit2} />
                  <Metric label="TP3" value={report.tradeSetup.takeProfit3} />
                </div>
                <ul className="grid gap-2">
                  {report.tradeSetup.reasons.map((reason) => (
                    <li key={reason} className="flex items-center gap-2 text-sm text-slate-300">
                      <Zap className="h-4 w-4 text-amber-200" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No score above the alert threshold. Current total score is {report.score.total}/100.</p>
            )}
          </Panel>
        ) : null}

        {activeTab === "settings" ? (
          <Panel>
            <h2 className="text-xl font-bold text-white">Deployment Settings</h2>
            <div className="mt-5 grid gap-3 text-sm text-slate-300">
              <p>Alert threshold defaults to 80 and can be changed with `ALERT_MIN_SCORE` in Vercel Environment Variables.</p>
              <p>Optional channels: Resend email, Telegram, Discord, and Slack. Missing alert variables are ignored at runtime.</p>
              <p>Vercel cron is configured daily for Hobby compatibility. Use an external cron or a paid Vercel plan for minute-level scans.</p>
              <p>Health endpoint: `/api/health`. Analysis endpoint: `/api/market/analysis`. Cron endpoint: `/api/cron/analyze`.</p>
            </div>
          </Panel>
        ) : null}

        {report.health.warnings.length > 0 ? (
          <Panel className="border-amber-300/40 bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-200" />
              <div>
                <h2 className="font-bold text-amber-100">Degraded Sources</h2>
                <ul className="mt-2 grid gap-1 text-sm text-amber-100/80">
                  {report.health.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        ) : null}
      </div>
    </main>
  );
}
