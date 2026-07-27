import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DuneClient } from "@duneanalytics/client-sdk";

const CACHE_FILE = path.join(process.cwd(), "dune-cache.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DUNE_API_KEY = "llQ8YcWqCIuC7qU4kqFZCKQBE9SXrlAB";
const QUERY_ID = 6548904; // The active public query for protocol stats

// Background revalidation function (non-blocking)
async function revalidateCache() {
  try {
    console.log("Starting background Dune revalidation for query:", QUERY_ID);
    const dune = new DuneClient(DUNE_API_KEY);

    // Fetch only the public query
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
      console.log("Dune cache successfully updated.");
    }
  } catch (err) {
    console.error("Background revalidation failed:", err);
  }
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

    // 2. Trigger background update if cache is expired or missing
    if (cacheExpired) {
      revalidateCache(); // Async non-blocking
    }

    // If cache is empty, return static initial metrics for instant page load
    if (!cachedData) {
      const fallbackStats = {
        duneActive: true,
        queryId: QUERY_ID,
        totalVolume24h: 500.29298,
        totalOpenInterest: 678.80877,
        activeMarkets: 439,
        avgFundingRatePct: -5.37512,
        updatedAt: new Date().toISOString(),
        source: "local-first-load"
      };
      return NextResponse.json(fallbackStats);
    }

    // 3. Handle optional address lookup (disabled as there are no leaderboard rows)
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
