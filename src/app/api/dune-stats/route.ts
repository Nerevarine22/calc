import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DuneClient } from "@duneanalytics/client-sdk";

const CACHE_FILE = path.join(process.cwd(), "dune-cache.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DUNE_API_KEY = "llQ8YcWqCIuC7qU4kqFZCKQBE9SXrlAB";
const QUERY_ID = 5749530;

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
        console.log(`Calling Dune API for query ID: ${QUERY_ID}...`);
        const dune = new DuneClient(DUNE_API_KEY);
        const result = await dune.getLatestResult({ queryId: QUERY_ID });

        if (result && result.result?.rows) {
          const rows = result.result.rows;
          
          cachedData = {
            queryId: QUERY_ID,
            duneActive: true,
            totalUsers: Number(rows[0]?.total_users ?? rows[0]?.users_count ?? 0),
            totalPoints: Number(rows[0]?.total_points ?? rows[0]?.sum_points ?? 0),
            averagePoints: Number(rows[0]?.avg_points ?? rows[0]?.average_points ?? 0),
            leaderboard: rows.slice(0, 10).map((row: any, index: number) => ({
              rank: Number(row.rank ?? index + 1),
              address: String(row.address ?? row.user ?? "").toLowerCase(),
              points: Number(row.points ?? row.score ?? 0),
              tier: String(row.tier ?? (row.points > 75000 ? "Gold" : row.points > 25000 ? "Silver" : "Bronze"))
            })),
            allRows: rows.map((row: any, index: number) => ({
              rank: Number(row.rank ?? index + 1),
              address: String(row.address ?? row.user ?? "").toLowerCase(),
              points: Number(row.points ?? row.score ?? 0),
              tier: String(row.tier ?? (row.points > 75000 ? "Gold" : row.points > 25000 ? "Silver" : "Bronze"))
            })),
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

    // If still no cachedData (fetch failed and no cache is present), return duneActive: false
    if (!cachedData) {
      return NextResponse.json({
        duneActive: false,
        queryId: QUERY_ID,
        message: "Dune query is private or inaccessible. Please set query to Public."
      });
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

    const { allRows, ...summaryData } = cachedData;
    return NextResponse.json({ ...summaryData, cacheStatus: "ok" });
  } catch (error: any) {
    console.error("Dune API route general error:", error);
    return NextResponse.json({ error: "dune-fetch-error", details: error.message }, { status: 500 });
  }
}
