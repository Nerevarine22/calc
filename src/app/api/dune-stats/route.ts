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
    { rank: 1, address: "0x71C2d...8E3b", points: 85200, tier: "Gold" },
    { rank: 2, address: "0x192d2...b6Cc", points: 74100, tier: "Gold" },
    { rank: 3, address: "0xf39fd...2583", points: 62800, tier: "Silver" },
    { rank: 4, address: "0x90F8b...d185", points: 51350, tier: "Silver" },
    { rank: 5, address: "0x3C441...371b", points: 44200, tier: "Bronze" }
  ],
  updatedAt: new Date().toISOString(),
  source: "fallback"
};

export async function GET(request: Request) {
  try {
    const urlObj = new URL(request.url);
    const searchAddress = urlObj.searchParams.get("address")?.toLowerCase();

    let cachedData: any = null;

    // 1. Attempt to read from file cache
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        
        // If cache is fresh, check it
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          cachedData = parsed.data;
        }
      } catch (err) {
        console.error("Dune cache read error:", err);
      }
    }

    // 2. Fetch fresh data from Dune API if cache is missing
    if (!cachedData) {
      try {
        console.log(`Calling Dune API for query ID: ${QUERY_ID}...`);
        const dune = new DuneClient(DUNE_API_KEY);
        const result = await dune.getLatestResult({ queryId: QUERY_ID });

        if (result && result.result?.rows) {
          const rows = result.result.rows;
          
          cachedData = {
            queryId: QUERY_ID,
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
            // Keep full rows for direct address lookup
            allRows: rows.map((row: any, index: number) => ({
              rank: Number(row.rank ?? index + 1),
              address: String(row.address ?? row.user ?? "").toLowerCase(),
              points: Number(row.points ?? row.score ?? 0),
              tier: String(row.tier ?? (row.points > 75000 ? "Gold" : row.points > 25000 ? "Silver" : "Bronze"))
            })),
            updatedAt: new Date().toISOString(),
            source: "dune"
          };

          // Save to file cache
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

    // Use fallback data if still no data
    if (!cachedData) {
      cachedData = {
        ...fallbackStats,
        allRows: fallbackStats.leaderboard.map(u => ({ ...u, address: u.address.toLowerCase() }))
      };
    }

    // 3. Handle optional address lookup
    if (searchAddress) {
      const match = cachedData.allRows?.find(
        (row: any) => row.address === searchAddress || row.address.includes(searchAddress)
      );

      if (match) {
        return NextResponse.json({
          found: true,
          rank: match.rank,
          address: match.address,
          points: match.points,
          tier: match.tier
        });
      } else {
        return NextResponse.json({
          found: false,
          message: "Address not found in Dune snapshot"
        });
      }
    }

    // Return general statistics (omitting the large allRows array to save bandwidth)
    const { allRows, ...summaryData } = cachedData;
    return NextResponse.json({ ...summaryData, cacheStatus: "ok" });
  } catch (error: any) {
    console.error("Dune API route general error:", error);
    return NextResponse.json({ error: "dune-fetch-error", details: error.message }, { status: 500 });
  }
}
