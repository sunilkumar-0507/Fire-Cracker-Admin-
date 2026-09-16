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

## A demo with no API at all (Vercel, Netlify, any static host)

This is the one to hand a client a link to. There is no API, no database and
nothing to run — the admin answers its own requests in the browser.

```bash
npm run build:demo     # dist/, ready to upload anywhere
npm run preview:demo   # build it and look at it on :4174
```

`vercel.json` already points Vercel at that build, so a deploy needs no
settings changed. It also rewrites every path to `index.html`, which the router
needs — without it, refreshing on `/orders` is a 404 from the host, not from
the app.

The passcode arrives **already filled in** and an amber bar across the top says
the data is invented. One click on Unlock and the nine screens are populated.

### How it works

`VITE_DEMO_MODE=1` (set in `.env.demo`) swaps the transport underneath
`lib/api.js`: every call is answered by `src/demo/demoApi.js` out of the
fixtures in `src/demo/fixtures/`, which are **real responses captured from a
seeded API** rather than hand-written JSON, so they cannot drift from the
contract by being typed out wrong.

Writes work — edit a product, take a stock count, advance an order — and the
dashboard reflects them a click later, because the summary is recomputed from
the same in-memory copy rather than served from the fixture. Nothing survives a
refresh, and two people opening the link do not see each other's changes.

The flag is checked, never the network. Falling back to demo data whenever the
API happened to be unreachable would turn a real outage into a screen full of
invented orders, which is a far worse failure than an error message.

A normal `npm run build` contains none of this — no demo chunk, no fixtures, no
passcode. Verified by grepping the output.

### What is not real about it

- **The passcode check is a prop.** There is no server, so it is compared in the
  browser against a string inside the bundle. Anyone who opens the page can read
  it. It gates invented data on a throwaway deployment and nothing else.
- **The dates are a snapshot.** The fixtures were captured once, so the trade in
  them stays on the fortnight it was seeded and ages as the months pass.
  Regenerate them when that starts to show.

### Regenerating the fixtures

Seed a local API as below, then capture it:

```bash
H="X-Admin-Passcode: gopi-demo-2026"
cd src/demo/fixtures
curl -s http://localhost:5080/api/bootstrap -o bootstrap.json
curl -s -H "$H" http://localhost:5080/api/admin/summary -o summary.json
curl -s -H "$H" "http://localhost:5080/api/admin/orders?pageSize=100" -o orders.json
curl -s -H "$H" "http://localhost:5080/api/admin/enquiries?pageSize=100" -o enquiries.json
curl -s -H "$H" "http://localhost:5080/api/admin/messages?pageSize=100" -o messages.json
for d in 7 30 90; do
  curl -s -H "$H" "http://localhost:5080/api/admin/analytics?days=$d" -o "analytics-$d.json"
done
```

Enquiries and messages are held in memory by the API and never journalled, so
capture them in the same run that seeded them — a restart in between and they
are gone. `node demo/seed.mjs --enquiries` puts them back on their own.

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
| `--enquiries` | — | Only the enquiries and messages, for after an API restart |

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
