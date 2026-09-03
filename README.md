# Bombay Duck 🦆

[![BSE Award Watch](https://github.com/dextel2/bombay-duck/actions/workflows/bse-award-watch.yml/badge.svg)](https://github.com/dextel2/bombay-duck/actions/workflows/bse-award-watch.yml) ![License](https://img.shields.io/badge/license-ISC-blue.svg) ![Node](https://img.shields.io/badge/node-20.x-339933.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg) ![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-F7DF1E.svg) [![GitHub stars](https://img.shields.io/github/stars/dextel2/bombay-duck?style=social)](https://github.com/dextel2/bombay-duck/stargazers)

<!-- aim:start -->

## Aim 🎯

⚠️ **Caution:\*\*** This project does not recommend buying or selling any security; it simply tracks BSE "Award of Order / Receipt of Order" announcements for informational purposes.

Bombay Duck keeps a pulse on BSE's "Award of Order / Receipt of Order" announcements so traders can spot fresh bullish catalysts without refreshing the exchange site. The goal is a hands-free tracker that respects BSE rate limits, stores every intraday fetch in git, and keeps the repository's front page as a living dashboard.

<!-- aim:end -->

## Intraday Snapshot 📊

ℹ️ **Important:\*\*** The README snapshot is updated automatically by the scheduled GitHub Action. Always pull the latest changes (or rebase) before editing README content locally to avoid merge conflicts.

<!-- snapshot:start -->

### Today's Awarded Orders (2026-09-03 IST)

| Hour (IST) | Company | Code | Headline | Profit Outlook | Announced At |
| --- | --- | --- | --- | --- | --- |
| 2026-09-03 17:00 | Innovision Ltd | 544732 | Intimation of Workorder received from NHAI for Mangapatnam Toll in the state of Andhra Pradesh ([Link](https://www.bseindia.com/stock-share-price/innovision-ltd/innovision/544732/)) | Likely Positive | 03 Sep 2026 - 17:43 |
| 2026-09-03 15:00 | Monarch Surveyors and Engineering Consultants Ltd | 544453 | Pursuant to the provisions of Regulation 30 of SEBI (Listing Obligations and Disclosure Requirements), Regulations 2015, we hereby submit that Company has received an order from Maharashtra .... ([Link](https://www.bseindia.com/stock-share-price/monarch-surveyors-and-engineering-consultants-ltd/msecl/544453/)) | Likely Positive | 03 Sep 2026 - 15:11 |
| 2026-09-03 15:00 | Ecoboard Industries Ltd | 523732 | Announcement under regulation 30 for receipt of order of Rs. 20,50,00,000 from Sri Balaji Bio Energies and Organics Private Limited for 12 TPD CBG Plant ([Link](https://www.bseindia.com/stock-share-price/ecoboard-industries-ltd/ecoboar/523732/)) | Likely Positive | 03 Sep 2026 - 15:02 |
| 2026-09-03 13:00 | Ceigall India Ltd | 544223 | In continuation to our earlier letters dated 26th August 2026, we wish to inform you that Ceigall India Limited ('CIL') has received Letter of Intent (LoI) from REC Power Development and .... ([Link](https://www.bseindia.com/stock-share-price/ceigall-india-ltd/ceigall/544223/)) | Neutral | 03 Sep 2026 - 13:52 |
| 2026-09-03 13:00 | Sugs Lloyd Ltd | 544501 | Sugs LLoyd Limited secures 24.63 crore from TPCODL. ([Link](https://www.bseindia.com/stock-share-price/sugs-lloyd-ltd/sugslloyd/544501/)) | Neutral | 03 Sep 2026 - 13:44 |
| 2026-09-03 13:00 | Saatvik Green Energy Ltd | 544526 | Receipt of Order ([Link](https://www.bseindia.com/stock-share-price/saatvik-green-energy-ltd/saatvikgl/544526/)) | Likely Positive | 03 Sep 2026 - 13:30 |
| 2026-09-03 11:00 | Kothari Industrial Corporation Ltd | 509732 | award ([Link](https://www.bseindia.com/stock-share-price/kothari-industrial-corporation-ltd/kotic/509732/)) | Neutral | 03 Sep 2026 - 11:52 |
| 2026-09-03 09:00 | Solex Energy Ltd | 544862 | Intimation of Receipt of Work Order ([Link](https://www.bseindia.com/stock-share-price/solex-energy-ltd/solex/544862/)) | Likely Positive | 03 Sep 2026 - 09:59 |

_Last updated: 03 Sep 2026 - 17:55 | Entries: 8 | Requests: 2 | Retries: 0 | [Raw JSON](data/2026-09-03.json)_

<!-- snapshot:end -->

<!-- how-it-works:start -->

## How It Works ⚙️

1. Scheduled GitHub Action runs at the top of each hour from 09:00 to 16:00 IST, Monday through Friday.
2. Trading-window guard aborts early outside market hours or on weekends/holidays.
3. Node.js fetcher (with throttling and retries) polls the BSE API and archives the raw JSON response.
4. Intraday state manager deduplicates announcements per hour and rolls over automatically at the next market open.
5. Mustache-based renderer injects a fresh table into the README so the latest data is always visible.
6. If anything changed, the workflow commits the README and JSON state back to `main` using a bot token and uploads artifacts for auditing.

```mermaid
flowchart TD
  A[Scheduled Trigger] --> B{Within Trading Window?}
  B -- No --> Z[Exit Gracefully]
  B -- Yes --> C[Fetch BSE Awards]
  C --> D[Merge Intraday Buckets]
  D --> E[Render README]
  E --> F{Changes Detected?}
  F -- No --> Z
  F -- Yes --> G[Commit and Push]
  G --> H[Upload Artifacts]
  H --> Z
```

<!-- how-it-works:end -->

## Automation Timeline 🕒

- **09:00 IST**: First eligible run clears out yesterday's state, fetches fresh announcements, and resets the README snapshot.
- **09:15-15:00 IST**: At the top of each hour the workflow repeats the fetch->merge->render pipeline, committing only when new data appears.
- **After 15:00 IST**: Guard step exits successfully; the last intraday snapshot remains until markets reopen.

## Project Resources 📚

- 📘 [Contributing Guidelines](CONTRIBUTING.md)
- 🧾 [Pull Request Guide](PR_GUIDE.md)
- 🐞 [Known Issues](KNOWN_ISSUES.md)
- 👥 [Authors](AUTHORS.md)

## Appendix 📎

- **API Endpoint:** `https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w`
- **Query Parameters:** `strCat=Company Update`, `subcategory=Award of Order / Receipt of Order`; date fields align with the active IST trading day.
- **Outputs:** Exposes `trading_date`, `announcement_count`, and the JSON-encoded announcements via `GITHUB_OUTPUT` for downstream jobs.
- **Logs & Summaries:** Fetch step writes a Markdown table to the GitHub Step Summary for quick triage.
