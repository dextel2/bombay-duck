# Known Issues

## Rate Limiting & API Availability
- The BSE endpoint is unauthenticated and occasionally throttles heavy usage. The workflow already enforces a 60-second gap, but repeated failures may require a longer cool-off period or manual intervention.
- BSE occasionally deploys without notice. If the JSON contract changes the fetch script may fail; see the Step Summary for the raw payload path and inspect `data/raw/<date>/` for differences.

## Trading Calendar Assumptions
- The guard currently treats every weekday as a trading day. Indian market holidays are not yet encoded; runs on holidays will bail out with "no data" logs.
- Manual dispatches outside 09:00-15:00 IST exit early by design. Use the `FORCE_RUN` override (see `CONTRIBUTING.md`) when testing after hours.

## Authentication & GitHub Permissions
- The workflow relies on a repository secret (`GH_TOKEN`) with write access. Expired or revoked tokens will make the commit step fail with a 403.
- `persist-credentials: false` is required on checkout; if removed, GitHub may restore read-only credentials and block pushes.

## Artifact Retention
- GitHub removes archived artifacts after the repository-level retention window (default 90 days). Pull snapshots locally if you need a historical audit trail beyond that.

## Local Development Footprint
- Fetching from the BSE endpoint locally will still count against their rate limit; prefer mocked responses during development.
- The `data/` directory is partially ignored. Ensure you commit only the intended daily JSON file plus README changes.
