# Project Handoff

## Summary

This repository contains a Next.js app for estimating a possible Variational
airdrop from user points. The app is not a perp calculator anymore. Its core
flow is:

1. User enters their Variational points.
2. User chooses the assumed percentage of token supply allocated to airdrop.
3. User chooses a Variational FDV scenario.
4. App estimates token allocation and dollar value.
5. FDV scenarios and odds are loaded from the related Polymarket event.

Current live project stack:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Server route for cached market data

## Important Files

- `src/app/page.tsx`
  Main UI. Contains all current calculator state, formulas, FDV buttons,
  Polymarket odds display, and dark Variational-branded layout.

- `src/app/api/variational-fdv-markets/route.ts`
  Server-side market data aggregator. It fetches the Variational FDV Polymarket
  event data, normalizes FDV levels, estimates Yes odds, and caches the result.

- `src/app/globals.css`
  Global CSS and Tailwind import. Current background/foreground are set for the
  dark dashboard design.

- `public/brand/*`
  Variational brand assets copied from the user-provided brand kit.

- `public/polymarket-vector.png`
  Small Polymarket-style icon shown next to FDV odds.

- `AIRDROP_FORMULA.md`
  Formula notes and current assumptions.

- `.env.example`
  Documents required environment variables.

## Formula

The calculator uses:

```text
airdropSupply = totalSupply * (airdropPct / 100)
tokenPrice = FDV / totalSupply
share = yourPoints / totalPoints
estimatedTokens = share * airdropSupply
expectedValue = estimatedTokens * tokenPrice
```

Simplified:

```text
expectedValue =
(yourPoints / totalPoints)
* (airdropPct / 100)
* FDV
```

Current assumptions:

```text
totalPoints default = 9,000,000
totalSupply = 1,000,000,000
Supply for airdrop steps = 30%, 35%, 40%, 45%, 50%
FDV cap shown from market data = $2B
```

## Market Data

The FDV scenarios come from this Polymarket event:

```text
https://polymarket.com/event/variational-fdv-above-one-day-after-launch
```

The app route is:

```text
GET /api/variational-fdv-markets
```

Data strategy in `route.ts`:

1. Try Polymarket Gamma event endpoint:

```text
https://gamma-api.polymarket.com/events/slug/variational-fdv-above-one-day-after-launch
```

2. If Gamma fails or returns no usable markets, fall back to Heisenberg:

```text
POST https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized
```

Used Heisenberg agents:

```text
agent_id 574 = Polymarket markets by event_slug
agent_id 556 = Polymarket trades by market_slug
```

If Heisenberg fallback is used, odds are estimated from latest trades:

- latest Yes trade price is used directly;
- latest No trade price is inverted as `1 - noPrice`.

The route keeps an in-memory cache:

```text
CACHE_TTL_MS = 5 minutes
```

This means visitors hit the local Next route, not Heisenberg directly.

## Environment

Required for Heisenberg fallback:

```bash
HEISENBERG_API_TOKEN=...
```

Put it in `.env.local` for local work or as a deployment environment variable
on Vercel/hosting. Do not commit `.env.local`.

`.gitignore` already ignores:

```text
.env*
Variational - Brand Assets.zip
```

The user-provided brand zip can remain local. Only the copied assets in
`public/brand` are needed by the app.

## UI Notes

Current design target:

- dark dashboard;
- two main panels:
  - left: `Global assumptions`;
  - right: `Your allocation`;
- brand colors:
  - near-black: `#010612`;
  - blue: `#4C9AF8`;
  - page background: `#020706`;
- active FDV and airdrop buttons use brand blue;
- Polymarket odds show a small local icon from `public/polymarket-vector.png`;
- FDV table highlights the selected scenario.

## Commands

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Current State / Caveats

- Latest pushed commit before this handoff was `b3aaf10`.
- This handoff file may be uncommitted unless the next agent/user commits it.
- The working tree was clean before this file was created.
- `.env.local` exists locally and contains the Heisenberg token, but is ignored.
- `Variational - Brand Assets.zip` exists locally and is ignored.
- `.next`, `node_modules`, and similar generated directories should not be
  committed.
- There may be a local `.next-scaffold-temp` directory from an earlier scaffold
  attempt. It is not required for the app.

## Suggested Next Steps

1. Add wallet lookup only if there is an official Variational points endpoint.
2. Consider moving calculator constants into a separate `src/lib/constants.ts`
   once logic grows.
3. Add an explicit "last updated" timestamp from `/api/variational-fdv-markets`.
4. Add a small note explaining that Polymarket odds are market-implied and not
   official Variational guidance.
5. Deploy with `HEISENBERG_API_TOKEN` configured as a server-side env var.
