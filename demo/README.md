# Demo

Everything needed to put the admin in front of a client with a fortnight of
trade behind it, instead of nine empty screens.

## The passcode

```
gopi-demo-2026
```

It is not set here — the **API** owns it, and the admin only forwards what you
type. It reads `Storefront:Admin:Passcode`, which in the storefront repository
is set in `api/GopiCrackers.Api/appsettings.Development.json`.

`appsettings.json` deliberately leaves it **empty**, which makes every admin
endpoint answer 503 "Admin is not configured". A deployment that forgets to set
a passcode therefore refuses everyone rather than admitting everyone, and this
demo passcode never reaches production by being left in a file.

> **This is a demo passcode in a public repository.** It is one shared string,
> sent in plain text, with no accounts and no rate limiting. Change it before
> the admin is reachable by anyone you did not hand it to, and put real
> authentication in front of it before it is reachable from the internet.

Override it anywhere the demo runs:

```bash
ADMIN_PASSCODE=something-else node demo/seed.mjs
# or
node demo/seed.mjs --passcode something-else
```

## Seeding

`seed.mjs` fills a running API by talking to it — the same endpoints the
storefront checkout uses. It hand-writes no prices: a basket is ids and
quantities, and the API prices it, assigns the reference and records the
analytics. The demo's numbers are therefore whatever today's catalogue says.

It reads the delivery districts and payment methods from the API too, so
editing either in configuration does not turn the script into a wall of 400s.

You need the storefront repository checked out alongside this one, because that
is where the API lives.

```bash
# 1. Start the API (from the storefront repo)
dotnet run --project api/GopiCrackers.Api

# 2. Seed it (from this repo)
node demo/seed.mjs

# 3. Stop the API with Ctrl+C — see the warning below

# 4. Spread the timestamps across the last fortnight
node demo/seed.mjs --backdate --data ../Fire-Crackers/src/data

# 5. Start the API again, then the admin
npm run dev
```

### Why there are two passes

The API stamps its own clock on everything it stores, deliberately — a browser
must not be able to claim an order happened last Tuesday. So pass one lands
entirely on today, and pass two rewrites `orders.json` and `analytics.json` on
disk to spread it backwards.

Pass two moves dates and nothing else. Every rupee stays as the API calculated
it, an order's history stays in sequence, and the browsing that produced an
order stays attached to it — a visit never lands after the order it created.

Without pass two the analytics screen draws a single day, and its four daily
measures are the thing most worth showing.

### Stop the API with Ctrl+C, not by killing it

Analytics are batched behind a 15-second timer, and flushed on a clean
shutdown. Kill the process and up to 15 seconds of events never reach
`analytics.json` — pass two then backdates an empty file and the charts are
bare. Ctrl+C flushes on the way out.

## What you get

| | |
| --- | --- |
| Orders | 12, spread over 12 days, across all six statuses, delivery and pickup |
| Order history | Each one walked up its ladder step by step, with a note on the last move |
| Bulk enquiries | 5, across received / quoted / won / closed |
| Contact messages | 4 |
| Analytics | ~280 events over 14 days, from 39 sessions |
| Funnel | Real drop-off — 34 looked, 23 added, 17 reached checkout, 12 bought |
| Searches | 12 terms, two of which deliberately find nothing |

The 22 visits that browse and leave are what make the funnel a funnel. Without
them every stage is the same number and the screen demonstrates nothing.

## Options

| Flag | Default | |
| --- | --- | --- |
| `--api <url>` | `http://localhost:5080` | Also `DEMO_API` |
| `--passcode <code>` | `gopi-demo-2026` | Also `ADMIN_PASSCODE` |
| `--days <n>` | `14` | The window pass two spreads across |
| `--backdate` | — | Run pass two instead of pass one |
| `--data <path>` | — | Required by `--backdate`; the folder holding the two journals |

## Re-seeding

Pass one always appends — run it twice and you have 24 orders. To start over,
stop the API, empty both journals, then start it again:

```bash
echo "[]" > ../Fire-Crackers/src/data/orders.json
echo "[]" > ../Fire-Crackers/src/data/analytics.json
```

Both files are gitignored in the storefront repository. They are trade records
written at runtime, not source.

## Everyone in here is invented

The mobile numbers run sequentially from `9000000001` so they read as
placeholders rather than as somebody's actual number, the email addresses are
all `@example.com`, and the addresses are streets in the shop's own town. No
real customer, order or enquiry is in this file.
