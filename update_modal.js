const fs = require('fs');
const file = 'src/app/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const startTag = '<div className="flex justify-center items-center py-2 overflow-x-auto">';
const startIndex = code.indexOf(startTag);
const endTag = '{/* Action Buttons - Compact Right Aligned */}';
const endIndex = code.indexOf(endTag, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries", { startIndex, endIndex });
    process.exit(1);
}

const replacement = `<div className="flex justify-center items-center py-2 w-full @container">
              <div
                className={\`relative overflow-hidden rounded-[1.5cqw] border bg-cover bg-bottom bg-no-repeat flex flex-col justify-between aspect-[1.91/1] w-full max-w-[780px] p-[3cqw] shadow-xl transition-all duration-300 \${
                  shareCardTheme === "light"
                    ? "bg-slate-50 border-zinc-200/80 text-zinc-900"
                    : "bg-[#050507] border-[#4C9AF8]/20 text-white"
                }\`}
                style={{ backgroundImage: shareCardTheme === "light" ? "url('/brand/wave-light.png')" : "url('/brand/wave-dark.png')" }}
              >
                {/* Subtle giant background logo icon */}
                <svg className={\`absolute right-[-40px] bottom-[-20px] pointer-events-none scale-150 \${shareCardTheme === "light" ? "text-zinc-900 opacity-[0.01]" : "text-[#4C9AF8] opacity-[0.02]"}\`} width="300" height="212" viewBox="0 0 368 260" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M184.119 0.554062C215.75 0.554062 244.399 20.8274 256.232 50.8548L317.757 216.482C321.032 224.33 328.396 229.367 336.279 229.367H368.808V259.336H336.279C315.948 259.336 297.322 246.119 290.126 226.468L272.766 179.775C269.657 171.499 262.078 166.14 253.947 166.139C245.761 166.139 238.231 171.36 235.139 179.754L235.128 179.775L217.769 226.468C210.573 246.118 191.946 259.335 171.615 259.336H0V229.367H32.1586C40.1273 229.365 47.8672 223.98 50.9671 215.731L111.645 52.2934C123.113 21.4959 151.968 0.555387 184.119 0.554062ZM184.119 30.5229C164.337 30.5242 145.991 43.4339 138.8 63.0094V63.0306L76.9162 229.367H101.797C109.771 229.364 117.52 223.969 120.616 215.71L159.629 110.761V110.74C169.232 85.1888 192.485 68.3622 219.038 68.3622C223.426 68.3625 227.755 68.8635 231.954 69.8114L229.098 62.1314C221.498 43.005 203.562 30.5229 184.119 30.5229ZM218.848 98.5214C204.676 98.5218 192.097 107.306 186.774 121.508L146.554 229.367H171.424C179.4 229.367 187.158 223.971 190.254 215.71L207.603 169.027C214.845 149.573 232.438 136.548 252.667 136.35H253.63C254.577 136.351 255.51 136.385 256.423 136.445L250.911 121.477C245.759 107.65 232.99 98.5224 218.848 98.5214Z" />
                </svg>

                {/* Header row */}
                <div className={\`flex items-center justify-between border-b pb-[1.5cqw] \${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}\`}>
                  <div className="flex items-center gap-[1cqw]">
                    <svg className={\`h-[3cqw] w-[4cqw] flex-shrink-0 \${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}\`} viewBox="0 0 368 260" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M184.119 0.554062C215.75 0.554062 244.399 20.8274 256.232 50.8548L317.757 216.482C321.032 224.33 328.396 229.367 336.279 229.367H368.808V259.336H336.279C315.948 259.336 297.322 246.119 290.126 226.468L272.766 179.775C269.657 171.499 262.078 166.14 253.947 166.139C245.761 166.139 238.231 171.36 235.139 179.754L235.128 179.775L217.769 226.468C210.573 246.118 191.946 259.335 171.615 259.336H0V229.367H32.1586C40.1273 229.365 47.8672 223.98 50.9671 215.731L111.645 52.2934C123.113 21.4959 151.968 0.555387 184.119 0.554062ZM184.119 30.5229C164.337 30.5242 145.991 43.4339 138.8 63.0094V63.0306L76.9162 229.367H101.797C109.771 229.364 117.52 223.969 120.616 215.71L159.629 110.761V110.74C169.232 85.1888 192.485 68.3622 219.038 68.3622C223.426 68.3625 227.755 68.8635 231.954 69.8114L229.098 62.1314C221.498 43.005 203.562 30.5229 184.119 30.5229ZM218.848 98.5214C204.676 98.5218 192.097 107.306 186.774 121.508L146.554 229.367H171.424C179.4 229.367 187.158 223.971 190.254 215.71L207.603 169.027C214.845 149.573 232.438 136.548 252.667 136.35H253.63C254.577 136.351 255.51 136.385 256.423 136.445L250.911 121.477C245.759 107.65 232.99 98.5224 218.848 98.5214Z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className={\`font-mono text-[1.5cqw] font-bold tracking-wider leading-none \${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}\`}>VARIATIONAL</span>
                      <span className="text-[1cqw] font-bold text-[#4C9AF8] tracking-widest uppercase mt-[0.3cqw]">Points Estimator</span>
                    </div>
                  </div>
                  
                  <div className={\`flex items-center gap-[0.5cqw] px-[1cqw] py-[0.5cqw] rounded-full border border-[#4C9AF8]/15 bg-[#4C9AF8]/4 text-[1cqw] font-bold tracking-widest text-[#4C9AF8] uppercase\`}>
                    TGE Allocation Estimate
                  </div>
                </div>

                {/* Body row */}
                <div className="flex items-stretch gap-[3cqw] my-auto">
                  {/* Left: Expected TGE Value */}
                  <div className="flex-1 flex flex-col justify-center">
                    <span className={\`text-[1.2cqw] font-bold uppercase tracking-wider \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>Estimated TGE Value</span>
                    <span className={\`text-[4cqw] font-bold font-mono tracking-tight mt-[0.5cqw] \${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}\`}>
                      {formatUsd(results.expectedValue)}
                    </span>
                    <span className={\`text-[1cqw] font-semibold mt-[1cqw] \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-zinc-550"}\`}>
                      Based on {fdvLabel(fdv)} FDV & {airdropPct}% Pool
                    </span>
                  </div>

                  {/* Middle Vertical line */}
                  <div className={\`w-[1px] \${shareCardTheme === "light" ? "bg-zinc-200" : "bg-zinc-900"}\`} />

                  {/* Right: Stats Layout */}
                  <div className="flex-1 flex flex-col justify-between py-[0.5cqw]">
                    {/* Top Row: grid of 2 cols if Twitter entered, else 1 col */}
                    {twitterUsername.trim() && showExtraPoints ? (
                      <div className="grid grid-cols-2 gap-[2cqw]">
                        {/* Your Points */}
                        <div className="flex flex-col">
                          <span className={\`text-[1cqw] font-bold uppercase tracking-wider \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>Your Points</span>
                          <span className="text-[2.2cqw] font-bold font-mono text-[#4C9AF8] mt-[0.3cqw]">
                            {formatNumber(parsePositive(userPoints) + twitterExtraPoints)}
                          </span>
                        </div>
                        {/* Pool Share */}
                        <div className={\`flex flex-col border-l pl-[1.5cqw] \${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}\`}>
                          <span className={\`text-[1cqw] font-bold uppercase tracking-wider \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>Pool Share</span>
                          <div className="flex items-center gap-[0.5cqw] mt-[0.5cqw]">
                            <span className={\`text-[1.3cqw] font-bold font-mono \${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}\`}>{(results.share * 100).toFixed(4)}%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className={\`text-[1.2cqw] font-bold uppercase tracking-wider \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>Your Points</span>
                        <span className="text-[3cqw] font-bold font-mono text-[#4C9AF8] mt-[0.3cqw]">
                          {formatNumber(parsePositive(userPoints))}
                        </span>
                      </div>
                    )}

                    {/* Horizontal divide line */}
                    <div className={\`h-[1px] my-[1cqw] \${shareCardTheme === "light" ? "bg-zinc-200" : "bg-zinc-900"}\`} />

                    {/* Bottom Row */}
                    <div className="grid grid-cols-2 gap-[2cqw]">
                      {/* If Twitter is entered */}
                      {twitterUsername.trim() && showExtraPoints ? (
                        <>
                          <div className="flex flex-col gap-[0.3cqw]">
                            <span className={\`text-[1cqw] font-bold uppercase tracking-wider \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>Est. Tokens</span>
                            <div className="flex items-center gap-[0.5cqw] mt-[0.3cqw]">
                              <span className={\`text-[1.3cqw] font-bold font-mono \${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}\`}>{formatNumber(results.estimatedTokens, 0)}</span>
                            </div>
                          </div>
                          <div className={\`flex flex-col gap-[0.3cqw] border-l pl-[1.5cqw] \${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}\`}>
                            <span className={\`text-[1cqw] font-bold uppercase tracking-wider flex items-center gap-[0.3cqw] truncate \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>
                              <span className="font-sans font-black">𝕏</span> @{twitterUsername}
                            </span>
                            <div className="flex items-center gap-[0.5cqw] mt-[0.3cqw]">
                              <span className={\`text-[1.3cqw] font-bold font-mono \${twitterExtraPoints > 0 ? "text-[#4C9AF8]" : (shareCardTheme === "light" ? "text-zinc-350" : "text-zinc-650")}\`}>
                                {twitterExtraPoints > 0 ? \`+\${formatNumber(twitterExtraPoints)}\` : "0"}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-[0.3cqw]">
                            <span className={\`text-[1cqw] font-bold uppercase tracking-wider \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>Pool Share</span>
                            <div className="flex items-center gap-[0.5cqw] mt-[0.3cqw]">
                              <span className={\`text-[1.3cqw] font-bold font-mono \${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}\`}>{(results.share * 100).toFixed(4)}%</span>
                            </div>
                          </div>
                          <div className={\`flex flex-col gap-[0.3cqw] border-l pl-[1.5cqw] \${shareCardTheme === "light" ? "border-zinc-200" : "border-[#1E2026]"}\`}>
                            <span className={\`text-[1cqw] font-bold uppercase tracking-wider \${shareCardTheme === "light" ? "text-[#94A3B8]" : "text-[#64748B]"}\`}>Est. Tokens</span>
                            <div className="flex items-center gap-[0.5cqw] mt-[0.3cqw]">
                              <span className={\`text-[1.3cqw] font-bold font-mono \${shareCardTheme === "light" ? "text-zinc-900" : "text-white"}\`}>{formatNumber(results.estimatedTokens, 0)}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer section */}
                <div className={\`flex justify-between border-t pt-[1cqw] text-[1cqw] font-mono leading-none \${shareCardTheme === "light" ? "border-zinc-200 text-[#94A3B8]" : "border-zinc-900 text-zinc-500"}\`}>
                  <span>
                    Base Pts: <span className="text-[#4C9AF8] font-bold">{formatNumber(parsePositive(userPoints))}</span> • Total: <span className="text-[#4C9AF8] font-bold">{formatNumber(parsePositive(userPoints) + (showExtraPoints ? twitterExtraPoints : 0))}</span>
                  </span>
                  <span className="text-[#4C9AF8] font-bold">variational.io</span>
                </div>
              </div>
            </div>
            `;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex - 12);
fs.writeFileSync(file, code);
console.log('Modal preview updated to use container queries.');
