# You can buy a what?

[Live site](https://kush.pw/you-can-buy-a-what/) · [Source code](https://github.com/kbhuw/you-can-buy-a-what)

An independent government property and surplus discovery feed, with 20 handpicked unusual finds and a searchable full catalog.

## Development

Node 22 or later. Run `npm ci`, then `npm run dev`. Build with `npm run build`. Deploy as a Next.js project on Vercel. No application secrets are required.

## Data

The catalog combines GSA real estate and surplus, Treasury, U.S. Marshals, USDA, HUD, FDIC and BLM snapshots. Coverage and limitations are in `data/inventory-coverage.json`. GSA real-estate bids refresh through `/api/catalog`; other inventories are snapshots with per-item timestamps. `/api/surplus-image/[id]` resolves government source images.

`lib/discovery.ts` defines the handpicked collection, its display order and short introductions. The full catalog is not ranked for whimsy. All-items browsing shows published amounts first.

Government and authorized-contractor listings govern eligibility, condition and sale terms. Starting bids are not purchase prices. This project is not affiliated with the U.S. government.

## WebMCP

Compatible browsers can discover six tools while this page is open:
`search_items`, `get_whimsical_items`, `get_item`, `set_shortlist`,
`get_shortlist`, and `show_item`. Search is read-only; showing an item and
saving it update the same React state as the website controls. Shortlists
last for the current page visit and reset on reload.

The integration uses `document.modelContext.registerTool` with an
AbortSignal for cleanup, plus the earlier `navigator.modelContext` API
when available. Unsupported browsers retain normal browsing. No MCP server,
API key, polyfill or additional service is required. Browser/agent WebMCP
support must be enabled separately.

Results include price type, source URL, restrictions and the record's check
time. A bid is not a purchase price; these tools do not place bids or buy items.

Browser checks (requires Python Playwright and its Chromium installation):

```sh
npm run build
npm run start -- --port 4187
# In another terminal:
python3 tests/webmcp.py http://127.0.0.1:4187/you-can-buy-a-what
python3 tests/webmcp-native.py http://127.0.0.1:4187/you-can-buy-a-what
```

The first suite uses API contract doubles for both API versions and checks
unsupported-browser behavior. The second uses Chromium's native experimental
WebMCP testing API, with experimental web platform features enabled.

API reference: https://developer.chrome.com/docs/ai/webmcp/imperative-api

## License

App code is MIT licensed. Government listings, linked photos and documents remain subject to their original source terms; the MIT license does not grant rights to third-party material.
