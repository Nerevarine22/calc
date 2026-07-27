"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const TOTAL_SUPPLY = 1_000_000_000;
const fdvOptions = [100_000_000, 250_000_000, 500_000_000, 1_000_000_000, 1_500_000_000, 2_000_000_000];
const airdropOptions = [30, 35, 40, 45, 50];

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
      <span className={active ? "text-[#4C9AF8]" : "text-white/45"}>{chanceLabel(value)}</span>
    </span>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#4C9AF8]/10 py-3 last:border-b-0">
      <span className="text-sm font-semibold text-white/38">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

export default function Home() {
  const [totalPoints, setTotalPoints] = useState("9000000");
  const [userPoints, setUserPoints] = useState("10000");
  const [airdropPct, setAirdropPct] = useState(40);
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
    <main className="min-h-screen bg-[#020706] text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Image
              src="/brand/variational-wordmark-white.svg"
              alt="Variational"
              width={187}
              height={26}
              priority
            />
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-[#4C9AF8]">
              Variational Points Estimator
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-6xl">
              Possible airdrop calculator
            </h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/45">
            Enter your points and model a possible token allocation from total points,
            airdrop supply percentage, and FDV assumptions.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#4C9AF8]/18 bg-[#07110e] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Global assumptions</h2>

            <div className="mt-7 flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-white/58">Total Variational points</span>
                <input
                  className="h-12 rounded-xl border border-[#4C9AF8]/20 bg-[#0a1a15] px-4 text-base font-bold text-white outline-none transition placeholder:text-white/20 focus:border-[#4C9AF8] focus:ring-4 focus:ring-[#4C9AF8]/10"
                  inputMode="decimal"
                  value={totalPoints}
                  onChange={(event) => setTotalPoints(event.target.value)}
                />
              </label>

              <div>
                <p className="text-sm font-semibold text-white/58">Supply for airdrop</p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {airdropOptions.map((option) => (
                    <button
                      key={option}
                      className={`h-11 rounded-md border text-sm font-semibold transition ${
                        option === airdropPct
                          ? "border-[#4C9AF8] bg-[#4C9AF8] text-white"
                          : "border-[#4C9AF8]/18 bg-[#0a1a15] text-white/55 hover:border-[#4C9AF8]/45 hover:text-white"
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
                  <p className="text-sm font-semibold text-white/58">Fully diluted valuation</p>
                  <p className="text-xs text-white/35">
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
                          ? "border-[#4C9AF8] bg-[#4C9AF8] text-[#010612]"
                          : "border-[#4C9AF8]/18 bg-[#0a1a15] text-white/58 hover:border-[#4C9AF8]/45 hover:text-white"
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

              <div className="pt-4">
                <StatLine label="Total token supply" value={formatNumber(TOTAL_SUPPLY)} />
                <StatLine label="Airdrop supply" value={formatNumber(results.airdropSupply)} />
                <StatLine label="Token price @ FDV" value={formatUsd(results.tokenPrice)} />
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-[#4C9AF8]/18 bg-[#07110e] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Your allocation</h2>

            <div className="mt-7 grid gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-white/58">Your points</span>
                <input
                  className="h-12 rounded-xl border border-[#4C9AF8]/20 bg-[#0a1a15] px-4 text-base font-bold text-white outline-none transition placeholder:text-white/20 focus:border-[#4C9AF8] focus:ring-4 focus:ring-[#4C9AF8]/10"
                  inputMode="decimal"
                  value={userPoints}
                  onChange={(event) => setUserPoints(event.target.value)}
                />
              </label>

              {selectedMarket ? (
                <a
                  className="block rounded-xl border border-[#4C9AF8]/18 bg-[#0a1a15] p-4 text-sm transition hover:border-[#4C9AF8]/45"
                  href={selectedMarket.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="font-semibold text-[#4C9AF8]">Linked Polymarket market</span>
                  <span className="mt-1 block text-white/60">{selectedMarket.question}</span>
                  <span className="mt-2 block text-xs text-white/42">
                    Polymarket chance: <PolymarketChance value={selectedMarket.yesChance} /> - Volume: {formatUsd(selectedMarket.volumeTotal)}
                  </span>
                </a>
              ) : null}

              <div className="rounded-2xl border border-[#4C9AF8]/18 bg-[#0b1d17] p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                  Estimated value at TGE
                </p>
                <p className="mt-3 text-5xl font-bold tracking-normal text-[#4C9AF8]">
                  {formatUsd(results.expectedValue)}
                </p>
                <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 divide-x divide-[#4C9AF8]/15">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/38">Pool share</p>
                    <p className="mt-1 text-base font-bold text-white">{(results.share * 100).toFixed(6)}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/38">Estimated tokens</p>
                    <p className="mt-1 text-base font-bold text-white">{formatNumber(results.estimatedTokens, 2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-sm font-semibold text-white/58">Value across every FDV scenario</p>
              <div className="mt-4 overflow-hidden rounded-xl border border-[#4C9AF8]/12">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-white/35">
                  <tr>
                    <th className="px-3 py-3 font-bold sm:px-4">FDV</th>
                    <th className="px-3 py-3 font-bold sm:px-4">Chance</th>
                    <th className="px-3 py-3 font-bold sm:px-4">Token price</th>
                    <th className="px-3 py-3 font-bold sm:px-4">Allocation</th>
                    <th className="px-3 py-3 font-bold sm:px-4">Your value</th>
                  </tr>
                </thead>
                <tbody>
                  {results.scenarios.map((scenario) => (
                    <tr
                      key={scenario.fdv}
                      className={`transition ${scenario.fdv === fdv ? "bg-[#4C9AF8]/16 text-[#4C9AF8]" : "text-white"}`}
                    >
                      <td className="border-t border-[#4C9AF8]/10 px-3 py-3 font-bold sm:px-4">{fdvLabel(scenario.fdv)}</td>
                      <td className="border-t border-[#4C9AF8]/10 px-3 py-3 sm:px-4">
                        <PolymarketChance value={fdvMarkets.find((market) => market.fdv === scenario.fdv)?.yesChance} />
                      </td>
                      <td className="border-t border-[#4C9AF8]/10 px-3 py-3 font-bold sm:px-4">{formatUsd(scenario.tokenPrice)}</td>
                      <td className="border-t border-[#4C9AF8]/10 px-3 py-3 font-bold sm:px-4">{formatNumber(results.estimatedTokens, 2)}</td>
                      <td className="border-t border-[#4C9AF8]/10 px-3 py-3 font-bold text-[#4C9AF8] sm:px-4">{formatUsd(scenario.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
