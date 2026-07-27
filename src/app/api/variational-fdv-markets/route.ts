import { NextResponse } from "next/server";

const HEISENBERG_URL = "https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized";
const GAMMA_EVENT_URL = "https://gamma-api.polymarket.com/events/slug/variational-fdv-above-one-day-after-launch";
const EVENT_SLUG = "variational-fdv-above-one-day-after-launch";
const MAX_FDV = 2_000_000_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

type FdvMarket = {
  conditionId: string;
  question: string;
  slug: string;
  fdv: number;
  volumeTotal: number;
  yesChance: number | null;
  source: "gamma" | "heisenberg";
  url: string;
};

type CacheEntry = {
  expiresAt: number;
  payload: {
    eventSlug: string;
    source: string;
    markets: FdvMarket[];
    updatedAt: string;
    cacheTtlSeconds: number;
  };
};

type HeisenbergMarket = {
  condition_id: string;
  question: string;
  slug: string;
  volume_total: number;
  side_a_token_id: string;
  side_a_outcome: string;
  closed: boolean;
};

type HeisenbergTrade = {
  outcome: string;
  price: number;
  timestamp: string;
};

type GammaMarket = {
  conditionId?: string;
  question?: string;
  slug?: string;
  volume?: string | number;
  volumeNum?: number;
  outcomePrices?: string | string[];
  outcomes?: string | string[];
  closed?: boolean;
};

let cache: CacheEntry | null = null;

function parseFdvFromQuestion(question: string) {
  const match = question.match(/\$(\d+(?:\.\d+)?)([MB])\b/i);
  if (!match) return null;

  const value = Number(match[1]);
  const multiplier = match[2].toUpperCase() === "B" ? 1_000_000_000 : 1_000_000;

  return Number.isFinite(value) ? value * multiplier : null;
}

function parseJsonArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeChance(value: unknown) {
  const chance = Number(value);
  if (!Number.isFinite(chance)) return null;
  if (chance > 1) return chance / 100;
  return chance;
}

function marketUrl(slug: string) {
  return `https://polymarket.com/event/${EVENT_SLUG}?tid=${slug}`;
}

function sortAndFilterMarkets(markets: FdvMarket[]) {
  return markets
    .filter((market) => market.fdv <= MAX_FDV)
    .sort((a, b) => a.fdv - b.fdv);
}

async function fetchGammaMarkets() {
  const response = await fetch(GAMMA_EVENT_URL, {
    next: {
      revalidate: 300,
    },
  });

  if (!response.ok) throw new Error("gamma-fetch-failed");

  const event = await response.json();
  const markets = (event?.markets ?? []) as GammaMarket[];

  const normalized: FdvMarket[] = [];

  for (const market of markets) {
    const question = market.question ?? "";
    const fdv = parseFdvFromQuestion(question);
    const outcomes = parseJsonArray(market.outcomes);
    const outcomePrices = parseJsonArray(market.outcomePrices);
    const yesIndex = outcomes.findIndex((outcome) => String(outcome).toLowerCase() === "yes");
    const yesChance = normalizeChance(outcomePrices[yesIndex >= 0 ? yesIndex : 0]);

    if (!fdv || !market.slug || !question) continue;

    normalized.push({
      conditionId: market.conditionId ?? "",
      question,
      slug: market.slug,
      fdv,
      volumeTotal: Number(market.volumeNum ?? market.volume) || 0,
      yesChance,
      source: "gamma",
      url: marketUrl(market.slug),
    });
  }

  return sortAndFilterMarkets(normalized);
}

async function fetchHeisenbergMarkets() {
  const token = process.env.HEISENBERG_API_TOKEN;
  if (!token) return [];

  const response = await fetch(HEISENBERG_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: 574,
      params: {
        event_slug: EVENT_SLUG,
        closed: "False",
      },
      pagination: {
        limit: 50,
        offset: 0,
      },
      formatter_config: {
        format_type: "raw",
      },
    }),
    next: {
      revalidate: 300,
    },
  });

  if (!response.ok) throw new Error("heisenberg-fetch-failed");

  const payload = await response.json();
  const results = (payload?.data?.results ?? []) as HeisenbergMarket[];

  const normalized: FdvMarket[] = [];

  for (const market of results) {
    const fdv = parseFdvFromQuestion(market.question);
    if (!fdv) continue;

    normalized.push({
      conditionId: market.condition_id,
      question: market.question,
      slug: market.slug,
      fdv,
      volumeTotal: Number(market.volume_total) || 0,
      yesChance: null,
      source: "heisenberg",
      url: marketUrl(market.slug),
    });
  }

  const withOdds = await Promise.all(
    normalized.map(async (market) => ({
      ...market,
      yesChance: await fetchLatestYesChance(market.slug),
    })),
  );

  return sortAndFilterMarkets(withOdds);
}

async function fetchLatestYesChance(marketSlug: string) {
  const token = process.env.HEISENBERG_API_TOKEN;
  if (!token) return null;

  const response = await fetch(HEISENBERG_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: 556,
      params: {
        proxy_wallet: "ALL",
        condition_id: "ALL",
        market_slug: marketSlug,
      },
      pagination: {
        limit: 10,
        offset: 0,
      },
      formatter_config: {
        format_type: "raw",
      },
    }),
    next: {
      revalidate: 300,
    },
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = await response.json();
  const trades = (payload?.data?.results ?? []) as HeisenbergTrade[];
  const latestTrade = trades
    .filter((trade) => Number.isFinite(Number(trade.price)))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (!latestTrade) return null;

  const price = normalizeChance(latestTrade.price);
  if (price === null) return null;

  return latestTrade.outcome.toLowerCase() === "no" ? 1 - price : price;
}

async function loadMarkets() {
  const gammaMarkets = await fetchGammaMarkets().catch(() => []);
  if (gammaMarkets.length > 0) return gammaMarkets;

  return fetchHeisenbergMarkets();
}

export async function GET() {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    return NextResponse.json({
      ...cache.payload,
      cache: "HIT",
    });
  }

  const markets = await loadMarkets();
  const source = markets.some((market) => market.source === "gamma") ? "polymarket-gamma" : "heisenberg";

  if (markets.length === 0) {
    return NextResponse.json(
      { error: "No FDV markets available" },
      { status: 502 },
    );
  }

  const payload = {
    eventSlug: EVENT_SLUG,
    source,
    markets,
    updatedAt: new Date(now).toISOString(),
    cacheTtlSeconds: CACHE_TTL_MS / 1000,
  };

  cache = {
    expiresAt: now + CACHE_TTL_MS,
    payload,
  };

  return NextResponse.json({
    ...payload,
    cache: "MISS",
  });
}
