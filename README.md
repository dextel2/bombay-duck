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

### Today's Awarded Orders (2026-05-13 IST)

| Hour (IST) | Company | Code | Headline | Profit Outlook | Announced At |
| --- | --- | --- | --- | --- | --- |
| 2026-05-13 15:00 | Bajel Projects Ltd | 544042 | Announcement under Regulation 30 (LODR) for Bagging of Order for Transmission Line ([Link](https://www.bseindia.com/stock-share-price/bajel-projects-ltd/bajel/544042/)) | Likely Positive | 13 May 2026 - 15:55 |
| 2026-05-13 15:00 | PNC Infratech Ltd | 539150 | as per attachment ([Link](https://www.bseindia.com/stock-share-price/pnc-infratech-ltd/pncinfra/539150/)) | Neutral | 13 May 2026 - 15:29 |
| 2026-05-13 13:00 | Brahmaputra Infrastructure Ltd | 535693 | M/s Brahmaputra - NCDC JV had recieved an LOA of an total amount Rs. 81,98,23,592 /- ([Link](https://www.bseindia.com/stock-share-price/brahmaputra-infrastructure-ltd/brahminfra/535693/)) | Neutral | 13 May 2026 - 13:23 |
| 2026-05-13 13:00 | Jyoti Structures Ltd | 513250 | Intimation on New Project Order ([Link](https://www.bseindia.com/stock-share-price/jyoti-structures-ltd/jyotistruc/513250/)) | Likely Positive | 13 May 2026 - 13:17 |
| 2026-05-13 12:00 | Ceigall India Ltd | 544223 | In accordance with the provisions of the SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015, we wish to inform you that Ceigall India Limited ('CIL') has received .... ([Link](https://www.bseindia.com/stock-share-price/ceigall-india-ltd/ceigall/544223/)) | Neutral | 13 May 2026 - 12:02 |
| 2026-05-13 11:00 | Ceigall India Ltd | 544223 | In accordance with the provisions of the SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015, we wish to inform you that Ceigall India Limited ('CIL') has received .... ([Link](https://www.bseindia.com/stock-share-price/ceigall-india-ltd/ceigall/544223/)) | Neutral | 13 May 2026 - 11:54 |
| 2026-05-13 11:00 | Shilchar Technologies Ltd | 531201 | Intimation of order dated 30th April 2026, issued by Commissioner of Central Tax (Appeals), CGST and Central Excise, Vadodara. ([Link](https://www.bseindia.com/stock-share-price/shilchar-technologies-ltd/shilctech/531201/)) | Likely Positive | 13 May 2026 - 11:37 |
| 2026-05-13 11:00 | Siyaram Recycling Industries Ltd | 544047 | Intimation with regards to "Siyaram Recycling" secured order amounting to Rs. 1,51,33,500 pursuant to Regulation 30 of SEBI (Listing Obligation and Disclosure Requirements) Regulation, 2015 ([Link](https://www.bseindia.com/stock-share-price/siyaram-recycling-industries-ltd/siyaram/544047/)) | Likely Positive | 13 May 2026 - 11:02 |
| 2026-05-13 10:00 | Larsen & Toubro Ltd | 500510 | L&T Wins Orders (Significant*) for Power Transmission & Distribution Business ([Link](https://www.bseindia.com/stock-share-price/larsen--toubro-ltd/lt/500510/)) | Likely Positive | 13 May 2026 - 10:10 |

_Last updated: 13 May 2026 - 16:20 | Entries: 9 | Requests: 5 | Retries: 0 | [Raw JSON](data/2026-05-13.json)_

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
