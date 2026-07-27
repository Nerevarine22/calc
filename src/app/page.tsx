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

function PolymarketChance({ value, active = false, showIcon = true }: { value: number | null | undefined; active?: boolean; showIcon?: boolean }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {showIcon && (
        <span className="inline-flex size-3.5 items-center justify-center overflow-visible">
          <Image
            className="size-2.5 invert opacity-60"
            src="/polymarket-vector.png"
            alt=""
            width={10}
            height={10}
            aria-hidden="true"
          />
        </span>
      )}
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

  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownloadCard = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Draw Background Gradient
      const bgGrad = ctx.createRadialGradient(600, 315, 50, 600, 315, 700);
      bgGrad.addColorStop(0, "#0c2842"); // Deep branding blue glow in center
      bgGrad.addColorStop(0.5, "#030c17"); // Darker body
      bgGrad.addColorStop(1, "#01050e"); // Almost pitch black edges
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // 2. Draw Subtle tech grid/lines
      ctx.strokeStyle = "rgba(76, 154, 248, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 630);
        ctx.stroke();
      }
      for (let y = 0; y < 630; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // 3. Draw neon card outline frame
      ctx.strokeStyle = "rgba(76, 154, 248, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 40, 1120, 550, 24);
      ctx.stroke();

      // 4. Draw Variational Logo/Brand Header
      try {
        const logoImg = new window.Image();
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = "/brand/variational-logo-white.png";
        });
        ctx.drawImage(logoImg, 80, 75, 44, 44);
      } catch {
        // Fallback: draw geometric logo symbol
        ctx.fillStyle = "#4C9AF8";
        ctx.beginPath();
        ctx.arc(102, 97, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Logo Text / Wordmark
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("VARIATIONAL", 140, 96);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 11px sans-serif";
      // Manually handle letter spacing since it's not standard in older canvas, but supports it in modern ones
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = "2px";
      }
      ctx.fillText("POINTS ESTIMATOR", 140, 118);
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = "0px";
      }

      // Right tag: "TGE ALLOCATION ESTIMATE"
      ctx.fillStyle = "rgba(76, 154, 248, 0.1)";
      ctx.beginPath();
      ctx.roundRect(900, 75, 220, 36, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(76, 154, 248, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TGE ALLOCATION ESTIMATE", 1010, 97);

      // Left Column: Assumptions Box
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.beginPath();
      ctx.roundRect(80, 170, 480, 360, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Assumptions Title
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("GLOBAL ASSUMPTIONS", 110, 210);

      const drawAssumption = (label: string, val: string, yPos: number) => {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(label, 110, yPos);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(val, 530, yPos);
        ctx.textAlign = "left"; // reset
        
        // divider line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.beginPath();
        ctx.moveTo(110, yPos + 18);
        ctx.lineTo(530, yPos + 18);
        ctx.stroke();
      };

      drawAssumption("Your Points", formatNumber(parsePositive(userPoints)), 260);
      drawAssumption("Total System Points", formatNumber(parsePositive(totalPoints)), 320);
      drawAssumption("Airdrop Pool Size", `${airdropPct}%`, 380);
      drawAssumption("FDV Scenario", fdvLabel(fdv), 440);
      
      // Add extra stats at the bottom of assumptions
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "16px sans-serif";
      ctx.fillText("Implied Token Price", 110, 500);
      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(formatUsd(results.tokenPrice), 530, 500);
      ctx.textAlign = "left";

      // Right Column: Main Results Glowing Card
      const resultsGrad = ctx.createLinearGradient(600, 170, 1120, 530);
      resultsGrad.addColorStop(0, "rgba(76, 154, 248, 0.12)");
      resultsGrad.addColorStop(1, "rgba(76, 154, 248, 0.02)");
      ctx.fillStyle = resultsGrad;
      ctx.beginPath();
      ctx.roundRect(600, 170, 520, 360, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(76, 154, 248, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glow effect
      ctx.shadowColor = "rgba(76, 154, 248, 0.3)";
      ctx.shadowBlur = 30;
      
      // Main Value Label
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ESTIMATED VALUE AT TGE", 860, 220);

      // Value
      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(formatUsd(results.expectedValue), 860, 300);

      // Reset shadow
      ctx.shadowBlur = 0;

      // Divider
      ctx.strokeStyle = "rgba(76, 154, 248, 0.15)";
      ctx.beginPath();
      ctx.moveTo(640, 340);
      ctx.lineTo(1080, 340);
      ctx.stroke();

      // Pool Share
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("POOL SHARE", 750, 390);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(`${(results.share * 100).toFixed(6)}%`, 750, 435);

      // Estimated Tokens
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("ESTIMATED TOKENS", 970, 390);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(formatNumber(results.estimatedTokens, 2), 970, 435);

      // Polymarket Implied Info / Disclaimer at bottom of results card
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "12px sans-serif";
      ctx.fillText("Based on Polymarket-implied FDV scenario odds.", 860, 495);

      // Main Footer outside boxes
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("variational.io • Estimate only. Not financial guidance.", 600, 580);

      // 5. Trigger download
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `variational-airdrop-estimate-${formatNumber(parsePositive(userPoints))}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to generate card:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#010612] text-white">
      {/* Decorative background glows */}
      <div className="absolute -left-64 -top-64 -z-10 size-[600px] rounded-full bg-[#4C9AF8]/6 blur-[180px]" />
      <div className="absolute -right-64 top-1/3 -z-10 size-[600px] rounded-full bg-[#4C9AF8]/4 blur-[180px]" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between border-b border-[#4C9AF8]/15 pb-6">
          <div className="min-w-0">
            <Image
              src="/brand/variational-wordmark-white.svg"
              alt="Variational"
              width={187}
              height={26}
              priority
            />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#4C9AF8]">
              Variational Points Estimator
            </p>
            <div className="mt-4 flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                Possible
              </span>
              <h1 className="font-mono text-3xl font-bold tracking-tight text-zinc-300 sm:text-4xl">
                Airdrop Calculator
              </h1>
            </div>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/45">
            Enter your points and model a possible token allocation from total points,
            airdrop supply percentage, and FDV assumptions.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden rounded-2xl border border-[#4C9AF8]/25 bg-gradient-to-b from-[#0b172a]/80 to-[#030712]/98 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <div className="absolute -right-20 -top-20 -z-10 size-48 rounded-full bg-[#4C9AF8]/5 blur-3xl" />
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#4C9AF8]">Global assumptions</h2>

            <div className="mt-7 flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Total Variational points</span>
                <input
                  className="h-12 rounded-xl border border-[#4C9AF8]/20 bg-[#091124] px-4 font-mono text-base font-bold text-white outline-none transition placeholder:text-white/20 focus:border-[#4C9AF8] focus:ring-4 focus:ring-[#4C9AF8]/10 focus:shadow-[0_0_15px_rgba(76,154,248,0.15)]"
                  inputMode="decimal"
                  value={totalPoints}
                  onChange={(event) => setTotalPoints(event.target.value)}
                />
              </label>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Supply for airdrop</p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {airdropOptions.map((option) => (
                    <button
                      key={option}
                      className={`h-11 rounded-md border text-sm font-semibold transition ${
                      option === airdropPct
                        ? "border-[#4C9AF8] bg-[#4C9AF8]/15 text-[#4C9AF8] shadow-[0_0_15px_rgba(76,154,248,0.15)] font-bold"
                        : "border-[#4C9AF8]/15 bg-[#091124]/60 text-white/55 hover:border-[#4C9AF8]/40 hover:text-white"
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
                  <p className="text-xs font-bold uppercase tracking-wider text-white/50">Fully diluted valuation</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#4C9AF8]/60">
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
                        ? "border-[#4C9AF8] bg-[#4C9AF8]/15 text-[#4C9AF8] shadow-[0_0_15px_rgba(76,154,248,0.15)] font-bold"
                        : "border-[#4C9AF8]/15 bg-[#091124]/60 text-white/58 hover:border-[#4C9AF8]/40 hover:text-white"
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

              <div className="pt-4 border-t border-[#4C9AF8]/15">
                <StatLine label="Total token supply" value={formatNumber(TOTAL_SUPPLY)} />
                <StatLine label="Airdrop supply" value={formatNumber(results.airdropSupply)} />
                <StatLine label="Token price @ FDV" value={formatUsd(results.tokenPrice)} />
              </div>
            </div>
          </aside>

          <section className="relative overflow-hidden rounded-2xl border border-[#4C9AF8]/25 bg-gradient-to-b from-[#0b172a]/80 to-[#030712]/98 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <div className="absolute -left-20 -top-20 -z-10 size-48 rounded-full bg-[#4C9AF8]/5 blur-3xl" />
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#4C9AF8]">Your allocation</h2>

            <div className="mt-7 grid gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Your points</span>
                <input
                  className="h-12 rounded-xl border border-[#4C9AF8]/20 bg-[#091124] px-4 font-mono text-base font-bold text-white outline-none transition placeholder:text-white/20 focus:border-[#4C9AF8] focus:ring-4 focus:ring-[#4C9AF8]/10 focus:shadow-[0_0_15px_rgba(76,154,248,0.15)]"
                  inputMode="decimal"
                  value={userPoints}
                  onChange={(event) => setUserPoints(event.target.value)}
                />
              </label>

              {selectedMarket ? (
                <a
                  className="block rounded-xl border border-[#4C9AF8]/15 bg-[#091124]/50 p-4 text-sm transition hover:border-[#4C9AF8]/35 hover:bg-[#091124]/80"
                  href={selectedMarket.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="font-bold text-[#4C9AF8] text-xs uppercase tracking-wider">Linked Polymarket market</span>
                  <span className="mt-1.5 block font-bold text-white/80">{selectedMarket.question}</span>
                  <span className="mt-2 block text-xs text-white/40 font-medium">
                    Polymarket chance: <PolymarketChance value={selectedMarket.yesChance} /> - Volume: {formatUsd(selectedMarket.volumeTotal)}
                  </span>
                </a>
              ) : null}

              <div className="relative overflow-hidden rounded-2xl border border-[#4C9AF8]/30 bg-gradient-to-r from-[#07172c]/90 to-[#030919]/95 p-8 text-center shadow-[0_0_50px_rgba(76,154,248,0.08)]">
                {/* Glowing decorative blur inside card */}
                <div className="absolute -right-20 -top-20 -z-10 size-64 rounded-full bg-[#4C9AF8]/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 -z-10 size-64 rounded-full bg-[#4C9AF8]/5 blur-3xl" />

                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                  Estimated value at TGE
                </p>
                <p className="mt-4 text-5xl font-black tracking-tight text-[#4C9AF8] drop-shadow-[0_0_15px_rgba(76,154,248,0.3)] sm:text-6xl">
                  {formatUsd(results.expectedValue)}
                </p>
                
                <div className="mx-auto mt-8 grid max-w-md grid-cols-2 divide-x divide-[#4C9AF8]/20 rounded-xl border border-[#4C9AF8]/15 bg-black/40 py-5">
                  <div className="px-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/40">Pool share</p>
                    <p className="mt-1.5 font-mono text-lg font-black text-white">{(results.share * 100).toFixed(6)}%</p>
                  </div>
                  <div className="px-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/40">Estimated tokens</p>
                    <p className="mt-1.5 font-mono text-lg font-black text-white">{formatNumber(results.estimatedTokens, 2)}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    disabled={isDownloading}
                    onClick={handleDownloadCard}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#4C9AF8]/30 bg-[#4C9AF8]/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#4C9AF8] hover:bg-[#4C9AF8]/20 transition active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Share Card
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">Value across every FDV scenario</p>
              <div className="mt-4 overflow-hidden rounded-xl border border-[#4C9AF8]/15 bg-[#091124]/40 backdrop-blur-sm">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#0b2134]/40 text-[10px] uppercase font-bold tracking-wider text-[#4C9AF8]/80 border-b border-[#4C9AF8]/15">
                    <tr>
                      <th className="px-4 py-3 font-bold">FDV</th>
                      <th className="px-4 py-3 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>Chance</span>
                          <Image
                            className="size-3 invert opacity-60"
                            src="/polymarket-vector.png"
                            alt="Polymarket"
                            width={12}
                            height={12}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 font-bold">Token price</th>
                      <th className="px-4 py-3 font-bold">Allocation</th>
                      <th className="px-4 py-3 font-bold">Your value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#4C9AF8]/10">
                    {results.scenarios.map((scenario) => (
                      <tr
                        key={scenario.fdv}
                        className={`transition ${scenario.fdv === fdv ? "bg-[#4C9AF8]/12 text-[#4C9AF8] font-bold" : "text-white/80 hover:bg-[#4C9AF8]/5"}`}
                      >
                        <td className="px-4 py-3 font-bold font-mono">{fdvLabel(scenario.fdv)}</td>
                        <td className="px-4 py-3">
                          <PolymarketChance 
                            value={fdvMarkets.find((market) => market.fdv === scenario.fdv)?.yesChance} 
                            showIcon={false}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono">{formatUsd(scenario.tokenPrice)}</td>
                        <td className="px-4 py-3 font-mono">{formatNumber(results.estimatedTokens, 2)}</td>
                        <td className={`px-4 py-3 font-bold font-mono ${scenario.fdv === fdv ? "text-[#4C9AF8]" : "text-[#4C9AF8]/80"}`}>{formatUsd(scenario.value)}</td>
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

