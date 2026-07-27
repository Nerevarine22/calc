import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DuneClient } from "@duneanalytics/client-sdk";

const CACHE_FILE = path.join(process.cwd(), "dune-cache.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DUNE_API_KEY = "llQ8YcWqCIuC7qU4kqFZCKQBE9SXrlAB";
const QUERY_ID = 6548904; // Live Variational Protocol activity query

export async function GET(request: Request) {
  try {
    const urlObj = new URL(request.url);
    const searchAddress = urlObj.searchParams.get("address")?.toLowerCase();

    let cachedData: any = null;

    // 1. Check file cache
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          cachedData = parsed.data;
        }
      } catch (err) {
        console.error("Dune cache read error:", err);
      }
    }

    // 2. Fetch fresh data from Dune
    if (!cachedData) {
      try {
        console.log(`Calling Dune API for protocol stats query ID: ${QUERY_ID}...`);
        const dune = new DuneClient(DUNE_API_KEY);
        const result = await dune.getLatestResult({ queryId: QUERY_ID });

        if (result && result.result?.rows && result.result.rows.length > 0) {
          const row = result.result.rows[0];
          
          cachedData = {
            queryId: QUERY_ID,
            duneActive: true,
            totalVolume24h: Number(row.total_volume_24h ?? 0),
            totalOpenInterest: Number(row.total_open_interest ?? 0),
            activeMarkets: Number(row.active_markets ?? row.total_markets ?? 0),
            avgFundingRatePct: Number(row.avg_funding_rate_pct ?? 0),
            updatedAt: new Date().toISOString(),
            source: "dune"
          };

          const cacheEntry = {
            expiresAt: Date.now() + CACHE_TTL_MS,
            data: cachedData
          };
          fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheEntry, null, 2), "utf-8");
        }
      } catch (duneError: any) {
        console.error("Dune Analytics fetch failed:", duneError.message || duneError);
      }
    }

    // If fetch failed and no cache is present, return duneActive: false
    if (!cachedData) {
      return NextResponse.json({
        duneActive: false,
        queryId: QUERY_ID,
        message: "Dune query failed or is currently executing. Please try again."
      });
    }

    // Since query 6548904 doesn't have address rows, lookups always return not found for now
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
