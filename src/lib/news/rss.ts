import type { Direction, NewsItem } from "@/lib/types";
import { clamp } from "@/lib/utils";

const feeds = [
  { source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse" },
  { source: "FXStreet", url: "https://www.fxstreet.com/rss/news" },
  { source: "ForexLive", url: "https://www.forexlive.com/feed/news" },
  { source: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml" }
];

const bullishTerms = [
  "gold rises",
  "gold gains",
  "safe haven",
  "geopolitical",
  "inflation",
  "dollar weak",
  "fed cut",
  "yields fall",
  "risk off"
];

const bearishTerms = [
  "gold falls",
  "gold slips",
  "dollar strong",
  "yields rise",
  "fed hike",
  "hawkish",
  "risk on",
  "disinflation"
];

function decodeXml(value: string) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function extractTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function classifyTitle(title: string): Direction {
  const normalized = title.toLowerCase();
  const bullish = bullishTerms.some((term) => normalized.includes(term));
  const bearish = bearishTerms.some((term) => normalized.includes(term));

  if (bullish && !bearish) {
    return "bullish";
  }
  if (bearish && !bullish) {
    return "bearish";
  }
  return "neutral";
}

async function fetchFeed(source: string, url: string): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/rss+xml,application/xml,text/xml,*/*",
        "user-agent": "gold-ai-analyst/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const rawItems = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

    return rawItems.slice(0, 8).map((item) => {
      const title = extractTag(item, "title");
      return {
        title,
        source,
        url: extractTag(item, "link"),
        publishedAt: extractTag(item, "pubDate"),
        sentiment: classifyTitle(title)
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNewsSentiment() {
  const results = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed.source, feed.url)));
  const items = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => item.title)
    .slice(0, 16);
  const bullish = items.filter((item) => item.sentiment === "bullish").length;
  const bearish = items.filter((item) => item.sentiment === "bearish").length;
  const rawScore = 50 + (bullish - bearish) * 8;
  const score = clamp(rawScore, 0, 100);
  const sentiment: Direction = score > 56 ? "bullish" : score < 44 ? "bearish" : "neutral";

  return {
    score,
    sentiment,
    items
  };
}
