# Gopi Crackers — shop admin

The admin application for the Gopi Crackers storefront. It is a standalone
Vite + React 19 application: it shares no bundle, no origin and no router with
the shop. The two meet only at the REST API.

| | |
| --- | --- |
| Storefront | [Fire-Crackers](https://github.com/sunilkumar-0507/Fire-Crackers) — `src/`, port 5173 |
| **This repo** | The shop admin, port 5174 |
| API | ASP.NET Core, port 5080 — [Fire_Cracker_API](https://github.com/sunilkumar-0507/Fire_Cracker_API) |

```bash
npm install
npm run dev        # http://localhost:5174
npm run build
npm run lint
```

## It needs the API running

Every screen here exists to write something, so unlike the storefront there is
no offline fallback — with no API reachable the admin shows a red bar saying
nothing can be saved.

The dev server proxies `/api` to `http://localhost:5080`, so there is no origin
to configure and no CORS pre-flight locally. Point it elsewhere with
`VITE_API_TARGET`:

```bash
VITE_API_TARGET=https://api.example.com npm run dev
```

The API is not in this repository. It has its own:
[Fire_Cracker_API](https://github.com/sunilkumar-0507/Fire_Cracker_API).

```bash
dotnet run --project GopiCrackers.Api      # from that repo
```

## Passcode

The admin is guarded by one shared passcode, read by the API from
`Storefront:Admin:Passcode`. `appsettings.json` ships it **empty**, which
answers 503 to every admin endpoint — a deployment that forgets to set one
refuses everyone rather than admitting everyone.

Set your own, in the API repo:

```bash
dotnet user-secrets set "Storefront:Admin:Passcode" "<passcode>" --project GopiCrackers.Api
```

On a server it is an environment variable, `Storefront__Admin__Passcode`.

It is sent in plain text on every request, with no accounts, no sessions, no
audit trail and no rate limiting. It keeps the admin out of casual reach on a
shop's own network. **It is not authentication** — put something real in front
of it before this is exposed to the internet. The seam to replace is the API's
`Security/AdminOnlyAttribute.cs`.

The passcode you type lives in `sessionStorage` and dies with the tab. It is
verified against the API on every load rather than trusted, so a stale one
re-prompts instead of failing mid-screen.

## Screens

| Screen | What it does |
| --- | --- |
| Dashboard | Revenue, open orders, stock warnings and enquiries, in one API call |
| Products | Add, edit, delete, **activate / deactivate**; photo picker; tags and flags |
| Stock | Whole-catalogue stock take, saved as one request |
| Discounts | The coupon codes checkout accepts and the offer cards the shop shows |
| Combo packs | Pick catalogue items; price, MRP and saving are derived from them |
| Categories | Name, Tamil name, tagline, tone and artwork |
| Orders | The order book, with status transitions and a note per step |
| Enquiries | Bulk quote requests and contact messages |
| Analytics | Views, baskets, searches and the funnel |
| Inventory | Stock intake ledger, reconciled against the order book |
| Database | Which backend the API is on, schema state, migrate / seed / export |

Deactivating is not deleting. A parked product keeps its page, its photos and
its history, reads as "temporarily unavailable" to a shopper, and cannot be put
in a basket. Deleting is for a line that is gone for good — and is refused
while a combo still contains it.

Three rules the API enforces rather than these forms:

- **Discount is never typed.** A product's is computed from price against MRP,
  a combo's from the sum of its parts. A badge cannot disagree with the numbers
  beside it.
- **Category counts are counted.** Derived from the catalogue on every snapshot
  build, so a category cannot claim a number its products do not back.
- **Deletes that would break something are refused**, with a sentence saying
  why — a category still holding products, a product still inside a combo.

## The analytics screen

Every mark on it is **one hue, light to dark**. There is no categorical palette,
because none of that data's job is identity. The four daily measures are drawn
as small multiples — four charts, four y-scales — rather than four lines
sharing one axis: views run in the hundreds and orders in single figures, and a
dual-axis chart would let any two of them be made to look correlated by
choosing the scales.

## The product photography

`src/assets/GOPI Crackers` is this repository's **own copy** of the 123-file
photo library, globbed by `src/utils/productPhotos.js` and hashed by the
bundler. The photo picker chooses from what the build already ships — adding
photography is a commit, not an upload.

The storefront repository carries the same library. While the two applications
lived in one repository they shared a single copy; split apart, they cannot.
**The two copies can drift** — add a photograph to both, or the shop will sell
something the admin cannot show you.

## Why it looks nothing like the shop

Deliberately the opposite to look at — cool slate and dense tables against the
storefront's warm cream — so two open tabs are never confused for each other.
It loads no storefront CSS, no Playfair, and none of the festival theme.

No web font is loaded at all. The admin is used by two or three people on the
same machines every day; a 40KB font download to make a table of numbers look
nicer is not a trade worth making.
