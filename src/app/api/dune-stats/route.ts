import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DuneClient } from "@duneanalytics/client-sdk";

const CACHE_FILE = path.join(process.cwd(), "dune-cache.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DUNE_API_KEY = "llQ8YcWqCIuC7qU4kqFZCKQBE9SXrlAB";

// Configured queries
const QUERIES = {
  protocolStats: 6548904,  // Active & Public: returns general metrics
  query_6541967: 6541967,  // Private/Pending
  query_6542111: 6542111,  // Private/Pending
  query_6620961: 6620961   // Private/Pending
};

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

    // 2. Fetch fresh data from Dune if cache is empty/stale
    if (!cachedData) {
      try {
        console.log("Fetching fresh data from Dune for queries:", Object.values(QUERIES));
        const dune = new DuneClient(DUNE_API_KEY);

        // Fetch all queries in parallel, handling failures individually to prevent route crash
        const fetchResults = await Promise.all(
          Object.entries(QUERIES).map(async ([key, queryId]) => {
            try {
              const res = await dune.getLatestResult({ queryId });
              if (res && res.result?.rows && res.result.rows.length > 0) {
                return { key, success: true, rows: res.result.rows };
              }
              return { key, success: false, error: "Empty result" };
            } catch (err: any) {
              return { key, success: false, error: err.message || err };
            }
          })
        );

        // Build combined state payload
        const combinedStats: any = {
          duneActive: true,
          updatedAt: new Date().toISOString(),
          queriesStatus: {},
          source: "dune"
        };

        // Parse results from successfully fetched queries
        for (const res of fetchResults) {
          combinedStats.queriesStatus[res.key] = res.success ? "success" : `failed: ${res.error}`;
          
          if (res.success && res.rows) {
            if (res.key === "protocolStats") {
              const row = res.rows[0];
              combinedStats.totalVolume24h = Number(row.total_volume_24h ?? 0);
              combinedStats.totalOpenInterest = Number(row.total_open_interest ?? 0);
              combinedStats.activeMarkets = Number(row.active_markets ?? row.total_markets ?? 0);
              combinedStats.avgFundingRatePct = Number(row.avg_funding_rate_pct ?? 0);
            }
            // Map future queries here once they are made public
            if (res.key === "query_6620961" || res.key === "query_6541967" || res.key === "query_6542111") {
              // Store full rows for these queries for custom rendering / leaderboard lookup
              combinedStats[res.key] = res.rows;
            }
          }
        }

        // Check if we managed to load at least one query (e.g. protocolStats)
        const hasSomeData = fetchResults.some(r => r.success);
        if (hasSomeData) {
          cachedData = combinedStats;
          
          const cacheEntry = {
            expiresAt: Date.now() + CACHE_TTL_MS,
            data: cachedData
          };
          fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheEntry, null, 2), "utf-8");
        }
      } catch (duneError: any) {
        console.error("Dune Analytics fetch execution failed:", duneError.message || duneError);
      }
    }

    // If still no cachedData, return duneActive: false
    if (!cachedData) {
      return NextResponse.json({
        duneActive: false,
        message: "All Dune queries failed to fetch (private or inaccessible)."
      });
    }

    // 3. Handle wallet lookup (in case one of the queries acts as a leaderboard)
    if (searchAddress) {
      // Look inside query_6620961 or query_6541967 if they contain leaderboard rows
      const possibleLeaderboard = cachedData.query_6620961 || cachedData.query_6541967 || cachedData.query_6542111;
      if (Array.isArray(possibleLeaderboard)) {
        const match = possibleLeaderboard.find(
          (row: any) => 
            String(row.address ?? row.user ?? "").toLowerCase() === searchAddress || 
            String(row.address ?? row.user ?? "").toLowerCase().includes(searchAddress)
        );

        if (match) {
          return NextResponse.json({
            found: true,
            rank: Number(match.rank ?? 0),
            address: String(match.address ?? match.user ?? ""),
            points: Number(match.points ?? match.score ?? 0),
            tier: String(match.tier ?? "Bronze")
          });
        }
      }

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
