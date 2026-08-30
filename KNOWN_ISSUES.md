# ⚠️ Known Issues

## ⏱️ Rate Limiting & API Availability

**Status (partially addressed in #30 / branch `fix/rate-limit-resilience`):**

- The BSE endpoint remains unauthenticated and may still throttle heavy usage.
- The fetch step now supports:
  - Configurable retries via `MAX_ATTEMPTS`, `BASE_RETRY_DELAY_MS`, `RETRY_FACTOR`
  - Cross-run **cool-off** after consecutive hard failures (`FAILURE_THRESHOLD`, `COOL_OFF_MINUTES`)
  - Honouring a `Retry-After` response header when present
  - Lightweight response-shape validation so contract changes fail loudly instead of producing empty data
- Cool-off state is stored in `data/.rate-limit.json`. While active, the fetch step exits successfully and skips the network call.
- If the JSON contract still changes in a way the validator does not catch, inspect the **Step Summary** (`rawPayloadPath`) and files under `data/raw/<date>/`.

Remaining gaps:
- No automatic GitHub issue is opened on hard failure yet (planned follow-up).
- Cool-off is process-local to the repo state file; it does not coordinate across forks.

## 📅 Trading Calendar Assumptions

- The guard currently assumes every weekday is a trading day. **Indian market holidays are not accounted for**. Runs on such days will exit with "no data" logs.
- Manual dispatches outside the regular trading hours (09:00–15:00 IST) will exit early by design. Use the `FORCE_RUN` override (see [`CONTRIBUTING.md`](./CONTRIBUTING.md)) when testing after hours.

## 🔐 Authentication & GitHub Permissions

- The workflow depends on a repository secret (`GH_TOKEN`) with write permissions. If the token expires or is revoked, the commit step will fail with a `403 Forbidden` error.
- Ensure `persist-credentials: false` is set in the `actions/checkout` step. Omitting this can cause GitHub to restore read-only credentials, which may block push operations.

## 📦 Artifact Retention

- GitHub automatically deletes archived workflow artifacts after the repository’s retention period (default is 90 days). If long-term storage is required, **download and store pull snapshots locally**.

## 🧪 Local Development Footprint

- Local fetches still hit the live BSE endpoint and are subject to the same rate limits and cool-off logic. During development, prefer using **mocked responses** to avoid unnecessary API calls.
- The `data/` directory is partially `.gitignore`-d. Ensure only the relevant **daily JSON state file** and **README updates** are committed. The rate-limit state file (`data/.rate-limit.json`) is intentionally local and should not be force-committed unless debugging.
