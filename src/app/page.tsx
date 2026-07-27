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

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    const duration = 400; // ms transition speed
    const startTime = performance.now();
    
    let animationFrameId: number;
    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const current = start + (end - start) * easeProgress;
      setDisplayValue(current);
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(end);
      }
    };
    
    animationFrameId = requestAnimationFrame(updateNumber);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, displayValue]);

  return <>{formatUsd(displayValue)}</>;
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-xs">
      <span className="text-zinc-500 font-medium">{label}</span>
      <span className="font-mono font-bold text-zinc-300">{value}</span>
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
        ctx.textAlign = "left";
        
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

      ctx.shadowColor = "rgba(76, 154, 248, 0.3)";
      ctx.shadowBlur = 30;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ESTIMATED VALUE AT TGE", 860, 220);

      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(formatUsd(results.expectedValue), 860, 300);

      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(76, 154, 248, 0.15)";
      ctx.beginPath();
      ctx.moveTo(640, 340);
      ctx.lineTo(1080, 340);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("POOL SHARE", 750, 390);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(`${(results.share * 100).toFixed(6)}%`, 750, 435);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("ESTIMATED TOKENS", 970, 390);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(formatNumber(results.estimatedTokens, 2), 970, 435);

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "12px sans-serif";
      ctx.fillText("Based on Polymarket-implied FDV scenario odds.", 860, 495);

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("variational.io • Estimate only. Not financial guidance.", 600, 580);

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
    <main className="relative min-h-screen bg-[#07080a] text-zinc-100 font-sans antialiased selection:bg-zinc-800 selection:text-white pb-24">
      {/* Background soft grid */}
      <div 
        className="absolute inset-0 -z-20 opacity-[0.02]" 
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-full max-w-7xl h-[400px] bg-gradient-to-b from-[#4C9AF8]/3 to-transparent blur-[120px] pointer-events-none" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pt-12 sm:px-8">
        
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-zinc-900/80 pb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/variational-wordmark-white.svg"
              alt="Variational"
              width={140}
              height={20}
              priority
              className="opacity-90"
            />
            <span className="hidden sm:inline-block h-4 w-px bg-zinc-800" />
            <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
              Points Estimator
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
              {marketStatus === "ready" ? "Prediction Data Active" : "Local Engine"}
            </span>
          </div>
        </header>

        {/* HERO RESULT CARD */}
        <div className="flex flex-col items-center text-center py-12 px-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            Estimated Airdrop Value at TGE
          </span>
          <div className="mt-4 font-mono text-6xl sm:text-7xl font-bold tracking-tight text-white drop-shadow-sm">
            <AnimatedNumber value={results.expectedValue} />
          </div>
          
          <p className="mt-3 text-xs text-zinc-500 max-w-sm">
            Based on <span className="text-zinc-300 font-medium">{fdvLabel(fdv)} FDV</span> assumptions and a <span className="text-zinc-300 font-medium">{airdropPct}%</span> airdrop pool.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-8 sm:gap-16 border-t border-b border-zinc-900/60 py-6 w-full max-w-2xl text-center">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Pool share</p>
              <p className="mt-1 font-mono text-base font-bold text-zinc-200">{(results.share * 100).toFixed(6)}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Est. Tokens</p>
              <p className="mt-1 font-mono text-base font-bold text-zinc-200">{formatNumber(results.estimatedTokens)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Token Price</p>
              <p className="mt-1 font-mono text-base font-bold text-[#4C9AF8]">{formatUsd(results.tokenPrice)}</p>
            </div>
          </div>
        </div>

        {/* VISUAL MATH FLOW CHART */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Visual Math Flow
          </h3>
          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center justify-between gap-6 border border-zinc-900 bg-zinc-950/40 p-6 rounded-xl text-center font-mono">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-500 uppercase">Your Points</span>
              <span className="text-xs font-bold text-zinc-300">{formatNumber(parsePositive(userPoints))}</span>
            </div>
            <span className="hidden md:inline text-zinc-700">/</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-500 uppercase">Total Points</span>
              <span className="text-xs font-bold text-zinc-300">{formatNumber(parsePositive(totalPoints))}</span>
            </div>
            <span className="hidden md:inline text-zinc-600">➔</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-500 uppercase">Pool Share</span>
              <span className="text-xs font-bold text-zinc-300">{(results.share * 100).toFixed(6)}%</span>
            </div>
            <span className="hidden md:inline text-zinc-600">➔</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-500 uppercase">Airdrop Pool</span>
              <span className="text-xs font-bold text-zinc-300">{airdropPct}%</span>
            </div>
            <span className="hidden md:inline text-zinc-600">➔</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-500 uppercase">Est. Tokens</span>
              <span className="text-xs font-bold text-zinc-300">{formatNumber(results.estimatedTokens, 0)}</span>
            </div>
            <span className="hidden md:inline text-zinc-700">×</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-500 uppercase">Price @ FDV</span>
              <span className="text-xs font-bold text-zinc-300">{formatUsd(results.tokenPrice)}</span>
            </div>
            <span className="hidden md:inline text-[#4C9AF8]/60 font-bold">➔</span>
            <div className="flex flex-col items-center gap-1 bg-[#4C9AF8]/5 border border-[#4C9AF8]/20 px-3 py-1.5 rounded-lg">
              <span className="text-[9px] text-[#4C9AF8] font-bold uppercase">TGE Estimate</span>
              <span className="text-xs font-black text-white">{formatUsd(results.expectedValue)}</span>
            </div>
          </div>
        </div>

        {/* INPUTS AND SHARE PREVIEW */}
        <div className="grid gap-12 lg:grid-cols-2 items-start">
          
          {/* LEFT: SETTINGS & INPUTS */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Settings</h2>
              <p className="text-xs text-zinc-500 mt-1">Configure global supply model assumptions.</p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your points</span>
                  <input
                    className="h-10 rounded-lg bg-zinc-900/60 border-0 px-3.5 font-mono text-sm font-medium text-white outline-none focus:ring-1 focus:ring-zinc-600 transition"
                    inputMode="decimal"
                    value={userPoints}
                    onChange={(event) => setUserPoints(event.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total system points</span>
                  <input
                    className="h-10 rounded-lg bg-zinc-900/60 border-0 px-3.5 font-mono text-sm font-medium text-white outline-none focus:ring-1 focus:ring-zinc-600 transition"
                    inputMode="decimal"
                    value={totalPoints}
                    onChange={(event) => setTotalPoints(event.target.value)}
                  />
                </label>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Supply for Airdrop</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {airdropOptions.map((option) => (
                    <button
                      key={option}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                        option === airdropPct
                          ? "bg-white text-black"
                          : "bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900/80 hover:text-white"
                      }`}
                      onClick={() => setAirdropPct(option)}
                    >
                      {option}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Select FDV Scenario</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {activeFdvOptions.map((option) => (
                    <button
                      key={option}
                      className={`flex flex-col items-center justify-center py-2.5 rounded-lg border text-xs transition ${
                        option === fdv
                          ? "border-[#4C9AF8] bg-[#4C9AF8]/10 text-white"
                          : "border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200"
                      }`}
                      onClick={() => setFdv(option)}
                    >
                      <span className="font-bold">{fdvLabel(option)}</span>
                      <span className="mt-0.5 text-[9px] text-zinc-500">
                        {chanceLabel(fdvMarkets.find((market) => market.fdv === option)?.yesChance)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMarket ? (
                <div className="border-t border-zinc-900 pt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                    <span className="flex items-center gap-1">
                      <Image
                        className="size-3 invert opacity-50"
                        src="/polymarket-vector.png"
                        alt=""
                        width={12}
                        height={12}
                      />
                      <span>Prediction Market Insight</span>
                    </span>
                    <a 
                      href={selectedMarket.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#4C9AF8] hover:underline"
                    >
                      View Market
                    </a>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">{selectedMarket.question}</p>
                  <p className="text-[10px] text-zinc-500">
                    Implied Odds: <span className="text-zinc-300 font-mono font-bold">{chanceLabel(selectedMarket.yesChance)}</span> • Volume: {formatUsd(selectedMarket.volumeTotal)}
                  </p>
                </div>
              ) : null}

              <div className="pt-4 border-t border-zinc-900">
                <StatLine label="Total token supply" value={formatNumber(TOTAL_SUPPLY)} />
                <StatLine label="Airdrop supply" value={formatNumber(results.airdropSupply)} />
                <StatLine label="Token price @ FDV" value={formatUsd(results.tokenPrice)} />
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE SHARE CARD PREVIEW */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Share Card Preview</h2>
              <p className="text-xs text-zinc-500 mt-1">Live preview of your estimate to share on X/Twitter.</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950 p-6 flex flex-col justify-between aspect-[1.91/1] w-full shadow-lg">
              {/* Card visual details */}
              <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-[#4C9AF8]/3 blur-[80px] pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2">
                  <Image
                    src="/brand/variational-logo-white.png"
                    alt=""
                    width={22}
                    height={22}
                    className="opacity-90"
                  />
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-white tracking-wider">VARIATIONAL</span>
                    <span className="text-[8px] font-bold text-zinc-600 tracking-widest uppercase">Points Estimator</span>
                  </div>
                </div>
                <span className="text-[8px] font-bold tracking-widest text-[#4C9AF8] border border-[#4C9AF8]/20 bg-[#4C9AF8]/5 px-2 py-0.5 rounded uppercase">
                  TGE ALLOCATION ESTIMATE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-auto">
                <div className="bg-zinc-900/30 border border-zinc-900/60 p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Estimated TGE Value</span>
                  <span className="text-2xl font-bold font-mono text-[#4C9AF8] mt-1">{formatUsd(results.expectedValue)}</span>
                </div>
                <div className="grid grid-rows-2 gap-2">
                  <div className="bg-zinc-900/30 border border-zinc-900/60 px-3 py-1.5 rounded-lg flex justify-between items-center">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Pool Share</span>
                    <span className="text-xs font-bold font-mono text-zinc-300">{(results.share * 100).toFixed(6)}%</span>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900/60 px-3 py-1.5 rounded-lg flex justify-between items-center">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Est. Tokens</span>
                    <span className="text-xs font-bold font-mono text-zinc-300">{formatNumber(results.estimatedTokens, 0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-900 pt-4 text-[8px] text-zinc-500 font-mono">
                <span>Model: {fdvLabel(fdv)} FDV • {airdropPct}% Pool</span>
                <span>variational.io</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                disabled={isDownloading}
                onClick={handleDownloadCard}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 hover:bg-white text-black px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating image...
                  </>
                ) : (
                  <>
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Share Card
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* FDV SCENARIOS TABLE */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">FDV Scenarios Grid</h2>
            <p className="text-xs text-zinc-500 mt-1">Comparison of total valuation outcomes and expected returns.</p>
          </div>

          <div className="overflow-x-auto border border-zinc-900 bg-zinc-950/40 rounded-xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-zinc-900 bg-zinc-900/10 text-zinc-500">
                <tr>
                  <th className="px-6 py-3.5 font-bold uppercase tracking-wider">FDV</th>
                  <th className="px-6 py-3.5 font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span>Prediction Chance</span>
                      <Image
                        className="size-3.5 invert opacity-50"
                        src="/polymarket-vector.png"
                        alt="Polymarket"
                        width={14}
                        height={14}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 font-bold uppercase tracking-wider">Token price</th>
                  <th className="px-6 py-3.5 font-bold uppercase tracking-wider">Your Allocation</th>
                  <th className="px-6 py-3.5 font-bold uppercase tracking-wider">Estimated TGE Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60 font-mono">
                {results.scenarios.map((scenario) => (
                  <tr
                    key={scenario.fdv}
                    onClick={() => setFdv(scenario.fdv)}
                    className={`cursor-pointer transition hover:bg-zinc-900/20 ${scenario.fdv === fdv ? "bg-zinc-900/40 text-white font-bold" : "text-zinc-400"}`}
                  >
                    <td className="px-6 py-4 font-bold">{fdvLabel(scenario.fdv)}</td>
                    <td className="px-6 py-4">
                      <PolymarketChance 
                        value={fdvMarkets.find((market) => market.fdv === scenario.fdv)?.yesChance} 
                        showIcon={false}
                      />
                    </td>
                    <td className="px-6 py-4">{formatUsd(scenario.tokenPrice)}</td>
                    <td className="px-6 py-4">{formatNumber(results.estimatedTokens, 0)}</td>
                    <td className={`px-6 py-4 font-bold ${scenario.fdv === fdv ? "text-[#4C9AF8]" : "text-zinc-300"}`}>
                      {formatUsd(scenario.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </section>
    </main>
  );
}
