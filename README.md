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

### Today's Awarded Orders (2025-10-01 IST)

| Hour (IST) | Company | Code | Headline | Profit Outlook | Announced At |
| --- | --- | --- | --- | --- | --- |
| 2025-10-01 14:00 | CFF Fluid Control Ltd | 543920 | Announcement under Regulation 30 (LODR) -Award_of_Order ([Link](https://www.bseindia.com/stock-share-price/cff-fluid-control-ltd/cff/543920/)) | Likely Positive | 01 Oct 2025 - 14:32 |
| 2025-10-01 14:00 | Prince Pipes and Fittings Ltd | 542907 | Company has received a Show Cause cum Demand Notice in Form GST DRC-1 dated September 30, 2025 ([Link](https://www.bseindia.com/stock-share-price/prince-pipes-and-fittings-ltd/princepipe/542907/)) | Neutral | 01 Oct 2025 - 14:30 |
| 2025-10-01 14:00 | IRIS Business Services Ltd | 540735 | We hereby inform the exchange about Bagging/Receiving of order/contract. ([Link](https://www.bseindia.com/stock-share-price/iris-business-services-ltd/iris/540735/)) | Likely Positive | 01 Oct 2025 - 14:03 |
| 2025-10-01 13:00 | Kirloskar Brothers Ltd-$ | 500241 | Disclosure under Regulation 30 of the SEBI Listing Regulations, 2015 ([Link](https://www.bseindia.com/stock-share-price/kirloskar-brothers-ltd/kirlosbros/500241/)) | Neutral | 01 Oct 2025 - 13:44 |
| 2025-10-01 13:00 | Newgen Software Technologies Ltd | 540900 | Disclosure of material order USD 2,593,125 is attached. ([Link](https://www.bseindia.com/stock-share-price/newgen-software-technologies-ltd/newgen/540900/)) | Likely Positive | 01 Oct 2025 - 13:12 |
| 2025-10-01 13:00 | RailTel Corporation of India Ltd | 543265 | New Order awarded ([Link](https://www.bseindia.com/stock-share-price/railtel-corporation-of-india-ltd/railtel/543265/)) | Likely Positive | 01 Oct 2025 - 13:05 |
| 2025-10-01 12:00 | Mukka Proteins Ltd | 544135 | Update on pending tax litigation. ([Link](https://www.bseindia.com/stock-share-price/mukka-proteins-ltd/mukka/544135/)) | Neutral | 01 Oct 2025 - 12:30 |
| 2025-10-01 09:00 | RMC Switchgears Ltd | 540358 | Intimation under Regulation 30 of SEBI (LODR) Regulations, 2015 - Receipt of two Letter Of Awards(LOA) ([Link](https://www.bseindia.com/stock-share-price/rmc-switchgears-ltd/rmc/540358/)) | Likely Positive | 01 Oct 2025 - 09:49 |
| 2025-10-01 07:00 | L&T Technology Services Ltd | 540115 | Intimation attached ([Link](https://www.bseindia.com/stock-share-price/lt-technology-services-ltd/ltts/540115/)) | Neutral | 01 Oct 2025 - 07:50 |

_Last updated: 01 Oct 2025 - 14:34 | Entries: 9 | Requests: 7 | Retries: 0 | [Raw JSON](data/2025-10-01.json)_

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
