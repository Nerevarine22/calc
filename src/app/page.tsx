"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const TOTAL_SUPPLY = 1_000_000_000;
const fdvOptions = [100_000_000, 250_000_000, 500_000_000, 1_000_000_000, 1_500_000_000, 2_000_000_000];
const airdropOptions = [5, 10, 25, 50];

type FdvMarket = {
  conditionId: string;
  question: string;
  slug: string;
  fdv: number;
  volumeTotal: number;
  yesChance: number | null;
  url: string;
};

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 4,
    minimumFractionDigits: value >= 1 ? 2 : 4,
  }).format(value);
}

function parsePositive(value: string, fallback = 0) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fdvLabel(value: number) {
  return value >= 1_000_000_000 ? `$${value / 1_000_000_000}B` : `$${value / 1_000_000}M`;
}

function chanceLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "odds n/a";
  return `${Math.round(value * 100)}% chance`;
}

function PolymarketChance({ value, active = false }: { value: number | null | undefined; active?: boolean }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span className="inline-flex size-3.5 items-center justify-center overflow-visible">
        <Image
          className="size-2.5 opacity-55 grayscale"
          src="/polymarket-vector.png"
          alt=""
          width={10}
          height={10}
          aria-hidden="true"
        />
      </span>
      <span className={active ? "text-white/75" : "text-black/45"}>{chanceLabel(value)}</span>
    </span>
  );
}

export default function Home() {
  const [totalPoints, setTotalPoints] = useState("9000000");
  const [userPoints, setUserPoints] = useState("10000");
  const [airdropPct, setAirdropPct] = useState(10);
  const [fdv, setFdv] = useState(500_000_000);
  const [fdvMarkets, setFdvMarkets] = useState<FdvMarket[]>([]);
  const [marketStatus, setMarketStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let ignore = false;

    async function loadMarkets() {
      try {
        const response = await fetch("/api/variational-fdv-markets");
        if (!response.ok) throw new Error("market-fetch-failed");

        const payload = await response.json();
        const markets = (payload.markets ?? []) as FdvMarket[];

        if (!ignore && markets.length > 0) {
          setFdvMarkets(markets);
          setFdv((currentFdv) =>
            markets.some((market) => market.fdv === currentFdv) ? currentFdv : markets[0].fdv,
          );
          setMarketStatus("ready");
        }
      } catch {
        if (!ignore) setMarketStatus("unavailable");
      }
    }

    loadMarkets();

    return () => {
      ignore = true;
    };
  }, []);

  const activeFdvOptions = fdvMarkets.length > 0 ? fdvMarkets.map((market) => market.fdv) : fdvOptions;
  const selectedMarket = fdvMarkets.find((market) => market.fdv === fdv);

  const results = useMemo(() => {
    const totalNetworkXPoints = parsePositive(totalPoints, 1);
    const yourXPoints = parsePositive(userPoints);
    const airdropSupply = TOTAL_SUPPLY * (airdropPct / 100);
    const tokenPrice = fdv / TOTAL_SUPPLY;
    const share = yourXPoints / totalNetworkXPoints;
    const estimatedTokens = share * airdropSupply;
    const expectedValue = estimatedTokens * tokenPrice;

    return {
      airdropSupply,
      tokenPrice,
      share,
      estimatedTokens,
      expectedValue,
      scenarios: activeFdvOptions.map((scenarioFdv) => ({
        fdv: scenarioFdv,
        tokenPrice: scenarioFdv / TOTAL_SUPPLY,
        value: estimatedTokens * (scenarioFdv / TOTAL_SUPPLY),
      })),
    };
  }, [activeFdvOptions, airdropPct, fdv, totalPoints, userPoints]);

  return (
    <main className="min-h-screen bg-[#f6f5f0] text-[#151515]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#5b6f5a]">
              Variational Points Estimator
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-[#151515] sm:text-6xl">
              Possible airdrop calculator
            </h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-black/60">
            Enter your points and model a possible token allocation from total points,
            airdrop supply percentage, and FDV assumptions.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-black/70">Total Variational points</span>
                <input
                  className="h-12 rounded-md border border-black/15 bg-white px-4 text-base outline-none transition focus:border-[#5b6f5a] focus:ring-4 focus:ring-[#5b6f5a]/15"
                  inputMode="decimal"
                  value={totalPoints}
                  onChange={(event) => setTotalPoints(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-black/70">Your points</span>
                <input
                  className="h-12 rounded-md border border-black/15 bg-white px-4 text-base outline-none transition focus:border-[#5b6f5a] focus:ring-4 focus:ring-[#5b6f5a]/15"
                  inputMode="decimal"
                  value={userPoints}
                  onChange={(event) => setUserPoints(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-black/70">Supply for airdrop</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {airdropOptions.map((option) => (
                    <button
                      key={option}
                      className={`h-11 rounded-md border text-sm font-semibold transition ${
                        option === airdropPct
                          ? "border-[#5b6f5a] bg-[#5b6f5a] text-white"
                          : "border-black/10 bg-[#f6f5f0] text-black/70 hover:border-black/25"
                      }`}
                      onClick={() => setAirdropPct(option)}
                    >
                      {option}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-black/70">FDV scenario</p>
                  <p className="text-xs text-black/45">
                    {marketStatus === "ready"
                      ? "Polymarket odds"
                      : marketStatus === "loading"
                        ? "Loading market"
                        : "Manual fallback"}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {activeFdvOptions.map((option) => (
                    <button
                      key={option}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-md border px-2 text-sm font-semibold transition ${
                        option === fdv
                          ? "border-[#2d595e] bg-[#2d595e] text-white"
                          : "border-black/10 bg-[#f6f5f0] text-black/70 hover:border-black/25"
                      }`}
                      onClick={() => setFdv(option)}
                    >
                      <span>{fdvLabel(option)}</span>
                      <span className="mt-0.5 text-[11px] font-medium">
                        <PolymarketChance
                          value={fdvMarkets.find((market) => market.fdv === option)?.yesChance}
                          active={option === fdv}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedMarket ? (
              <a
                className="mt-5 block rounded-lg border border-[#2d595e]/20 bg-[#eef4f5] p-4 text-sm transition hover:border-[#2d595e]/40"
                href={selectedMarket.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="font-semibold text-[#2d595e]">Linked Polymarket market</span>
                <span className="mt-1 block text-black/70">{selectedMarket.question}</span>
                <span className="mt-2 block text-xs text-black/50">
                  Polymarket chance: <PolymarketChance value={selectedMarket.yesChance} /> - Volume: {formatUsd(selectedMarket.volumeTotal)}
                </span>
              </a>
            ) : null}

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#eff3ea] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-black/50">Pool share</p>
                <p className="mt-2 text-2xl font-semibold">{(results.share * 100).toFixed(6)}%</p>
              </div>
              <div className="rounded-lg bg-[#eef4f5] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-black/50">Tokens</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(results.estimatedTokens, 2)}</p>
              </div>
              <div className="rounded-lg bg-[#f6eddc] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-black/50">Value</p>
                <p className="mt-2 text-2xl font-semibold">{formatUsd(results.expectedValue)}</p>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-lg border border-black/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#151515] text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">FDV</th>
                    <th className="px-4 py-3 font-medium">Chance</th>
                    <th className="px-4 py-3 font-medium">Token price</th>
                    <th className="px-4 py-3 font-medium">Your value</th>
                  </tr>
                </thead>
                <tbody>
                  {results.scenarios.map((scenario) => (
                    <tr key={scenario.fdv} className={scenario.fdv === fdv ? "bg-[#f6eddc]" : "bg-white"}>
                      <td className="border-t border-black/10 px-4 py-3 font-medium">{fdvLabel(scenario.fdv)}</td>
                      <td className="border-t border-black/10 px-4 py-3">
                        <PolymarketChance value={fdvMarkets.find((market) => market.fdv === scenario.fdv)?.yesChance} />
                      </td>
                      <td className="border-t border-black/10 px-4 py-3">{formatUsd(scenario.tokenPrice)}</td>
                      <td className="border-t border-black/10 px-4 py-3 font-semibold">{formatUsd(scenario.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-black/10 bg-[#151515] p-5 text-white shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/50">Expected value</p>
              <p className="mt-4 text-5xl font-semibold">{formatUsd(results.expectedValue)}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/45">Airdrop supply</p>
                  <p className="mt-1 font-medium">{formatNumber(results.airdropSupply)}</p>
                </div>
                <div>
                  <p className="text-white/45">Token price</p>
                  <p className="mt-1 font-medium">{formatUsd(results.tokenPrice)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-black/70">Formula</p>
              <pre className="mt-3 overflow-auto rounded-md bg-[#f6f5f0] p-4 text-xs leading-6 text-black/70">
{`expectedValue =
(yourPoints / totalPoints)
* (airdropPct / 100)
* FDV`}
              </pre>
              <p className="mt-3 text-sm leading-6 text-black/55">
                This is an estimate only. Final tokenomics, eligibility, vesting, and TGE liquidity can change the real result.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
