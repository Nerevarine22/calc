import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DuneClient } from "@duneanalytics/client-sdk";

const CACHE_FILE = path.join(process.cwd(), "dune-cache.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DUNE_API_KEY = "llQ8YcWqCIuC7qU4kqFZCKQBE9SXrlAB";
const QUERY_ID = 6548904;

// Sync/async fetch runner
async function runRevalidation(): Promise<any> {
  try {
    console.log("Fetching Dune data for query:", QUERY_ID);
    const dune = new DuneClient(DUNE_API_KEY);
    const res = await dune.getLatestResult({ queryId: QUERY_ID });

    if (res && res.result?.rows && res.result.rows.length > 0) {
      const row = res.result.rows[0];
      const combinedStats = {
        duneActive: true,
        queryId: QUERY_ID,
        totalVolume24h: Number(row.total_volume_24h ?? 0),
        totalOpenInterest: Number(row.total_open_interest ?? 0),
        activeMarkets: Number(row.active_markets ?? row.total_markets ?? 0),
        avgFundingRatePct: Number(row.avg_funding_rate_pct ?? 0),
        updatedAt: new Date().toISOString(),
        source: "dune"
      };

      const cacheEntry = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: combinedStats
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheEntry, null, 2), "utf-8");
      return combinedStats;
    }
  } catch (err) {
    console.error("Dune query fetch failed:", err);
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const urlObj = new URL(request.url);
    const searchAddress = urlObj.searchParams.get("address")?.toLowerCase();

    let cachedData: any = null;
    let cacheExpired = false;

    // 1. Read existing cache
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        cachedData = parsed.data;
        if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
          cacheExpired = true;
        }
      } catch (err) {
        console.error("Cache read error:", err);
      }
    } else {
      cacheExpired = true;
    }

    // 2. Resolve data (fetching synchronously on first run if missing, else in background)
    if (cacheExpired) {
      if (!cachedData) {
        // Fetch synchronously on first run to avoid empty/fallback mock data
        cachedData = await runRevalidation();
      } else {
        // Fire-and-forget background fetch for subsequent updates
        runRevalidation();
      }
    }

    // If still no data (e.g. Dune is down), return duneActive: false
    if (!cachedData) {
      return NextResponse.json({
        duneActive: false,
        message: "Real-time Dune stats are currently unavailable. No fallback data provided."
      });
    }

    // 3. Address lookup (disabled for protocol query)
    if (searchAddress) {
      return NextResponse.json({
        found: false,
        message: "Wallet search requires a leaderboard snapshot query (pending configuration)"
      });
    }

    return NextResponse.json({ ...cachedData, cacheStatus: "ok" });
  } catch (error: any) {
    console.error("Dune API route general error:", error);
    return NextResponse.json({ error: "dune-fetch-error", details: error.message }, { status: 500 });
  }
}
