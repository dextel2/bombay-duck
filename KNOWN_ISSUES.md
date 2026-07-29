# ⚠️ Known Issues

## ⏱️ Rate Limiting & API Availability

**Partially mitigated** (see #30).

- The BSE endpoint remains unauthenticated. The fetcher now supports:
  - Configurable retries via `MAX_ATTEMPTS`, `BASE_RETRY_DELAY_MS`, and `RETRY_FACTOR`.
  - A cool-off window (`COOL_OFF_MS`, default 30 min) after `FAILURE_THRESHOLD` (default 3) consecutive failures.
  - Honouring a `Retry-After` response header when present.
  - Minimal schema validation so a changed JSON contract fails loudly instead of producing silent empty data.
- Residual risk: prolonged BSE outages or aggressive throttling can still exhaust retries. When cool-off is active the workflow skips the fetch and records the reason in the Step Summary.
- If the JSON contract changes, inspect the raw payload under `data/raw/<date>/` and the Step Summary for the validation error message.

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
- The `data/` directory is partially `.gitignore`-d. Ensure only the relevant **daily JSON state file** and **README updates** are committed.
