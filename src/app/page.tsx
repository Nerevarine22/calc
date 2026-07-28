"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const TOTAL_SUPPLY = 1_000_000_000;
const fdvOptions = [100_000_000, 200_000_000, 300_000_000, 500_000_000, 800_000_000, 1_000_000_000, 2_000_000_000];
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
  const [tab, setTab] = useState<"estimator" | "stats">("estimator");
  const [totalPoints, setTotalPoints] = useState("9000000");
  const [userPoints, setUserPoints] = useState("10000");
  const [airdropPct, setAirdropPct] = useState(40);
  const [fdv, setFdv] = useState(500_000_000);
  const [fdvMarkets, setFdvMarkets] = useState<FdvMarket[]>([]);
  const [marketStatus, setMarketStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [duneData, setDuneData] = useState<any>(null);

  const [searchAddress, setSearchAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [twitterUsername, setTwitterUsername] = useState("");
  const [twitterExtraPoints, setTwitterExtraPoints] = useState(0);
  const [twitterStatus, setTwitterStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [twitterStats, setTwitterStats] = useState<{
    tweetsCount: number;
    views: number;
    likes: number;
    retweets: number;
  } | null>(null);
  const [twitterError, setTwitterError] = useState("");

  const handleCheckTwitterBonus = async () => {
    const username = twitterUsername.trim();
    if (!username) return;

    setTwitterStatus("checking");
    setTwitterError("");
    setTwitterStats(null);
    setTwitterExtraPoints(0);

    try {
      const response = await fetch(`/api/check-twitter?username=${encodeURIComponent(username)}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to check Twitter bonus");
      }

      if (json.matchingTweetsCount > 0) {
        setTwitterStatus("success");
        setTwitterStats({
          tweetsCount: json.matchingTweetsCount,
          views: json.totalViews,
          likes: json.totalLikes,
          retweets: json.totalRetweets,
        });
        setTwitterExtraPoints(json.extraPoints);
      } else {
        setTwitterStatus("error");
        setTwitterError(`No tweets mentioning Variational found for @${json.username}. Try posting first!`);
      }
    } catch (err: any) {
      setTwitterStatus("error");
      setTwitterError(err.message || "Failed to lookup Twitter. Please try again later.");
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText("OMNIKLJ9FBUC");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  useEffect(() => {
    let ignore = false;

    async function loadDuneData() {
      try {
        const response = await fetch("/api/dune-stats");
        if (!response.ok) throw new Error("dune-fetch-failed");
        const json = await response.json();
        if (!ignore) {
          setDuneData(json);
        }
      } catch (err) {
        console.error("Dune stats load error:", err);
      }
    }

    loadDuneData();

    return () => {
      ignore = true;
    };
  }, []);

  const activeFdvOptions = fdvMarkets.length > 0 ? fdvMarkets.map((market) => market.fdv) : fdvOptions;
  const selectedMarket = fdvMarkets.find((market) => market.fdv === fdv);

  const results = useMemo(() => {
    const totalNetworkXPoints = parsePositive(totalPoints, 1);
    const baseYourXPoints = parsePositive(userPoints);
    const yourXPoints = baseYourXPoints + twitterExtraPoints;
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
  }, [activeFdvOptions, airdropPct, fdv, totalPoints, userPoints, twitterExtraPoints]);

  const stats = useMemo(() => {
    const totalVol = fdvMarkets.reduce((acc, m) => acc + m.volumeTotal, 0);
    const validChances = fdvMarkets.filter(m => m.yesChance !== null && m.yesChance !== undefined);
    
    const sortedByChance = [...fdvMarkets].sort((a, b) => (b.yesChance ?? 0) - (a.yesChance ?? 0));
    const leadingScenario = sortedByChance[0];

    let expectedFdvValue = 500_000_000;
    if (validChances.length > 0) {
      const sumChance = validChances.reduce((acc, m) => acc + (m.yesChance ?? 0), 0);
      if (sumChance > 0) {
        expectedFdvValue = validChances.reduce((acc, m) => acc + (m.fdv * (m.yesChance ?? 0)), 0) / sumChance;
      }
    }

    return {
      totalVolume: totalVol,
      leadingScenario,
      expectedFdv: expectedFdvValue,
    };
  }, [fdvMarkets]);

  const handleWalletLookup = async () => {
    const query = searchAddress.trim().toLowerCase();
    if (!query) return;

    setIsSearching(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/dune-stats?address=${query}`);
      if (!response.ok) throw new Error("search-failed");

      const json = await response.json();
      if (json.found) {
        setUserPoints(String(json.points));
        setSearchError("");
      } else {
        setSearchError(json.message || "Wallet address not found in Dune snapshot");
      }
    } catch {
      setSearchError("Failed to lookup wallet. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadCard = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Draw Background
      ctx.fillStyle = "#07080a";
      ctx.fillRect(0, 0, 1200, 630);

      // Draw subtle background radial blue glow
      const glowGrad = ctx.createRadialGradient(1000, 100, 50, 1000, 100, 500);
      glowGrad.addColorStop(0, "rgba(76, 154, 248, 0.12)");
      glowGrad.addColorStop(1, "rgba(76, 154, 248, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // Draw subtle background grid
      ctx.strokeStyle = "rgba(76, 154, 248, 0.008)";
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

      // 2. Draw outline frame
      ctx.strokeStyle = "rgba(76, 154, 248, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(40, 40, 1120, 550, 20);
      ctx.stroke();

      // 3. Draw Header
      try {
        const logoImg = new window.Image();
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = "/brand/variational-logo-white.png";
        });
        ctx.drawImage(logoImg, 80, 80, 44, 44);
      } catch {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(102, 102, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wordmark
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("VARIATIONAL", 140, 102);

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "bold 11px sans-serif";
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = "2px";
      }
      ctx.fillText("POINTS ESTIMATOR", 140, 122);
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = "0px";
      }

      // Tag "TGE ALLOCATION ESTIMATE"
      ctx.strokeStyle = "rgba(76, 154, 248, 0.2)";
      ctx.fillStyle = "rgba(76, 154, 248, 0.05)";
      ctx.beginPath();
      ctx.roundRect(880, 85, 240, 36, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TGE ALLOCATION ESTIMATE", 1000, 107);

      // Main content divide line
      ctx.strokeStyle = "rgba(76, 154, 248, 0.1)";
      ctx.beginPath();
      ctx.moveTo(80, 160);
      ctx.lineTo(1120, 160);
      ctx.stroke();

      // 4. Center Section: Left Value Box
      ctx.fillStyle = "rgba(76, 154, 248, 0.02)";
      ctx.beginPath();
      ctx.roundRect(80, 200, 520, 280, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(76, 154, 248, 0.15)";
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Estimated TGE Value", 120, 250);

      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 56px monospace";
      ctx.fillText(formatUsd(results.expectedValue), 120, 350);

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Based on ${fdvLabel(fdv)} FDV & ${airdropPct}% Pool`, 120, 420);

      // Center Section: Right boxes
      // Pool Share box
      ctx.fillStyle = "rgba(76, 154, 248, 0.02)";
      ctx.beginPath();
      ctx.roundRect(630, 200, 490, 125, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(76, 154, 248, 0.15)";
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Pool Share", 670, 245);
      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 32px monospace";
      ctx.fillText(`${(results.share * 100).toFixed(6)}%`, 670, 295);

      // Est. Tokens box
      ctx.fillStyle = "rgba(76, 154, 248, 0.02)";
      ctx.beginPath();
      ctx.roundRect(630, 355, 490, 125, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(76, 154, 248, 0.15)";
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Estimated Tokens", 670, 400);
      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 32px monospace";
      ctx.fillText(formatNumber(results.estimatedTokens, 0), 670, 450);

      // 5. Footer section
      ctx.strokeStyle = "rgba(76, 154, 248, 0.1)";
      ctx.beginPath();
      ctx.moveTo(80, 520);
      ctx.lineTo(1120, 520);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "14px monospace";
      ctx.textAlign = "left";
      let footerText = `Your Points: ${formatNumber(parsePositive(userPoints) + twitterExtraPoints)} • Total: ${formatNumber(parsePositive(totalPoints))}`;
      if (twitterExtraPoints > 0) {
        footerText += ` (incl. +${formatNumber(twitterExtraPoints)} Extra)`;
      }
      ctx.fillText(footerText, 80, 560);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.textAlign = "right";
      ctx.fillText("variational.io", 1120, 560);

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



  const isDuneActive = duneData && duneData.duneActive === true;
  const hasLeaderboard = isDuneActive && duneData.leaderboard && duneData.leaderboard.length > 0;
  const activeTab = isDuneActive ? tab : "estimator";

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
            
            <nav className="flex items-center gap-6 font-mono text-[10px] tracking-[0.2em] uppercase">
              <button 
                onClick={() => setTab("estimator")}
                className={`transition font-bold cursor-pointer ${activeTab === "estimator" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Points Estimator
              </button>
              {isDuneActive && (
                <button 
                  onClick={() => setTab("stats")}
                  className={`transition font-bold cursor-pointer ${activeTab === "stats" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Statistics
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://x.com/atoms_res"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider text-zinc-400 hover:text-[#4C9AF8] transition-colors uppercase"
            >
              created by @atoms_res
            </a>
            <span className="hidden sm:inline-block h-3.5 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                {marketStatus === "ready" ? "Prediction Data Active" : "Local Engine"}
              </span>
            </div>
          </div>
        </header>

        {activeTab === "estimator" ? (
          <>
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
              
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                <a 
                  href="https://omni.variational.io/?ref=OMNIKLJ9FBUC"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#4C9AF8]/25 bg-[#4C9AF8]/5 hover:bg-[#4C9AF8]/10 hover:border-[#4C9AF8]/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#4C9AF8] transition active:scale-98"
                >
                  <span>Claim +12% Points Boost & Bronze Tier on Omni</span>
                  <span>➔</span>
                </a>
                
                <div className="inline-flex items-center gap-2 h-9 rounded-full border border-zinc-900 bg-zinc-950/60 px-4 text-xs font-mono">
                  <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Code:</span>
                  <span className="text-white text-[11px] font-bold tracking-wide select-all">OMNIKLJ9FBUC</span>
                  <button
                    onClick={handleCopyReferralCode}
                    title="Copy code"
                    className="p-1 text-zinc-500 hover:text-white transition active:scale-90 cursor-pointer ml-0.5 flex items-center justify-center"
                  >
                    {copied ? (
                      <span className="text-[10px] text-emerald-500 font-bold font-sans">Copied!</span>
                    ) : (
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
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
                  {/* WALLET LOOKUP - Conditionally rendered only when data is available */}
                  {hasLeaderboard && (
                    <div className="flex flex-col gap-2 border-b border-zinc-900 pb-5 animate-fade-in">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sync Points via Wallet</span>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 h-10 rounded-lg bg-zinc-900/60 border-0 px-3.5 font-mono text-xs font-medium text-white outline-none focus:ring-1 focus:ring-zinc-800 transition"
                          placeholder="Enter wallet address 0x..."
                          value={searchAddress}
                          onChange={(e) => setSearchAddress(e.target.value)}
                        />
                        <button
                          onClick={handleWalletLookup}
                          disabled={isSearching}
                          className="h-10 px-4 rounded-lg bg-zinc-100 hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-40 cursor-pointer"
                        >
                          {isSearching ? "..." : "Sync"}
                        </button>
                      </div>
                      {searchError && <span className="text-[10px] text-rose-500 font-medium">{searchError}</span>}
                    </div>
                  )}

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

                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Twitter Reach Bonus</span>
                        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Possible Extra Points</span>
                      </div>
                      {twitterExtraPoints > 0 && (
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse">
                          +{formatNumber(twitterExtraPoints)} Extra Points
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-semibold font-mono">@</span>
                        <input
                          className="w-full h-10 rounded-lg bg-zinc-900/60 border-0 pl-7 pr-3.5 font-mono text-xs text-white outline-none focus:ring-1 focus:ring-zinc-600 transition"
                          placeholder="username"
                          value={twitterUsername}
                          onChange={(e) => setTwitterUsername(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={handleCheckTwitterBonus}
                        disabled={twitterStatus === "checking" || !twitterUsername.trim()}
                        className="h-10 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center min-w-[100px]"
                      >
                        {twitterStatus === "checking" ? "..." : "Verify"}
                      </button>
                    </div>
                    
                    {twitterStatus === "success" && twitterStats && (
                      <div className="border-t border-zinc-900/80 pt-3 mt-1 flex flex-col gap-2.5 animate-slide-fade-in">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-zinc-900/40 border border-zinc-800/60 p-2 rounded-lg text-center flex flex-col justify-center">
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Tweets</span>
                            <span className="text-sm font-bold font-mono text-white mt-0.5">{twitterStats.tweetsCount}</span>
                          </div>
                          
                          <div className="bg-zinc-900/40 border border-[#4C9AF8]/20 p-2 rounded-lg text-center flex flex-col justify-center">
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Views</span>
                            <span className="text-sm font-bold font-mono text-[#4C9AF8] mt-0.5">{formatNumber(twitterStats.views)}</span>
                          </div>
                          
                          <div className="bg-zinc-900/40 border border-zinc-800/60 p-2 rounded-lg text-center flex flex-col justify-center">
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Engagement</span>
                            <span className="text-sm font-bold font-mono text-zinc-200 mt-0.5">{twitterStats.likes + twitterStats.retweets}</span>
                          </div>
                        </div>
                        
                        {twitterExtraPoints > 0 ? (
                          <div className="text-[10px] text-emerald-400 font-bold text-center bg-emerald-500/10 border border-emerald-500/20 py-1.5 rounded-lg">
                            Earned +{formatNumber(twitterExtraPoints)} Extra Points!
                          </div>
                        ) : (() => {
                          const currentEr = twitterStats.views > 0 ? (twitterStats.likes + twitterStats.retweets) / twitterStats.views : 0;
                          let reason = "";
                          if (twitterStats.views < 5000) {
                            reason = `Not enough views: ${formatNumber(twitterStats.views)} (Needs ≥ 5,000)`;
                          } else if (twitterStats.tweetsCount < 3) {
                            reason = `Not enough tweets: ${twitterStats.tweetsCount} (Needs ≥ 3)`;
                          } else if (currentEr < 0.01) {
                            reason = `Engagement Rate too low: ${(currentEr * 100).toFixed(2)}% (Needs ≥ 1.00%)`;
                          } else {
                            reason = "Does not meet higher tiers requirement.";
                          }

                          return (
                            <div className="flex flex-col gap-1.5 bg-zinc-900/20 border border-zinc-900/60 p-2.5 rounded-lg text-center">
                              <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                                Bonus: 0 Extra Points
                              </div>
                              <div className="text-[10px] text-rose-400 font-bold leading-normal">
                                {reason}
                              </div>
                              <div className="text-[9px] text-zinc-500 leading-normal">
                                Rule: Needs ≥5k views, ≥3 tweets, and ≥1% engagement.
                              </div>
                              <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-900/80 mt-1">
                                Current engagement: <span className="text-zinc-300 font-mono">{twitterStats.likes} likes</span> • <span className="text-zinc-300 font-mono">{twitterStats.retweets} retweets</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    {twitterStatus === "error" && (
                      <div className="text-[10px] text-rose-500 font-medium animate-slide-fade-in">{twitterError}</div>
                    )}
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
                      {activeFdvOptions.map((option) => {
                        const market = fdvMarkets.find((m) => m.fdv === option);
                        const hasChance = market?.yesChance !== null && market?.yesChance !== undefined;
                        return (
                          <button
                            key={option}
                            className={`flex flex-col items-center justify-center h-[54px] rounded-lg border text-xs transition ${
                              option === fdv
                                ? "border-[#4C9AF8] bg-[#4C9AF8]/10 text-white"
                                : "border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200"
                            }`}
                            onClick={() => setFdv(option)}
                          >
                            <span className="font-bold">{fdvLabel(option)}</span>
                            <span className="mt-0.5 text-[9px] text-zinc-500 flex items-center justify-center gap-1 h-3.5">
                              {hasChance && (
                                <Image
                                  className="size-2.5 invert opacity-30"
                                  src="/polymarket-vector.png"
                                  alt="Polymarket"
                                  width={10}
                                  height={10}
                                />
                              )}
                              <span>{chanceLabel(market?.yesChance)}</span>
                            </span>
                          </button>
                        );
                      })}
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

                <div className="relative overflow-hidden rounded-2xl border border-[#4C9AF8]/20 hover:border-[#4C9AF8]/45 bg-zinc-950 p-6 flex flex-col justify-between aspect-[1.91/1] w-full shadow-2xl transition-all duration-300 hover:shadow-[#4C9AF8]/5">
                  {/* Card visual details */}
                  <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-[#4C9AF8]/12 blur-[80px] pointer-events-none" />
                  
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
                    <div className="bg-zinc-950/60 border border-[#4C9AF8]/15 p-4 rounded-lg flex flex-col justify-center">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Estimated TGE Value</span>
                      <span className="text-2xl font-bold font-mono text-[#4C9AF8] mt-1">
                        <AnimatedNumber value={results.expectedValue} />
                      </span>
                    </div>
                    <div className="grid grid-rows-2 gap-2">
                      <div className="bg-zinc-950/60 border border-[#4C9AF8]/15 px-3 py-1.5 rounded-lg flex justify-between items-center">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Pool Share</span>
                        <span className="text-xs font-bold font-mono text-[#4C9AF8]">{(results.share * 100).toFixed(6)}%</span>
                      </div>
                      <div className="bg-zinc-950/60 border border-[#4C9AF8]/15 px-3 py-1.5 rounded-lg flex justify-between items-center">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Est. Tokens</span>
                        <span className="text-xs font-bold font-mono text-[#4C9AF8]">{formatNumber(results.estimatedTokens, 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900 pt-4 text-[8px] text-zinc-500 font-mono">
                    <span>Model: {fdvLabel(fdv)} FDV • {airdropPct}% Pool{twitterExtraPoints > 0 ? ` • incl. +${formatNumber(twitterExtraPoints)} Extra` : ""}</span>
                    <span>variational.io</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    disabled={isDownloading}
                    onClick={handleDownloadCard}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-white text-black px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Card
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
          </>
        ) : (
          <div className="flex flex-col gap-12 animate-fade-in">
            {/* STATS OVERVIEW CARDS */}
            <div className={`grid gap-6 ${isDuneActive ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
              <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Implied Expected FDV</span>
                <div className="mt-2.5 font-mono text-2xl font-bold text-white">
                  {formatUsd(stats.expectedFdv)}
                </div>
                <p className="text-[9px] text-zinc-500 mt-1">Weighted expectation across odds.</p>
              </div>
              
              <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Leading FDV Scenario</span>
                <div className="mt-2.5 font-mono text-2xl font-bold text-[#4C9AF8]">
                  {stats.leadingScenario ? fdvLabel(stats.leadingScenario.fdv) : "$500M"}
                </div>
                <p className="text-[9px] text-zinc-500 mt-1">
                  Highest probability: {stats.leadingScenario ? chanceLabel(stats.leadingScenario.yesChance) : "n/a"}
                </p>
              </div>

              {isDuneActive && (
                <>
                  <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-xl animate-fade-in">
                    <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">24h Trading Volume</span>
                    <div className="mt-2.5 font-mono text-2xl font-bold text-zinc-200">
                      {formatUsd(duneData.totalVolume24h)}
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-1">Real-time cleared volume (Dune).</p>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-xl animate-fade-in">
                    <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Open Interest</span>
                    <div className="mt-2.5 font-mono text-2xl font-bold text-zinc-200">
                      {formatUsd(duneData.totalOpenInterest)}
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-1">Active contract positions (Dune).</p>
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
              {/* Left: Probability Weight Distribution Chart */}
              <div className={isDuneActive ? "lg:col-span-7 flex flex-col gap-6 bg-zinc-950/20 border border-zinc-900 p-6 rounded-xl" : "lg:col-span-12 flex flex-col gap-6 bg-zinc-950/20 border border-zinc-900 p-6 rounded-xl"}>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">FDV Probability Curve</h3>
                  <p className="text-xs text-zinc-500 mt-1">Relative chance of each FDV scenario based on prediction odds.</p>
                </div>

                <div className="flex flex-col gap-4 pt-2">
                  {activeFdvOptions.map((option) => {
                    const m = fdvMarkets.find((market) => market.fdv === option);
                    const chance = m?.yesChance ?? 0;
                    const pct = Math.round(chance * 100);
                    return (
                      <div key={option} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-300 font-bold">{fdvLabel(option)} FDV</span>
                          <span className="text-[#4C9AF8] font-bold">{pct}% Chance</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#4C9AF8] rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Top Points Leaderboard or Protocol Health Details */}
              {hasLeaderboard ? (
                <div className="lg:col-span-5 flex flex-col gap-6 bg-zinc-950/20 border border-zinc-900 p-6 rounded-xl animate-fade-in">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Top Points Leaderboard</h3>
                    <p className="text-xs text-zinc-500 mt-1">Leaderboard positions synced from Dune Analytics.</p>
                  </div>

                  <div className="overflow-y-auto max-h-[220px] pr-1.5 scrollbar-thin">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 pb-2">
                          <th className="pb-2 font-bold uppercase">Rank</th>
                          <th className="pb-2 font-bold uppercase">Address</th>
                          <th className="pb-2 font-bold uppercase text-right">Points</th>
                          <th className="pb-2 font-bold uppercase text-right">Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {duneData.leaderboard.map((user: any) => (
                          <tr key={user.rank} className="hover:bg-zinc-900/10">
                            <td className="py-2 text-zinc-400">#{user.rank}</td>
                            <td className="py-2 text-zinc-300">{user.address}</td>
                            <td className="py-2 text-right font-bold text-zinc-200">{formatNumber(user.points)}</td>
                            <td className="py-2 text-right">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                user.tier === "Gold" ? "bg-amber-500/10 text-amber-400" :
                                user.tier === "Silver" ? "bg-zinc-400/10 text-zinc-300" :
                                "bg-amber-800/10 text-amber-700"
                              }`}>
                                {user.tier}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 border-t border-zinc-900 pt-3">
                    <span>Source: Dune Analytics</span>
                    <span>Status: Live Sync</span>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-5 flex flex-col gap-6 bg-zinc-950/20 border border-zinc-900 p-6 rounded-xl animate-fade-in">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Protocol Statistics</h3>
                    <p className="text-xs text-zinc-500 mt-1">Real-time trading and infrastructure health metrics from Dune.</p>
                  </div>

                  <div className="flex flex-col gap-4 font-mono">
                    <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Active Markets</span>
                      <span className="text-xs font-bold text-zinc-300">{duneData?.activeMarkets ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Avg Funding Rate</span>
                      <span className="text-xs font-bold text-[#4C9AF8]">
                        {(duneData?.avgFundingRatePct ?? 0).toFixed(4)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Data Status</span>
                      <span className="text-xs font-bold text-emerald-500">Live Sync</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Dune Source</span>
                      <span className="text-xs text-zinc-400">Query #{duneData?.queryId || 6548904}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-zinc-500 border-t border-zinc-900 pt-3">
                    <span>Source: Dune Analytics</span>
                    <span>Status: Connected</span>
                  </div>
                </div>
              )}
            </div>

            {/* Prediction Markets Activity (Secondary) */}
            <div className="border-t border-zinc-900/80 pt-8 mt-4">
              <div className="flex flex-col gap-1.5 mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Prediction Markets Insights
                </h3>
                <p className="text-xs text-zinc-500">
                  Secondary market statistics and implied contract pricing for the Variational token.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fdvMarkets.length > 0 ? (
                  fdvMarkets.map((market) => (
                    <div 
                      key={market.conditionId}
                      className="border border-zinc-900/50 bg-zinc-950/20 p-4 rounded-lg flex flex-col justify-between gap-3 text-[11px]"
                    >
                      <p className="text-zinc-400 font-medium leading-relaxed">{market.question}</p>
                      <div className="flex items-center justify-between border-t border-zinc-900/30 pt-2 text-[10px] text-zinc-500 font-mono">
                        <span>Implied: <strong className="text-[#4C9AF8]">{chanceLabel(market.yesChance)}</strong></span>
                        <a 
                          href={market.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#4C9AF8]/80 hover:text-[#4C9AF8] hover:underline"
                        >
                          Trade ➔
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 border border-zinc-900 rounded-xl text-zinc-500 text-xs">
                    No prediction market data available at this time.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
