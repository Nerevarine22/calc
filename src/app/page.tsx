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
      <span className="text-[#64748B] font-medium">{label}</span>
      <span className="font-mono font-bold text-[#CBD5E1]">{value}</span>
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

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCardTheme, setShareCardTheme] = useState<"dark" | "light">("dark");
  const [showExtraPoints, setShowExtraPoints] = useState(true);

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

  const handleDownloadCard = async (theme: "dark" | "light") => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 2400;
      canvas.height = 1260;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Automatically scale context coordinates by 2 for double resolution crispness
      ctx.scale(2, 2);

      // 1. Draw Background based on Theme
      if (theme === "light") {
        ctx.fillStyle = "#f9fafb";
        ctx.fillRect(0, 0, 1200, 630);

        // Subtle radial blue glow
        const glowGrad = ctx.createRadialGradient(1000, 100, 50, 1000, 100, 500);
        glowGrad.addColorStop(0, "rgba(76, 154, 248, 0.05)");
        glowGrad.addColorStop(1, "rgba(76, 154, 248, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, 1200, 630);
      } else {
        ctx.fillStyle = "#050507";
        ctx.fillRect(0, 0, 1200, 630);

        // Subtle radial blue glow
        const glowGrad = ctx.createRadialGradient(1000, 100, 50, 1000, 100, 500);
        glowGrad.addColorStop(0, "rgba(76, 154, 248, 0.12)");
        glowGrad.addColorStop(1, "rgba(76, 154, 248, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, 1200, 630);
      }

      // Draw background wave image
      try {
        const waveImg = new window.Image();
        await new Promise((resolve, reject) => {
          waveImg.onload = resolve;
          waveImg.onerror = reject;
          waveImg.src = theme === "light" ? "/brand/wave-light.png" : "/brand/wave-dark.png";
        });
        ctx.drawImage(waveImg, 0, 0, 1200, 630);
      } catch (e) {
        console.error("Failed to load wave background image", e);
      }

      // Frame border
      if (theme === "light") {
        ctx.strokeStyle = "rgba(76, 154, 248, 0.15)";
      } else {
        ctx.strokeStyle = "rgba(76, 154, 248, 0.12)";
      }
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(16, 16, 1168, 598, 24);
      ctx.stroke();

      // Draw subtle background grid
      ctx.strokeStyle = theme === "light" ? "rgba(76, 154, 248, 0.005)" : "rgba(76, 154, 248, 0.008)";
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

      // Giant background logo wave on the right (opacity: 0.02)
      ctx.fillStyle = theme === "light" ? "rgba(0, 0, 0, 0.01)" : "rgba(76, 154, 248, 0.02)";
      ctx.beginPath();
      // Wave shape
      ctx.moveTo(1100, 600);
      ctx.bezierCurveTo(950, 580, 800, 420, 900, 250);
      ctx.bezierCurveTo(950, 180, 1100, 220, 1150, 380);
      ctx.fill();

      // 2. Draw Header Logo Box (just the logo directly, no wrapper box/border)
      ctx.fillStyle = theme === "light" ? "#0b0f19" : "#ffffff";
      ctx.save();
      ctx.translate(52, 60);
      ctx.scale(30 / 260, 30 / 260); // Keep aspect ratio (uniform scale factor)
      const p = new Path2D("M184.119 0.554062C215.75 0.554062 244.399 20.8274 256.232 50.8548L317.757 216.482C321.032 224.33 328.396 229.367 336.279 229.367H368.808V259.336H336.279C315.948 259.336 297.322 246.119 290.126 226.468L272.766 179.775C269.657 171.499 262.078 166.14 253.947 166.139C245.761 166.139 238.231 171.36 235.139 179.754L235.128 179.775L217.769 226.468C210.573 246.118 191.946 259.335 171.615 259.336H0V229.367H32.1586C40.1273 229.365 47.8672 223.98 50.9671 215.731L111.645 52.2934C123.113 21.4959 151.968 0.555387 184.119 0.554062ZM184.119 30.5229C164.337 30.5242 145.991 43.4339 138.8 63.0094V63.0306L76.9162 229.367H101.797C109.771 229.364 117.52 223.969 120.616 215.71L159.629 110.761V110.74C169.232 85.1888 192.485 68.3622 219.038 68.3622C223.426 68.3625 227.755 68.8635 231.954 69.8114L229.098 62.1314C221.498 43.005 203.562 30.5229 184.119 30.5229ZM218.848 98.5214C204.676 98.5218 192.097 107.306 186.774 121.508L146.554 229.367H171.424C179.4 229.367 187.158 223.971 190.254 215.71L207.603 169.027C214.845 149.573 232.438 136.548 252.667 136.35H253.63C254.577 136.351 255.51 136.385 256.423 136.445L250.911 121.477C245.759 107.65 232.99 98.5224 218.848 98.5214Z");
      ctx.fill(p);
      ctx.restore();

      // Wordmark
      ctx.fillStyle = theme === "light" ? "#0b0f19" : "#ffffff";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("VARIATIONAL", 107, 71);

      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 11px sans-serif";
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = "2px";
      }
      ctx.fillText("POINTS ESTIMATOR", 107, 90);
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = "0px";
      }

      // Tag "TGE ALLOCATION ESTIMATE"
      ctx.strokeStyle = "rgba(76, 154, 248, 0.2)";
      ctx.fillStyle = "rgba(76, 154, 248, 0.05)";
      ctx.beginPath();
      ctx.roundRect(858, 52, 290, 40, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#4C9AF8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TGE ALLOCATION ESTIMATE", 1003, 76);
      ctx.textAlign = "left";

      // 3. Center Section: Left Value Box
      const textMuted = theme === "light" ? "rgba(11, 15, 25, 0.45)" : "rgba(255, 255, 255, 0.4)";
      const textMain = theme === "light" ? "#0b0f19" : "#ffffff";
      const dividerColor = theme === "light" ? "rgba(11, 15, 25, 0.08)" : "rgba(255, 255, 255, 0.08)";

      ctx.fillStyle = textMuted;
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Estimated TGE Value", 52, 230);

      ctx.fillStyle = textMain;
      ctx.font = "bold 76px sans-serif";
      ctx.fillText(formatUsd(results.expectedValue), 52, 335);

      ctx.fillStyle = textMuted;
      ctx.font = "14px sans-serif";
      ctx.fillText(`Based on ${fdvLabel(fdv)} FDV & ${airdropPct}% Pool`, 52, 395);

      // Middle Vertical Divider Line
      ctx.strokeStyle = dividerColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(600, 170);
      ctx.lineTo(600, 460);
      ctx.stroke();

      // 4. Right Side Layout
      if (twitterUsername.trim() && showExtraPoints) {
        // Top Row: Your Points & Pool Share
        ctx.fillStyle = textMuted;
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("Your Points", 640, 230);

        ctx.fillStyle = "#4C9AF8";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText(formatNumber(parsePositive(userPoints) + twitterExtraPoints), 640, 283);

        // Vertical divider top row
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(894, 200);
        ctx.lineTo(894, 310);
        ctx.stroke();

        ctx.fillStyle = textMuted;
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("Pool Share", 934, 230);

        // Donut icon top row
        ctx.strokeStyle = "#4C9AF8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(949, 275, 10, 0, Math.PI * 2);
        ctx.globalAlpha = 0.25;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(949, 275, 10, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.fillStyle = textMain;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(`${(results.share * 100).toFixed(4)}%`, 972, 283);

        // Horizontal Divider Line
        ctx.strokeStyle = dividerColor;
        ctx.beginPath();
        ctx.moveTo(640, 335);
        ctx.lineTo(1148, 335);
        ctx.stroke();

        // Bottom Row: Est. Tokens & Twitter Handle
        ctx.fillStyle = textMuted;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("Est. Tokens", 640, 375);

        // Draw wallet icon bottom row
        ctx.strokeStyle = "#4C9AF8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(645, 414, 18, 13, 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(658, 414);
        ctx.lineTo(658, 410);
        ctx.quadraticCurveTo(654, 407, 648, 410);
        ctx.stroke();

        ctx.fillStyle = textMain;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(formatNumber(results.estimatedTokens, 0), 678, 428);

        // Vertical divider bottom row
        ctx.strokeStyle = dividerColor;
        ctx.beginPath();
        ctx.moveTo(894, 360);
        ctx.lineTo(894, 450);
        ctx.stroke();

        ctx.fillStyle = textMuted;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(`𝕏 @${twitterUsername}`, 934, 375);

        ctx.fillStyle = twitterExtraPoints > 0 ? "#4C9AF8" : textMuted;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(twitterExtraPoints > 0 ? `+${formatNumber(twitterExtraPoints)}` : "0", 934, 428);
      } else {
        // Your Points (Top Spanned)
        ctx.fillStyle = textMuted;
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("Your Points", 640, 230);

        ctx.fillStyle = "#4C9AF8";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText(formatNumber(parsePositive(userPoints)), 640, 290);

        // Horizontal Divider Line
        ctx.strokeStyle = dividerColor;
        ctx.beginPath();
        ctx.moveTo(640, 335);
        ctx.lineTo(1148, 335);
        ctx.stroke();

        // Bottom Row: Pool Share & Est. Tokens
        ctx.fillStyle = textMuted;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("Pool Share", 640, 375);

        // Donut icon bottom row
        ctx.strokeStyle = "#4C9AF8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(655, 420, 10, 0, Math.PI * 2);
        ctx.globalAlpha = 0.25;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(655, 420, 10, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.fillStyle = textMain;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(`${(results.share * 100).toFixed(4)}%`, 678, 428);

        // Vertical divider bottom row
        ctx.strokeStyle = dividerColor;
        ctx.beginPath();
        ctx.moveTo(894, 360);
        ctx.lineTo(894, 450);
        ctx.stroke();

        ctx.fillStyle = textMuted;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("Est. Tokens", 934, 375);

        // Draw wallet icon bottom row
        ctx.strokeStyle = "#4C9AF8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(939, 414, 18, 13, 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(952, 414);
        ctx.lineTo(952, 410);
        ctx.quadraticCurveTo(948, 407, 942, 410);
        ctx.stroke();

        ctx.fillStyle = textMain;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(formatNumber(results.estimatedTokens, 0), 972, 428);
      }

      // 5. Footer section
      ctx.strokeStyle = dividerColor;
      ctx.beginPath();
      ctx.moveTo(52, 520);
      ctx.lineTo(1148, 520);
      ctx.stroke();

      // Segmented coloring for footer text
      ctx.fillStyle = textMuted;
      ctx.font = "14px monospace";
      ctx.fillText("Base Points: ", 52, 565);
      
      let offset = 52 + ctx.measureText("Base Points: ").width;
      ctx.fillStyle = "#4C9AF8";
      ctx.fillText(formatNumber(parsePositive(userPoints)), offset, 565);
      
      offset += ctx.measureText(formatNumber(parsePositive(userPoints))).width;
      ctx.fillStyle = textMuted;
      ctx.fillText("  •  Total: ", offset, 565);
      
      offset += ctx.measureText("  •  Total: ").width;
      ctx.fillStyle = "#4C9AF8";
      const displayTotal = parsePositive(userPoints) + (showExtraPoints ? twitterExtraPoints : 0);
      ctx.fillText(formatNumber(displayTotal), offset, 565);

      if (twitterExtraPoints > 0 && showExtraPoints) {
        offset += ctx.measureText(formatNumber(displayTotal)).width;
        ctx.fillStyle = textMuted;
        ctx.fillText("  •  Extra: ", offset, 565);
        
        offset += ctx.measureText("  •  Extra: ").width;
        ctx.fillStyle = "#4C9AF8";
        ctx.fillText(`+${formatNumber(twitterExtraPoints)}`, offset, 565);
      }

      ctx.fillStyle = "#4C9AF8";
      ctx.textAlign = "right";
      ctx.fillText("variational.io", 1148, 565);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `variational-airdrop-estimate-${formatNumber(parsePositive(userPoints) + twitterExtraPoints)}.png`;
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
  const activeTab = "estimator";

  return (
    <main className="relative min-h-screen bg-[#050507] text-zinc-100 font-sans antialiased selection:bg-[#1E2026] selection:text-white pb-24">
      {/* Background soft grid */}
      <div 
        className="absolute inset-0 -z-20 opacity-[0.02]" 
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-full max-w-7xl h-[400px] bg-gradient-to-b from-[#4C9AF8]/3 to-transparent blur-[120px] pointer-events-none" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pt-10 sm:px-8">
        
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-[#1E2026]/40 pb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/variational-wordmark-white.svg"
              alt="Variational"
              width={140}
              height={20}
              priority
              className="opacity-90"
            />
            <span className="hidden sm:inline-block h-4 w-px bg-[#1E2026]" />
            
            <nav className="flex items-center gap-6 font-mono text-[10px] tracking-[0.2em] uppercase">
              <button 
                onClick={() => setTab("estimator")}
                className={`transition font-bold cursor-pointer ${activeTab === "estimator" ? "text-white" : "text-[#64748B] hover:text-[#CBD5E1]"}`}
              >
                Points Estimator
              </button>
              {/* {isDuneActive && (
                <button 
                  onClick={() => setTab("stats")}
                  className={`transition font-bold cursor-pointer ${activeTab === "stats" ? "text-white" : "text-[#64748B] hover:text-[#CBD5E1]"}`}
                >
                  Statistics
                </button>
              )} */}
            </nav>
          </div>

          {/* OMNI promo widget */}
          <div className="hidden lg:flex items-center gap-1.5">
            <a
              href="https://omni.variational.io/?ref=OMNIKLJ9FBUC"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-6 items-center justify-center rounded-full border border-[#4C9AF8]/25 bg-[#0C0D11]/40 px-3.5 text-[8px] font-extrabold text-[#4C9AF8] hover:bg-[#4C9AF8]/5 hover:border-[#4C9AF8]/50 transition uppercase tracking-[0.06em] gap-1.5 cursor-pointer"
            >
              <span>Claim +12% Points Boost & Bronze Tier on Omni</span>
              <span className="text-[9px]">➔</span>
            </a>
            <button
              onClick={handleCopyReferralCode}
              className="group inline-flex h-6 items-center justify-center rounded-full border border-[#1E2026] bg-[#0C0D11]/40 px-3.5 text-[8px] font-extrabold uppercase tracking-[0.06em] transition hover:bg-[#1E2026]/30 hover:border-zinc-700 cursor-pointer gap-1.5"
              title="Click to copy code"
            >
              <span className="text-[#64748B] font-extrabold">CODE:</span>
              <span className="font-mono text-[#CBD5E1] group-hover:text-white font-extrabold transition-colors">
                {copied ? "COPIED!" : "OMNIKLJ9FBUC"}
              </span>
              <svg className="size-3 text-[#64748B] group-hover:text-[#CBD5E1] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://x.com/atoms_res"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider text-[#94A3B8] hover:text-[#4C9AF8] transition-colors uppercase"
            >
              created by @atoms_res
            </a>
            <span className="hidden sm:inline-block h-3.5 w-px bg-[#1E2026]" />
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] tracking-wider text-[#64748B] uppercase">
                {marketStatus === "ready" ? "Prediction Data Active" : "Local Engine"}
              </span>
            </div>
          </div>
        </header>

        {activeTab === "estimator" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch animate-slide-fade-in">

            {/* COLUMN 1: INPUTS (Span 3) */}
            <div className="lg:col-span-3 flex flex-col gap-4 bg-[#050507]/40 p-4 rounded-xl justify-between overflow-y-auto max-h-[calc(100vh-140px)]">
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">Settings</h2>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Configure model inputs and supply specs.</p>
                </div>

                {/* WALLET LOOKUP */}
                {hasLeaderboard && (
                  <div className="flex flex-col gap-1.5 border-b border-[#1E2026] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Sync via Wallet</span>
                    <div className="flex gap-1.5">
                      <input
                        className="flex-1 h-8 rounded-md bg-[#121318] border-0 px-2.5 font-mono text-[11px] text-white outline-none focus:ring-1 focus:ring-zinc-700 transition"
                        placeholder="0x..."
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                      />
                      <button
                        onClick={handleWalletLookup}
                        disabled={isSearching}
                        className="h-8 px-3 rounded-md bg-[#4C9AF8] hover:bg-[#3b8ae8] text-white font-bold text-[10px] uppercase tracking-wider transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center"
                      >
                        {isSearching ? "..." : "Sync"}
                      </button>
                    </div>
                    {searchError && <span className="text-[9px] text-rose-500 font-medium">{searchError}</span>}
                  </div>
                )}

                {/* YOUR POINTS */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Your Points</span>
                  <input
                    className="h-9 rounded-md bg-[#121318] border-0 px-3 font-mono text-xs font-semibold text-white outline-none focus:ring-1 focus:ring-zinc-700 transition w-full"
                    inputMode="decimal"
                    value={userPoints}
                    onChange={(event) => setUserPoints(event.target.value)}
                  />
                </div>

                {/* TOTAL SYSTEM POINTS */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Total System Points</span>
                  <input
                    className="h-9 rounded-md bg-[#121318] border-0 px-3 font-mono text-xs font-semibold text-white outline-none focus:ring-1 focus:ring-zinc-700 transition w-full"
                    inputMode="decimal"
                    value={totalPoints}
                    onChange={(event) => setTotalPoints(event.target.value)}
                  />
                </div>

                {/* AIRDROP SUPPLY BUTTONS */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Airdrop Pool Size</span>
                  <div className="grid grid-cols-5 gap-1 mt-1">
                    {airdropOptions.map((option) => (
                      <button
                        key={option}
                        className={`h-7 rounded-md text-[10px] font-bold transition flex items-center justify-center ${
                          option === airdropPct
                            ? "bg-white text-black font-extrabold"
                            : "bg-[#0C0D11] text-[#94A3B8] hover:bg-[#1E2026] hover:text-white"
                        }`}
                        onClick={() => setAirdropPct(option)}
                      >
                        {option}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* TWITTER REACH BONUS */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Twitter Reach Bonus</span>
                      <span className="text-[7.5px] text-[#64748B]/60 font-mono uppercase tracking-wide">(Possible Extra Points)</span>
                    </div>
                    {twitterExtraPoints > 0 && (
                      <span className="text-[9px] font-bold text-[#4C9AF8] self-start mt-0.5">
                        +{formatNumber(twitterExtraPoints)} pts
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B] text-[10px] font-mono">@</span>
                      <input
                        className="w-full h-8 rounded-md bg-[#121318] border-0 pl-6 pr-2.5 font-mono text-[10px] text-white outline-none focus:ring-1 focus:ring-zinc-700 transition"
                        placeholder="username"
                        value={twitterUsername}
                        onChange={(e) => setTwitterUsername(e.target.value.replace(/^@+/, ""))}
                      />
                    </div>
                    <button
                      onClick={handleCheckTwitterBonus}
                      disabled={twitterStatus === "checking" || !twitterUsername.trim()}
                      className="h-8 px-2.5 rounded-md bg-[#1E2026] hover:bg-zinc-700 text-[#CBD5E1] font-bold text-[9px] uppercase tracking-wider transition active:scale-95 disabled:opacity-40 cursor-pointer min-w-[50px]"
                    >
                      {twitterStatus === "checking" ? "..." : "CHECK"}
                    </button>
                  </div>
                  {twitterStatus === "success" && twitterStats && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="text-[9px] text-[#4C9AF8] font-bold text-center bg-[#4C9AF8]/10 border border-[#4C9AF8]/20 py-1 rounded">
                        Earned +{formatNumber(twitterExtraPoints)} Extra Points!
                      </div>
                      <div className="flex flex-col gap-1 text-[9px] text-[#64748B] font-mono px-0.5">
                        <div className="flex justify-between">
                          <span>Posts:</span>
                          <span className="text-[#CBD5E1] font-bold">{twitterStats.tweetsCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Views:</span>
                          <span className="text-[#CBD5E1] font-bold">{formatNumber(twitterStats.views)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Likes:</span>
                          <span className="text-[#CBD5E1] font-bold">{formatNumber(twitterStats.likes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Retweets:</span>
                          <span className="text-[#CBD5E1] font-bold">{formatNumber(twitterStats.retweets)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {twitterStatus === "error" && (
                    <div className="text-[9px] text-rose-500 font-medium leading-tight">{twitterError}</div>
                  )}
                </div>
              </div>

              {/* STAT SUMMARY (LOWER SIDEBAR) */}
              <div className="border-t border-[#1E2026] pt-3 flex flex-col gap-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total Supply</span>
                  <span className="font-mono text-white font-semibold">{formatNumber(TOTAL_SUPPLY)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Airdrop Supply</span>
                  <span className="font-mono text-white font-semibold">{formatNumber(results.airdropSupply)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Token Price @ FDV</span>
                  <span className="font-mono text-[#4C9AF8] font-semibold">{formatUsd(results.tokenPrice)}</span>
                </div>
              </div>
            </div>

            {/* COLUMN 2: HERO EXPECTED ALLOCATION & GRID SCENARIOS (Span 6) */}
            <div className="lg:col-span-6 flex flex-col gap-4 max-h-[calc(100vh-140px)]">
              
              {/* HERO BLOCK: DENSITY REDUCED & HIGH-IMPACT */}
              <div className="bg-zinc-950/40 rounded-xl p-5 flex flex-col justify-between min-h-[140px] py-4 relative overflow-hidden">
                <div className="flex items-start justify-between z-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B]">
                      POSSIBLE AIRDROP ALLOCATION
                    </span>
                    <span className="text-[9px] text-[#64748B] mt-0.5">
                      Expected value at TGE based on chosen scenario
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#4C9AF8] bg-[#4C9AF8]/10 border border-[#4C9AF8]/20 px-2 py-0.5 rounded-md">
                    {fdvLabel(fdv)} FDV SCENARIO
                  </span>
                </div>

                <div className="font-mono font-bold text-[#4C9AF8] tracking-tight text-4xl sm:text-5xl mt-2 z-10">
                  <AnimatedNumber value={results.expectedValue} />
                </div>

                {/* 3 Metrics below */}
                <div className="grid grid-cols-3 border-t border-[#1E2026] pt-3 mt-2 text-[10px]">
                  <div>
                    <span className="text-[#64748B] uppercase tracking-wider text-[8px] font-bold">Pool Share</span>
                    <p className="font-mono font-bold text-white mt-0.5">{(results.share * 100).toFixed(6)}%</p>
                  </div>
                  <div className="border-l border-[#1E2026] pl-4">
                    <span className="text-[#64748B] uppercase tracking-wider text-[8px] font-bold">Est. Tokens</span>
                    <p className="font-mono font-bold text-white mt-0.5">{formatNumber(results.estimatedTokens)}</p>
                  </div>
                  <div className="border-l border-[#1E2026] pl-4">
                    <span className="text-[#64748B] uppercase tracking-wider text-[8px] font-bold">Token Price</span>
                    <p className="font-mono font-bold text-[#4C9AF8] mt-0.5">{formatUsd(results.tokenPrice)}</p>
                  </div>
                </div>
              </div>

              {/* TABLE BLOCK: COMPACT TABLE WITH POLYMARKET ODDS */}
              <div className="bg-[#050507]/40 rounded-xl flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1E2026] flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">FDV Scenarios Grid</span>
                  <span className="text-[8px] text-[#64748B] font-mono">Click rows to switch scenario</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead className="border-b border-[#1E2026] bg-[#121318]/40 text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2 font-bold uppercase tracking-wider w-10 text-center">Select</th>
                        <th className="px-4 py-2 font-bold uppercase tracking-wider">FDV</th>
                        <th className="px-4 py-2 font-bold uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1">
                            Odds
                            <Image
                              className="size-2.5 invert opacity-60 object-contain"
                              src="/polymarket-vector.png"
                              alt=""
                              width={10}
                              height={10}
                            />
                          </span>
                        </th>
                        <th className="px-4 py-2 font-bold uppercase tracking-wider">Price</th>
                        <th className="px-4 py-2 font-bold uppercase tracking-wider">Allocation</th>
                        <th className="px-4 py-2 font-bold uppercase tracking-wider text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2026]/40 font-mono">
                      {results.scenarios.map((scenario) => {
                        const active = scenario.fdv === fdv;
                        return (
                          <tr
                            key={scenario.fdv}
                            onClick={() => setFdv(scenario.fdv)}
                            className={`cursor-pointer transition duration-100 hover:bg-[#1E2026] hover:text-white ${
                              active ? "bg-[#1E2026]/60 text-white font-bold" : "text-[#94A3B8]"
                            }`}
                          >
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center">
                                <div className={`size-3.5 rounded-full border flex items-center justify-center transition-colors ${
                                  active ? "border-[#4C9AF8] bg-[#4C9AF8]/10" : "border-[#64748B]/40"
                                }`}>
                                  {active && <div className="size-1.5 rounded-full bg-[#4C9AF8]" />}
                                </div>
                              </div>
                            </td>
                            <td className={`px-4 py-2.5 font-bold ${active ? "text-[#4C9AF8]" : ""}`}>{fdvLabel(scenario.fdv)}</td>
                            <td className="px-4 py-2.5">
                              <PolymarketChance 
                                value={fdvMarkets.find((market) => market.fdv === scenario.fdv)?.yesChance} 
                                showIcon={false}
                              />
                            </td>
                            <td className="px-4 py-2.5">{formatUsd(scenario.tokenPrice)}</td>
                            <td className="px-4 py-2.5">{formatNumber(results.estimatedTokens, 0)}</td>
                            <td className={`px-4 py-2.5 text-right font-bold ${active ? "text-[#4C9AF8]" : "text-[#CBD5E1]"}`}>
                              {formatUsd(scenario.value)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* COLUMN 3: SHARE PREVIEW & POLYMARKET INSIGHT (Span 3) */}
            <div className="lg:col-span-3 flex flex-col gap-4 justify-between max-h-[calc(100vh-140px)]">
              
              {/* MINI CARD PREVIEW */}
              <div className="bg-[#050507]/40 rounded-xl p-4 flex flex-col justify-between flex-1">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#CBD5E1]">Share Card Preview</span>
                    <span className="text-[8px] text-[#64748B] font-mono">1.91:1 PNG</span>
                  </div>

                  <div 
                    className="relative overflow-hidden rounded-lg border border-[#4C9AF8]/15 bg-[#050507] bg-cover bg-bottom bg-no-repeat p-2.5 flex flex-col justify-between aspect-[1.91/1] w-full shadow-lg"
                    style={{ backgroundImage: "url('/brand/wave-dark.png')" }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#1E2026]/40 pb-1">
                      <div className="flex items-center gap-1">
                        <svg className="h-2.5 w-3 text-white flex-shrink-0" viewBox="0 0 368 260" fill="currentColor">
                          <path fillRule="evenodd" clipRule="evenodd" d="M184.119 0.554062C215.75 0.554062 244.399 20.8274 256.232 50.8548L317.757 216.482C321.032 224.33 328.396 229.367 336.279 229.367H368.808V259.336H336.279C315.948 259.336 297.322 246.119 290.126 226.468L272.766 179.775C269.657 171.499 262.078 166.14 253.947 166.139C245.761 166.139 238.231 171.36 235.139 179.754L235.128 179.775L217.769 226.468C210.573 246.118 191.946 259.335 171.615 259.336H0V229.367H32.1586C40.1273 229.365 47.8672 223.98 50.9671 215.731L111.645 52.2934C123.113 21.4959 151.968 0.555387 184.119 0.554062ZM184.119 30.5229C164.337 30.5242 145.991 43.4339 138.8 63.0094V63.0306L76.9162 229.367H101.797C109.771 229.364 117.52 223.969 120.616 215.71L159.629 110.761V110.74C169.232 85.1888 192.485 68.3622 219.038 68.3622C223.426 68.3625 227.755 68.8635 231.954 69.8114L229.098 62.1314C221.498 43.005 203.562 30.5229 184.119 30.5229ZM218.848 98.5214C204.676 98.5218 192.097 107.306 186.774 121.508L146.554 229.367H171.424C179.4 229.367 187.158 223.971 190.254 215.71L207.603 169.027C214.845 149.573 232.438 136.548 252.667 136.35H253.63C254.577 136.351 255.51 136.385 256.423 136.445L250.911 121.477C245.759 107.65 232.99 98.5224 218.848 98.5214Z" />
                        </svg>
                        <div className="flex flex-col">
                          <span className="font-mono text-[5px] font-bold text-white leading-none">VARIATIONAL</span>
                          <span className="text-[3.5px] font-bold text-[#4C9AF8] tracking-widest uppercase mt-0.5">Points Estimator</span>
                        </div>
                      </div>
                      <div className="text-[4px] font-bold text-[#4C9AF8] bg-[#4C9AF8]/10 border border-[#4C9AF8]/20 px-1 py-0.5 rounded-full uppercase leading-none">
                        TGE Allocation Estimate
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex items-stretch gap-2.5 my-auto">
                      {/* Left: Expected TGE Value */}
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B]">Estimated TGE Value</span>
                        <span className="text-[12px] font-bold font-mono tracking-tight text-[#4C9AF8] leading-tight mt-0.5">
                          <AnimatedNumber value={results.expectedValue} />
                        </span>
                        <span className="text-[4px] font-semibold text-zinc-500 mt-1">
                          Based on {fdvLabel(fdv)} FDV & {airdropPct}% Pool
                        </span>
                      </div>

                      {/* Middle Vertical line */}
                      <div className="w-[0.5px] bg-[#1E2026]" />

                      {/* Right: Stats Layout */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        {twitterUsername.trim() && showExtraPoints ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            {/* Your Points */}
                            <div className="flex flex-col">
                              <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B]">Your Points</span>
                              <span className="text-[8px] font-bold font-mono text-[#4C9AF8] leading-none mt-0.5">
                                {formatNumber(parsePositive(userPoints) + twitterExtraPoints)}
                              </span>
                            </div>
                            {/* Pool Share */}
                            <div className="flex flex-col border-l border-[#1E2026] pl-1.5">
                              <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B]">Pool Share</span>
                              <span className="text-[6.5px] font-bold font-mono text-white leading-none mt-0.5">{(results.share * 100).toFixed(4)}%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B]">Your Points</span>
                            <span className="text-[10px] font-bold font-mono text-[#4C9AF8] leading-none mt-0.5">
                              {formatNumber(parsePositive(userPoints))}
                            </span>
                          </div>
                        )}

                        {/* Horizontal divide line */}
                        <div className="h-[0.5px] bg-[#1E2026] my-1" />

                        {/* Bottom Row */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {twitterUsername.trim() && showExtraPoints ? (
                            <>
                              {/* Est. Tokens */}
                              <div className="flex flex-col">
                                <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B]">Est. Tokens</span>
                                <span className="text-[6.5px] font-bold font-mono text-white leading-none mt-0.5">{formatNumber(results.estimatedTokens, 0)}</span>
                              </div>
                              {/* Twitter handle */}
                              <div className="flex flex-col border-l border-[#1E2026] pl-1.5 truncate">
                                <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B] truncate">𝕏 @{twitterUsername}</span>
                                <span className="text-[6.5px] font-bold font-mono text-[#4C9AF8] leading-none mt-0.5">+{formatNumber(twitterExtraPoints)}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Pool Share */}
                              <div className="flex flex-col">
                                <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B]">Pool Share</span>
                                <span className="text-[6.5px] font-bold font-mono text-white leading-none mt-0.5">{(results.share * 100).toFixed(4)}%</span>
                              </div>
                              {/* Est. Tokens */}
                              <div className="flex flex-col border-l border-[#1E2026] pl-1.5">
                                <span className="text-[4.5px] font-bold uppercase tracking-wider text-[#64748B]">Est. Tokens</span>
                                <span className="text-[6.5px] font-bold font-mono text-white leading-none mt-0.5">{formatNumber(results.estimatedTokens, 0)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between border-t border-[#1E2026]/40 pt-1 text-[4px] text-[#64748B] font-mono leading-none">
                      <span>
                        Base Pts: <span className="text-[#4C9AF8] font-bold">{formatNumber(parsePositive(userPoints))}</span> • Total: <span className="text-[#4C9AF8] font-bold">{formatNumber(parsePositive(userPoints) + (showExtraPoints ? twitterExtraPoints : 0))}</span>
                      </span>
                      <span className="text-[#4C9AF8] font-bold">variational.io</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-[#4C9AF8] hover:bg-[#3b8ae8] text-white py-1.5 text-[8.5px] font-bold uppercase tracking-[0.16em] transition active:scale-95 cursor-pointer"
                  >
                    Show & Export Card
                  </button>
                </div>
              </div>

              {/* POLYMARKET INSIGHT */}
              {selectedMarket && (
                <div className="bg-[#050507]/40 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-[#64748B] uppercase">
                      <Image className="size-3.5 invert opacity-50" src="/polymarket-vector.png" alt="" width={14} height={14} />
                      Prediction Insight
                    </span>
                    <a href={selectedMarket.url} target="_blank" rel="noreferrer" className="text-[9px] text-[#4C9AF8] hover:underline font-bold">
                      View Market
                    </a>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] font-medium leading-snug">{selectedMarket.question}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-[#4C9AF8]">{chanceLabel(selectedMarket.yesChance)}</span>
                    <span className="text-[8px] text-[#64748B]">chance • Vol: {formatUsd(selectedMarket.volumeTotal)}</span>
                  </div>
                </div>
              )}
            </div>

          </div>


        ) : (
          <div className="flex flex-col gap-12 animate-fade-in">
            {/* STATS OVERVIEW CARDS */}
            <div className={`grid gap-6 ${isDuneActive ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
              <div className="bg-[#050507]/40 p-6 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase">Implied Expected FDV</span>
                <div className="mt-2.5 font-mono text-2xl font-bold text-white">
                  {formatUsd(stats.expectedFdv)}
                </div>
                <p className="text-[9px] text-[#64748B] mt-1">Weighted expectation across odds.</p>
              </div>
              
              <div className="bg-[#050507]/40 p-6 rounded-xl">
                <span className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase">Leading FDV Scenario</span>
                <div className="mt-2.5 font-mono text-2xl font-bold text-[#4C9AF8]">
                  {stats.leadingScenario ? fdvLabel(stats.leadingScenario.fdv) : "$500M"}
                </div>
                <p className="text-[9px] text-[#64748B] mt-1">
                  Highest probability: {stats.leadingScenario ? chanceLabel(stats.leadingScenario.yesChance) : "n/a"}
                </p>
              </div>

              {isDuneActive && (
                <>
                  <div className="bg-[#050507]/40 p-6 rounded-xl animate-fade-in">
                    <span className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase">24h Trading Volume</span>
                    <div className="mt-2.5 font-mono text-2xl font-bold text-zinc-200">
                      {formatUsd(duneData.totalVolume24h)}
                    </div>
                    <p className="text-[9px] text-[#64748B] mt-1">Real-time cleared volume (Dune).</p>
                  </div>

                  <div className="bg-[#050507]/40 p-6 rounded-xl animate-fade-in">
                    <span className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase">Open Interest</span>
                    <div className="mt-2.5 font-mono text-2xl font-bold text-zinc-200">
                      {formatUsd(duneData.totalOpenInterest)}
                    </div>
                    <p className="text-[9px] text-[#64748B] mt-1">Active contract positions (Dune).</p>
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
              {/* Left: Probability Weight Distribution Chart */}
              <div className={isDuneActive ? "lg:col-span-7 flex flex-col gap-6 bg-[#050507]/20 p-6 rounded-xl" : "lg:col-span-12 flex flex-col gap-6 bg-[#050507]/20 p-6 rounded-xl"}>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">FDV Probability Curve</h3>
                  <p className="text-xs text-[#64748B] mt-1">Relative chance of each FDV scenario based on prediction odds.</p>
                </div>

                <div className="flex flex-col gap-4 pt-2">
                  {activeFdvOptions.map((option) => {
                    const m = fdvMarkets.find((market) => market.fdv === option);
                    const chance = m?.yesChance ?? 0;
                    const pct = Math.round(chance * 100);
                    return (
                      <div key={option} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#CBD5E1] font-bold">{fdvLabel(option)} FDV</span>
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
                <div className="lg:col-span-5 flex flex-col gap-6 bg-[#050507]/20 p-6 rounded-xl animate-fade-in">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">Top Points Leaderboard</h3>
                    <p className="text-xs text-[#64748B] mt-1">Leaderboard positions synced from Dune Analytics.</p>
                  </div>

                  <div className="overflow-y-auto max-h-[220px] pr-1.5 scrollbar-thin">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[#1E2026] text-[#64748B] pb-2">
                          <th className="pb-2 font-bold uppercase">Rank</th>
                          <th className="pb-2 font-bold uppercase">Address</th>
                          <th className="pb-2 font-bold uppercase text-right">Points</th>
                          <th className="pb-2 font-bold uppercase text-right">Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2026]/40">
                        {duneData.leaderboard.map((user: any) => (
                          <tr key={user.rank} className="hover:bg-zinc-900/10">
                            <td className="py-2 text-[#94A3B8]">#{user.rank}</td>
                            <td className="py-2 text-[#CBD5E1]">{user.address}</td>
                            <td className="py-2 text-right font-bold text-zinc-200">{formatNumber(user.points)}</td>
                            <td className="py-2 text-right">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                user.tier === "Gold" ? "bg-[#121318]mber-500/10 text-amber-400" :
                                user.tier === "Silver" ? "bg-zinc-400/10 text-[#CBD5E1]" :
                                "bg-[#121318]mber-800/10 text-amber-700"
                              }`}>
                                {user.tier}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px] text-[#64748B] border-t border-[#1E2026] pt-3">
                    <span>Source: Dune Analytics</span>
                    <span>Status: Live Sync</span>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-5 flex flex-col gap-6 bg-[#050507]/20 p-6 rounded-xl animate-fade-in">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">Protocol Statistics</h3>
                    <p className="text-xs text-[#64748B] mt-1">Real-time trading and infrastructure health metrics from Dune.</p>
                  </div>

                  <div className="flex flex-col gap-4 font-mono">
                    <div className="flex items-center justify-between py-2 border-b border-[#1E2026]">
                      <span className="text-[10px] text-[#64748B] uppercase font-sans font-bold">Active Markets</span>
                      <span className="text-xs font-bold text-[#CBD5E1]">{duneData?.activeMarkets ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#1E2026]">
                      <span className="text-[10px] text-[#64748B] uppercase font-sans font-bold">Avg Funding Rate</span>
                      <span className="text-xs font-bold text-[#4C9AF8]">
                        {(duneData?.avgFundingRatePct ?? 0).toFixed(4)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#1E2026]">
                      <span className="text-[10px] text-[#64748B] uppercase font-sans font-bold">Data Status</span>
                      <span className="text-xs font-bold text-emerald-500">Live Sync</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[10px] text-[#64748B] uppercase font-sans font-bold">Dune Source</span>
                      <span className="text-xs text-[#94A3B8]">Query #{duneData?.queryId || 6548904}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-[#64748B] border-t border-[#1E2026] pt-3">
                    <span>Source: Dune Analytics</span>
                    <span>Status: Connected</span>
                  </div>
                </div>
              )}
            </div>

            {/* Prediction Markets Activity (Secondary) */}
            <div className="border-t border-[#1E2026]/80 pt-8 mt-4">
              <div className="flex flex-col gap-1.5 mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748B]">
                  Prediction Markets Insights
                </h3>
                <p className="text-xs text-[#64748B]">
                  Secondary market statistics and implied contract pricing for the Variational token.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fdvMarkets.length > 0 ? (
                  fdvMarkets.map((market) => (
                    <div 
                      key={market.conditionId}
                      className="bg-[#050507]/20 p-4 rounded-lg flex flex-col justify-between gap-3 text-[11px]"
                    >
                      <p className="text-[#94A3B8] font-medium leading-relaxed">{market.question}</p>
                      <div className="flex items-center justify-between border-t border-[#1E2026]/30 pt-2 text-[10px] text-[#64748B] font-mono">
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
                  <div className="col-span-full text-center py-8 bg-[#050507]/20 rounded-xl text-[#64748B] text-xs">
                    No prediction market data available at this time.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </section>
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C0D11]lack/85 backdrop-blur-md animate-fade-in">
          <div className="relative bg-[#050507] border border-[#1E2026] rounded-2xl max-w-[840px] w-full p-6 flex flex-col gap-6 animate-slide-fade-in shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2026]">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Export Estimate Card</h3>
                <p className="text-[10px] text-[#64748B]">Configure theme options and download your high-quality card.</p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Toggle Show Extra Points */}
                {twitterUsername.trim() ? (
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B] hover:text-zinc-350 cursor-pointer select-none transition">
                    <input
                      type="checkbox"
                      checked={showExtraPoints}
                      onChange={(e) => setShowExtraPoints(e.target.checked)}
                      className="rounded border-[#1E2026] bg-zinc-900 text-[#4C9AF8] focus:ring-0 focus:ring-offset-0 size-3.5 cursor-pointer accent-[#4C9AF8]"
                    />
                    <span>Show Extras</span>
                  </label>
                ) : null}

                {/* Embedded Theme Selector */}
                <div className="flex bg-[#121318] p-0.5 rounded-lg border border-[#1E2026]/80">
                  <button
                    onClick={() => setShareCardTheme("dark")}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                      shareCardTheme === "dark"
                        ? "bg-[#4C9AF8] text-white"
                        : "text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setShareCardTheme("light")}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                      shareCardTheme === "light"
                        ? "bg-[#4C9AF8] text-white"
                        : "text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    Light
                  </button>
                </div>

                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-[#1E2026] text-[#94A3B8] hover:text-white border border-[#1E2026] transition cursor-pointer"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex justify-center items-center py-2 overflow-x-auto">
              <div
                className={`relative overflow-hidden rounded-2xl border bg-cover bg-[#0C0D11]ottom bg-no-repeat flex flex-col justify-between aspect-[1.91/1] w-full max-w-[780px] p-6 shadow-xl transition-all duration-300 ${
                  shareCardTheme === "light"
                    ? "bg-slate-50 border-zinc-200/80 text-zinc-900"
                    : "bg-[#050507] border-[#4C9AF8]/20 text-white"
                }`}
                style={{ backgroundImage: shareCardTheme === "light" ? "url('/brand/wave-light.png')" : "url('/brand/wave-dark.png')" }}
              >
                {/* Subtle giant background logo icon */}
                <svg className={`absolute right-[-40px] bottom-[-20px] pointer-events-none scale-150 ${shareCardTheme === "light" ? "text-zinc-900 opacity-[0.01]" : "text-[#4C9AF8] opacity-[0.02]"}`} width="300" height="212" viewBox="0 0 368 260" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M184.119 0.554062C215.75 0.554062 244.399 20.8274 256.232 50.8548L317.757 216.482C321.032 224.33 328.396 229.367 336.279 229.367H368.808V259.336H336.279C315.948 259.336 297.322 246.119 290.126 226.468L272.766 179.775C269.657 171.499 262.078 166.14 253.947 166.139C245.761 166.139 238.231 171.36 235.139 179.754L235.128 179.775L217.769 226.468C210.573 246.118 191.946 259.335 171.615 259.336H0V229.367H32.1586C40.1273 229.365 47.8672 223.98 50.9671 215.731L111.645 52.2934C123.113 21.4959 151.968 0.555387 184.119 0.554062ZM184.119 30.5229C164.337 30.5242 145.991 43.4339 138.8 63.0094V63.0306L76.9162 229.367H101.797C109.771 229.364 117.52 223.969 120.616 215.71L159.629 110.761V110.74C169.232 85.1888 192.485 68.3622 219.038 68.3622C223.426 68.3625 227.755 68.8635 231.954 69.8114L229.098 62.1314C221.498 43.005 203.562 30.5229 184.119 30.5229ZM218.848 98.5214C204.676 98.5218 192.097 107.306 186.774 121.508L146.554 229.367H171.424C179.4 229.367 187.158 223.971 190.254 215.71L207.603 169.027C214.845 149.573 232.438 136.548 252.667 136.35H253.63C254.577 136.351 255.51 136.385 256.423 136.445L250.911 121.477C245.759 107.65 232.99 98.5224 218.848 98.5214Z" />
                </svg>

                {/* Header row */}
                <div className={`flex items-center justify-between border-b pb-3 ${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}`}>
                  <div className="flex items-center gap-2.5">
                    <svg className={`h-[22px] w-[31px] flex-shrink-0 ${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}`} viewBox="0 0 368 260" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M184.119 0.554062C215.75 0.554062 244.399 20.8274 256.232 50.8548L317.757 216.482C321.032 224.33 328.396 229.367 336.279 229.367H368.808V259.336H336.279C315.948 259.336 297.322 246.119 290.126 226.468L272.766 179.775C269.657 171.499 262.078 166.14 253.947 166.139C245.761 166.139 238.231 171.36 235.139 179.754L235.128 179.775L217.769 226.468C210.573 246.118 191.946 259.335 171.615 259.336H0V229.367H32.1586C40.1273 229.365 47.8672 223.98 50.9671 215.731L111.645 52.2934C123.113 21.4959 151.968 0.555387 184.119 0.554062ZM184.119 30.5229C164.337 30.5242 145.991 43.4339 138.8 63.0094V63.0306L76.9162 229.367H101.797C109.771 229.364 117.52 223.969 120.616 215.71L159.629 110.761V110.74C169.232 85.1888 192.485 68.3622 219.038 68.3622C223.426 68.3625 227.755 68.8635 231.954 69.8114L229.098 62.1314C221.498 43.005 203.562 30.5229 184.119 30.5229ZM218.848 98.5214C204.676 98.5218 192.097 107.306 186.774 121.508L146.554 229.367H171.424C179.4 229.367 187.158 223.971 190.254 215.71L207.603 169.027C214.845 149.573 232.438 136.548 252.667 136.35H253.63C254.577 136.351 255.51 136.385 256.423 136.445L250.911 121.477C245.759 107.65 232.99 98.5224 218.848 98.5214Z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className={`font-mono text-[10px] font-bold tracking-wider leading-none ${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}`}>VARIATIONAL</span>
                      <span className="text-[7px] font-bold text-[#4C9AF8] tracking-widest uppercase mt-0.5">Points Estimator</span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#4C9AF8]/15 bg-[#4C9AF8]/4 text-[7px] font-bold tracking-widest text-[#4C9AF8] uppercase`}>
                    TGE Allocation Estimate
                  </div>
                </div>

                {/* Body row: split 2-columns (no outer borders around cards!) */}
                <div className="flex items-stretch gap-6 my-auto">
                  {/* Left: Expected TGE Value */}
                  <div className="flex-1 flex flex-col justify-center min-h-[90px]">
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>Estimated TGE Value</span>
                    <span className={`text-3xl font-bold font-mono tracking-tight mt-1 ${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}`}>
                      {formatUsd(results.expectedValue)}
                    </span>
                    <span className={`text-[7px] font-semibold mt-2 ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-zinc-550"}`}>
                      Based on {fdvLabel(fdv)} FDV & {airdropPct}% Pool
                    </span>
                  </div>

                  {/* Middle Vertical line */}
                  <div className={`w-[1px] ${shareCardTheme === "light" ? "bg-zinc-200" : "bg-zinc-900"}`} />

                  {/* Right: Stats Layout */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    {/* Top Row: grid of 2 cols if Twitter entered, else 1 col */}
                    {twitterUsername.trim() && showExtraPoints ? (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Your Points */}
                        <div className="flex flex-col">
                          <span className={`text-[7px] font-bold uppercase tracking-wider ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>Your Points</span>
                          <span className="text-[15px] font-bold font-mono text-[#4C9AF8] mt-0.5">
                            {formatNumber(parsePositive(userPoints) + twitterExtraPoints)}
                          </span>
                        </div>
                        {/* Pool Share */}
                        <div className={`flex flex-col border-l pl-3 ${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}`}>
                          <span className={`text-[7px] font-bold uppercase tracking-wider ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>Pool Share</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="size-3 text-[#4C9AF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <circle cx="12" cy="12" r="8" className="opacity-20" />
                              <path d="M12 4a8 8 0 0 1 8 8" strokeLinecap="round" />
                            </svg>
                            <span className={`text-[9px] font-bold font-mono ${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}`}>{(results.share * 100).toFixed(4)}%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>Your Points</span>
                        <span className="text-xl font-bold font-mono text-[#4C9AF8] mt-0.5">
                          {formatNumber(parsePositive(userPoints))}
                        </span>
                      </div>
                    )}

                    {/* Horizontal divide line */}
                    <div className={`h-[1px] my-2 ${shareCardTheme === "light" ? "bg-zinc-200" : "bg-zinc-900"}`} />

                    {/* Bottom Row */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* If Twitter is entered: bottom row is Est. Tokens and Twitter handle */}
                      {twitterUsername.trim() && showExtraPoints ? (
                        <>
                          {/* Est. Tokens */}
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[7px] font-bold uppercase tracking-wider ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>Est. Tokens</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <svg className="size-3 text-[#4C9AF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 7h-12a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-10a2 2 0 0 0 -2 -2z" />
                                <path d="M16 14h4v-4h-4z" />
                                <path d="M19 7v-2a2 2 0 0 0 -2 -2h-12" />
                              </svg>
                              <span className={`text-[9px] font-bold font-mono ${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}`}>{formatNumber(results.estimatedTokens, 0)}</span>
                            </div>
                          </div>
                          {/* Twitter handle */}
                          <div className={`flex flex-col gap-0.5 border-l pl-3 ${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}`}>
                            <span className={`text-[7px] font-bold uppercase tracking-wider flex items-center gap-0.5 truncate ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
                              <span className="font-sans font-black">𝕏</span> @{twitterUsername}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-bold font-mono ${twitterExtraPoints > 0 ? "text-[#4C9AF8]" : (shareCardTheme === "light" ? "text-zinc-350" : "text-zinc-650")}`}>
                                {twitterExtraPoints > 0 ? `+${formatNumber(twitterExtraPoints)}` : "0"}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Pool Share */}
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[7px] font-bold uppercase tracking-wider ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>Pool Share</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <svg className="size-3 text-[#4C9AF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="12" cy="12" r="8" className="opacity-20" />
                                <path d="M12 4a8 8 0 0 1 8 8" strokeLinecap="round" />
                              </svg>
                              <span className={`text-[9px] font-bold font-mono ${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}`}>{(results.share * 100).toFixed(4)}%</span>
                            </div>
                          </div>
                          {/* Est. Tokens */}
                          <div className={`flex flex-col gap-0.5 border-l pl-3 ${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}`}>
                            <span className={`text-[7px] font-bold uppercase tracking-wider ${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}`}>Est. Tokens</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <svg className="size-3 text-[#4C9AF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 7h-12a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-10a2 2 0 0 0 -2 -2z" />
                                <path d="M16 14h4v-4h-4z" />
                                <path d="M19 7v-2a2 2 0 0 0 -2 -2h-12" />
                              </svg>
                              <span className={`text-[9px] font-bold font-mono ${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}`}>{formatNumber(results.estimatedTokens, 0)}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer line */}
                <div className={`flex items-center justify-between border-t pt-3 text-[8px] font-mono ${shareCardTheme === "light" ? "border-zinc-200 text-[#94A3B8]" : "border-[#1E2026] text-[#64748B]"}`}>
                  <span>
                    Base Points: <span className="text-[#4C9AF8] font-bold">{formatNumber(parsePositive(userPoints))}</span> • Total: <span className="text-[#4C9AF8] font-bold">{formatNumber(parsePositive(userPoints) + (showExtraPoints ? twitterExtraPoints : 0))}</span>
                    {twitterExtraPoints > 0 && showExtraPoints ? (
                      <> • Extra: <span className="text-[#4C9AF8] font-bold">+{formatNumber(twitterExtraPoints)}</span></>
                    ) : null}
                  </span>
                  <span className="text-[#4C9AF8] font-bold">variational.io</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Compact Right Aligned */}
            <div className="flex justify-end gap-2.5 border-t border-[#1E2026] pt-4">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-[#1E2026] text-[#94A3B8] hover:text-white font-bold text-[10px] uppercase tracking-wider border border-[#1E2026] transition active:scale-95 cursor-pointer"
              >
                Close
              </button>
              <button
                disabled={isDownloading}
                onClick={() => handleDownloadCard(shareCardTheme)}
                className="inline-flex items-center justify-center gap-1.5 px-4.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-black font-bold text-[10px] uppercase tracking-wider transition active:scale-95 disabled:opacity-50 cursor-pointer"
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
                    Download Image
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
