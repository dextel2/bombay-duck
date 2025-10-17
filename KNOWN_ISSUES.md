# ⚠️ Known Issues

## ⏱️ Rate Limiting & API Availability

- The BSE endpoint is unauthenticated and may throttle heavy usage. Although the workflow enforces a 60-second delay between fetches, repeated failures might require a longer cool-off period or manual retry.
- BSE occasionally deploys changes without notice. If the JSON contract changes, the fetch script may break. Refer to the **Step Summary** output for the `rawPayloadPath`, and inspect the corresponding files under `data/raw/<date>/` to debug differences.

## 📅 Trading Calendar Assumptions

- The guard currently assumes every weekday is a trading day. **Indian market holidays are not accounted for**. Runs on such days will exit with "no data" logs.
- Manual dispatches outside the regular trading hours (09:00–15:00 IST) will exit early by design. Use the `FORCE_RUN` override (see [`CONTRIBUTING.md`](./CONTRIBUTING.md)) when testing after hours.

## 🔐 Authentication & GitHub Permissions

- The workflow depends on a repository secret (`GH_TOKEN`) with write permissions. If the token expires or is revoked, the commit step will fail with a `403 Forbidden` error.
- Ensure `persist-credentials: false` is set in the `actions/checkout` step. Omitting this can cause GitHub to restore read-only credentials, which may block push operations.

## 📦 Artifact Retention

- GitHub automatically deletes archived workflow artifacts after the repository’s retention period (default is 90 days). If long-term storage is required, **download and store pull snapshots locally**.

## 🧪 Local Development Footprint

- Local fetches still hit the live BSE endpoint and are subject to the same rate limits. During development, prefer using **mocked responses** to avoid unnecessary API calls.
- The `data/` directory is partially `.gitignore`-d. Ensure only the relevant **daily JSON state file** and **README updates** are committed.
