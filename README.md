# RElandscan

Land intelligence for the Klang Valley. Click anywhere on the map, or draw a site boundary, and get a one-page
site report plus a quick development feasibility, aimed at property developers.

## Running it

```bash
npm install
npm run dev     # open the URL it prints (usually http://localhost:5173)
npm test        # unit tests
npm run build   # production build into dist/
```

No API keys needed. The app calls free public services (OpenStreetMap tiles, Overpass, Nominatim, Esri imagery)
straight from the browser.

## What Phase 1 does

- **Map of the Klang Valley** with street and satellite views, plus place search.
- **Click anywhere** for a site report:
  - address
  - local authority (DBKL, MBPJ, MBSA, MBSJ, MBDK, MPAJ, MPS, MPKj, MPSepang, PPj) and where its zoning rules live
  - current land use from OpenStreetMap (what's there today, *not* official zoning)
  - rail stations within 2 km, and schools, hospitals and malls within 1.5 km
  - flood indicator: mapped rivers and drains within 300 m (a rough proxy only)
  - checklist of what still has to be obtained offline (title search, lot plan, zoning, transactions)
- **Draw a site boundary** to measure land area in sq ft, acres and m².
- **Quick feasibility**: residual land value from plot ratio, efficiency, unit size, selling price, costs and
  target profit. The land area is filled in from the drawn site.

## Malaysian land data landscape

| Need | Holder | Access |
|---|---|---|
| Lot boundaries (cadastral) | JUPEM | Restricted / licensed |
| Title: owner, tenure, category, restrictions | State land offices (PTG/PTD), e-Tanah | Paid per-lot search; land is a state matter |
| Zoning, plot ratio, density | Local councils (PBT) and PLANMalaysia, through local plans (Rancangan Tempatan) | Often published as PDF maps that need digitising |
| Transactions | JPPH / NAPIC; Brickz, EdgeProp | Partial |
| Flood | JPS | Some maps published |
| Transit, amenities | OpenStreetMap | Open |

## Roadmap

1. **Phase 1 (this):** public data, click-for-report, site drawing, feasibility.
2. **Phase 2:** digitise zoning from one or two local plans (e.g. KL City Plan 2040, MBPJ) into a map layer, so
   clicking a site shows its zoning and plot ratio automatically. Add a transaction layer, and a backend
   (Postgres + PostGIS) to store it.
3. **Phase 3:** saved sites, a downloadable PDF site report, and licensed cadastral and transaction data.

## Disclaimer

Everything here is indicative. Confirm with the land office, the local council and a registered surveyor
before making any decision.
