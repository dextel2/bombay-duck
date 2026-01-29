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

### Today's Awarded Orders (2026-01-29 IST)

| Hour (IST) | Company | Code | Headline | Profit Outlook | Announced At |
| --- | --- | --- | --- | --- | --- |
| 2026-01-29 15:00 | IRIS RegTech Solutions Ltd | 540735 | We are pleased to announce that the Company has received an award from NEC Corporation India Private Limited. ([Link](https://www.bseindia.com/stock-share-price/iris-regtech-solutions-ltd/iris/540735/)) | Neutral | 29 Jan 2026 - 15:05 |
| 2026-01-29 14:00 | A B Infrabuild Ltd | 544281 | Allotment of Order ([Link](https://www.bseindia.com/stock-share-price/a-b-infrabuild-ltd/abinfra/544281/)) | Likely Positive | 29 Jan 2026 - 14:45 |
| 2026-01-29 12:00 | Subros Ltd | 517168 | Award of new business of local Electric Compressor for electric and hybrid vehicles ([Link](https://www.bseindia.com/stock-share-price/subros-ltd/subros/517168/)) | Neutral | 29 Jan 2026 - 12:49 |
| 2026-01-29 12:00 | Zaggle Prepaid Ocean Services Ltd | 543985 | Pursuant to Regulation 30 of SEBI( LODR) Regulations, 2015, this is to inform you that Zaggle Prepaid Ocean Services Limited has entered into an agreement with Hexalog Technologies Private Limited. ([Link](https://www.bseindia.com/stock-share-price/zaggle-prepaid-ocean-services-ltd/zaggle/543985/)) | Neutral | 29 Jan 2026 - 12:20 |
| 2026-01-29 10:00 | Quadrant Future Tek Ltd | 544336 | Intimation of Receipt of offer from ICF for installation of KAVACH 4.0 worth Rs. 230 Crores ([Link](https://www.bseindia.com/stock-share-price/quadrant-future-tek-ltd/quadfuture/544336/)) | Likely Positive | 29 Jan 2026 - 10:02 |

_Last updated: 29 Jan 2026 - 15:41 | Entries: 5 | Requests: 8 | Retries: 0 | [Raw JSON](data/2026-01-29.json)_

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
