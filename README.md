# You can buy a what?

An independent government property and surplus discovery feed, with 15 handpicked unusual finds and a searchable full catalog.

## Development

Node 22 or later. Run `npm ci`, then `npm run dev`. Build with `npm run build`. Deploy as a Next.js project on Vercel. No application secrets are required.

## Data

The catalog combines GSA real estate and surplus, Treasury, U.S. Marshals, USDA, HUD, FDIC and BLM snapshots. Coverage and limitations are in `data/inventory-coverage.json`. GSA real-estate bids refresh through `/api/catalog`; other inventories are snapshots with per-item timestamps. `/api/surplus-image/[id]` resolves government source images.

`lib/discovery.ts` defines the handpicked collection, its display order and short introductions. The full catalog is not ranked for whimsy. All-items browsing shows published amounts first.

Government and authorized-contractor listings govern eligibility, condition and sale terms. Starting bids are not purchase prices. This project is not affiliated with the U.S. government.
