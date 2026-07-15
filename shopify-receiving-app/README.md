# Inventory Receiving — Shopify App

An embedded Shopify admin app for barcode-driven inventory receiving:

1. **Start a receiving session** while unpacking a shipment.
2. **Scan UPC/EAN barcodes** (any keyboard-wedge USB/Bluetooth scanner works —
   the scan box is auto-focused). Each scan looks the variant up in Shopify by
   its barcode and adds it to the session table; re-scans increment quantity.
3. **See cost, price, and gross margin** per line (cost comes from Shopify's
   "Cost per item"; margin = (price − cost) / price).
4. **Adjust price to hit a target margin** — enter a target margin %, the app
   computes the price, and saving pushes it to Shopify immediately
   (`productVariantsBulkUpdate`).
5. **Print price/barcode labels** (ZPL for Zebra-class thermal printers, sent
   via PrintNode; see "Label printing" below).
6. **Commit the session**: all quantities are applied to the chosen location's
   available inventory in a single `inventoryAdjustQuantities` call with
   reason `received`, then the session locks read-only.

## Stack

Runs on **Cloudflare Workers**: [Remix](https://remix.run) +
[`@shopify/shopify-app-remix`](https://shopify.dev/docs/api/shopify-app-remix)
(embedded auth, session tokens) + [Polaris](https://polaris.shopify.com) UI +
Prisma on **Cloudflare D1** (via `@prisma/adapter-d1`) for session +
receiving-session storage. Local dev uses a local D1 automatically (miniflare
through Vite's Cloudflare dev proxy), so `npm run dev` needs no Cloudflare
account at all.

```
app/
  shopify.server.ts                  # Shopify app config (scopes, auth, API version)
  services/
    margin.ts                        # pure margin math (unit-tested)
    receiving.server.ts              # receiving session persistence (Prisma)
    shopify/
      variantLookup.server.ts        # barcode -> variant (price, unitCost, inventoryItem)
      priceUpdate.server.ts          # productVariantsBulkUpdate
      inventoryCommit.server.ts      # inventoryAdjustQuantities (reason: received)
      locations.server.ts            # active locations
    labels/
      zpl.ts                         # LabelData -> ZPL (UPC-A/EAN-13/Code128, unit-tested)
      printNode.server.ts            # PrintNode cloud-print adapter
      index.server.ts                # adapter selection / fallback
  routes/
    app._index.tsx                   # session list
    app.receiving.new.tsx            # create session
    app.receiving.$id.tsx            # scan table, margin editor, print, commit
prisma/schema.prisma                 # Session, ReceivingSession, ReceivingLine
```

## Getting started

Prereqs: Node 20.10+, a [Shopify Partner account](https://partners.shopify.com)
(or Dev Dashboard access), a development store, and the
[Shopify CLI](https://shopify.dev/docs/api/shopify-cli) (`npm i -g @shopify/cli`).

```bash
npm install
npm run setup      # prisma generate + create local D1 tables
npm run dev        # shopify app dev — creates/links the app, tunnels, installs on your dev store
```

On first run the CLI walks you through creating the app in your Partner org and
writes real values into `shopify.app.toml` / `.env` (the checked-in
`application_url`/`redirect_urls` are placeholders). Distribution is intended
to be **custom app** (single store) — no Shopify review needed.

Scopes used: `read_products, write_products, read_inventory, write_inventory, read_locations`.

For the margin column to populate, products need **Cost per item** set in
Shopify (Products → variant → Pricing).

## Label printing

`app/services/labels/zpl.ts` renders a 2.25" × 1.25" @ 203 dpi price label
(title, barcode, price). Two integration paths:

- **PrintNode (implemented)** — run the PrintNode client on any machine with
  the label printer attached, then set `PRINTNODE_API_KEY` and
  `PRINTNODE_PRINTER_ID`. Server-side, no browser plugins.
- **Zebra Browser Print / Dymo Connect (stub)** — the print action returns the
  raw ZPL payload, so a client-side path can hand it to a local print agent.
  Wire-up TODO in `app/services/labels/index.server.ts`.

When no backend is configured, printing shows a friendly banner instead of
failing silently.

## Tests

```bash
npm run typecheck
npm test           # vitest: margin math + ZPL generation
```

## Deploying to Cloudflare

One-time setup on the Cloudflare account:

```bash
npx wrangler login
npx wrangler d1 create receiving-app     # paste the database_id into wrangler.toml
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put SHOPIFY_API_SECRET
```

Fill in `SHOPIFY_API_KEY` and `SHOPIFY_APP_URL` (the workers.dev or custom
domain URL) under `[vars]` in `wrangler.toml`, set the same URL as the app URL
in the Shopify Dev Dashboard (or `shopify.app.toml` + `npm run deploy:shopify`),
then:

```bash
npm run deploy    # vite build + wrangler deploy
```

New database migrations: create them with
`npx prisma migrate diff --from-local-d1 --to-schema-datamodel prisma/schema.prisma --script > migrations/000X_name.sql`,
then `wrangler d1 migrations apply DB --local` (dev) / `--remote` (prod).

## Notes / next steps

- **Multiple matches per barcode** are surfaced for manual pick; **unknown
  barcodes** show a warning banner (creating a new product from a scan would be
  a natural extension).
- **Committing** adjusts `available` at one location per session. Purchase
  orders / transfers (`StockTransfer`, `InventoryShipment` APIs) would be the
  next layer if receiving needs to reconcile against POs.
- Price updates write to Shopify immediately on save; quantity deltas only
  apply at commit. That split is intentional: prices need to be right before
  labels print, quantities shouldn't hit the storefront until the session is
  verified.
- Money fields are stored as decimal strings (Shopify's Money format); all
  arithmetic goes through `app/services/margin.ts`.
