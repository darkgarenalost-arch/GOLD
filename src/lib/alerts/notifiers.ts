import { getEnv } from "@/lib/env";
import type { AnalysisReport, TradeSetup } from "@/lib/types";

function alertBody(report: AnalysisReport, setup: TradeSetup) {
  return [
    `XAUUSD ${setup.direction} SETUP DETECTED`,
    `Entry: ${setup.entry}`,
    `SL: ${setup.stopLoss}`,
    `TP1: ${setup.takeProfit1}`,
    `TP2: ${setup.takeProfit2}`,
    `TP3: ${setup.takeProfit3}`,
    `Confidence: ${setup.confidence}%`,
    `Bias: ${report.score.bias}`,
    "",
    "Reasons:",
    ...setup.reasons.map((reason) => `- ${reason}`)
  ].join("\n");
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Alert webhook failed with HTTP ${response.status}`);
  }
}

export async function sendTradeAlerts(report: AnalysisReport) {
  const env = getEnv();
  const setup = report.tradeSetup;

  if (!setup) {
    return { sent: 0, errors: [] as string[] };
  }

  const body = alertBody(report, setup);
  const tasks: Array<Promise<void>> = [];

  if (env.DISCORD_WEBHOOK_URL) {
    tasks.push(postJson(env.DISCORD_WEBHOOK_URL, { content: body }));
  }

  if (env.SLACK_WEBHOOK_URL) {
    tasks.push(postJson(env.SLACK_WEBHOOK_URL, { text: body }));
  }

  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    tasks.push(
      postJson(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: env.TELEGRAM_CHAT_ID,
        text: body
      })
    );
  }

  if (env.RESEND_API_KEY && env.ALERT_EMAIL_FROM && env.ALERT_EMAIL_TO) {
    tasks.push(
      postJson("https://api.resend.com/emails", {
        from: env.ALERT_EMAIL_FROM,
        to: env.ALERT_EMAIL_TO,
        subject: `Gold AI Analyst: ${setup.direction} ${setup.confidence}%`,
        text: body
      }).catch(async () => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.RESEND_API_KEY}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            from: env.ALERT_EMAIL_FROM,
            to: env.ALERT_EMAIL_TO,
            subject: `Gold AI Analyst: ${setup.direction} ${setup.confidence}%`,
            text: body
          })
        });

        if (!response.ok) {
          throw new Error(`Resend failed with HTTP ${response.status}`);
        }
      })
    );
  }

  const results = await Promise.allSettled(tasks);

  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    errors: results.flatMap((result) => (result.status === "rejected" ? [String(result.reason)] : []))
  };
}
