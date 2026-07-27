import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DuneClient } from "@duneanalytics/client-sdk";

const CACHE_FILE = path.join(process.cwd(), "dune-cache.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours TTL to minimize API credit consumption
const DUNE_API_KEY = "llQ8YcWqCIuC7qU4kqFZCKQBE9SXrlAB";
const QUERY_ID = 5749530;

// High-fidelity fallback statistics matching the Variational Points Simulator
const fallbackStats = {
  queryId: QUERY_ID,
  totalUsers: 142593,
  totalPoints: 9000000,
  averagePoints: 63.11,
  bronzeTierThreshold: 1000,
  silverTierThreshold: 25000,
  goldTierThreshold: 75000,
  leaderboard: [
    { rank: 1, address: "0x71C...8E3b", points: 85200, tier: "Gold" },
    { rank: 2, address: "0x192...b6Cc", points: 74100, tier: "Gold" },
    { rank: 3, address: "0xf39...2583", points: 62800, tier: "Silver" },
    { rank: 4, address: "0x90F...d185", points: 51350, tier: "Silver" },
    { rank: 5, address: "0x3C4...371b", points: 44200, tier: "Bronze" }
  ],
  updatedAt: new Date().toISOString(),
  source: "fallback"
};

export async function GET() {
  try {
    let cachedData: any = null;

    // 1. Attempt to read from file cache
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        
        // If cache is fresh, return it immediately
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return NextResponse.json({ ...parsed.data, cacheStatus: "hit" });
        }
        cachedData = parsed.data; // Save expired data in case fetch fails
      } catch (err) {
        console.error("Dune cache read error:", err);
      }
    }

    // 2. Fetch fresh data from Dune API
    try {
      console.log(`Calling Dune API for query ID: ${QUERY_ID}...`);
      const dune = new DuneClient(DUNE_API_KEY);
      const result = await dune.getLatestResult({ queryId: QUERY_ID });

      if (result && result.result?.rows) {
        const rows = result.result.rows;
        
        // Map the Dune query output. Since Dune columns vary, we map them dynamically
        // or extract aggregated fields if they are returned in a specific structure.
        const mappedData = {
          queryId: QUERY_ID,
          // Extract metrics from rows if available, otherwise use defaults
          totalUsers: Number(rows[0]?.total_users ?? rows[0]?.users_count ?? fallbackStats.totalUsers),
          totalPoints: Number(rows[0]?.total_points ?? rows[0]?.sum_points ?? fallbackStats.totalPoints),
          averagePoints: Number(rows[0]?.avg_points ?? rows[0]?.average_points ?? fallbackStats.averagePoints),
          bronzeTierThreshold: fallbackStats.bronzeTierThreshold,
          silverTierThreshold: fallbackStats.silverTierThreshold,
          goldTierThreshold: fallbackStats.goldTierThreshold,
          leaderboard: rows.slice(0, 10).map((row: any, index: number) => ({
            rank: Number(row.rank ?? index + 1),
            address: String(row.address ?? row.user ?? `0x...${index}`),
            points: Number(row.points ?? row.score ?? 0),
            tier: String(row.tier ?? (row.points > 75000 ? "Gold" : row.points > 25000 ? "Silver" : "Bronze"))
          })),
          updatedAt: new Date().toISOString(),
          source: "dune"
        };

        // Save to file cache
        const cacheEntry = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: mappedData
        };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheEntry, null, 2), "utf-8");

        return NextResponse.json({ ...mappedData, cacheStatus: "miss" });
      }
    } catch (duneError: any) {
      console.error("Dune Analytics fetch failed:", duneError.message || duneError);
      
      // If Dune fetch fails and we have expired cached data, reuse it but extend its expiration slightly
      if (cachedData) {
        console.log("Serving expired cache due to Dune fetch error.");
        return NextResponse.json({ ...cachedData, cacheStatus: "fallback-cache" });
      }
    }

    // 3. Fallback if no cache exists and API fails
    const defaultEntry = {
      expiresAt: Date.now() + CACHE_TTL_MS, // cache the fallback too to prevent spamming
      data: fallbackStats
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(defaultEntry, null, 2), "utf-8");
    
    return NextResponse.json({ ...fallbackStats, cacheStatus: "fallback-default" });
  } catch (error: any) {
    console.error("Dune API route general error:", error);
    return NextResponse.json({ error: "dune-fetch-error", details: error.message }, { status: 500 });
  }
}
