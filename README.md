# Variational Airdrop Calculator

Next.js prototype for a Variational points airdrop value estimator.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- React client component for live calculator state

## Formula

```text
expectedValue =
(yourPoints / totalPoints)
* (airdropPct / 100)
* FDV
```

More notes are in `AIRDROP_FORMULA.md`.

## Market Data

FDV scenarios can be loaded from the Polymarket event:

```text
https://polymarket.com/event/variational-fdv-above-one-day-after-launch
```

The app reads this through the Heisenberg API route at
`/api/variational-fdv-markets`. Add your API token to `.env.local`:

```bash
HEISENBERG_API_TOKEN=your_heisenberg_api_token_here
```

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.
