# Contributing

Thanks for your interest in improving Bombay Duck! Follow these steps to make sure changes land smoothly.

## 1. Discuss Before You Build
- Open an issue describing the problem or enhancement.
- For larger features, outline the proposed solution and get a 👍 from maintainers before diving into code.

## 2. Local Setup
- Clone the repo and install dependencies:
  ```bash
  npm install
  npm run build
  ```
- Create an `.env.local` if you want to define overrides (e.g. `FORCE_RUN=true`).
- Run `npm run guard`, `npm run fetch`, `npm run merge`, and `npm run render` to verify the full pipeline.

## 3. Coding Guidelines
- Stick to TypeScript in `src/`; compiled artifacts in `dist/` are generated automatically.
- Keep changes ASCII unless the file already uses another charset.
- Add short, meaningful comments only where logic is non-obvious.
- Add or update tests under `tests/` when changing behaviour.

## 4. Testing

```bash
npm test
```

- Uses Node's built-in test runner (`node:test`) with TypeScript via `ts-node`.
- Unit tests live in `tests/unit/`; fixtures in `tests/fixtures/`.
- Tests must not call the live BSE API — use fixtures instead.
- CI (`.github/workflows/ci.yml`) runs `npm run build` and `npm test` on every PR and push to `main`.

### Checklist before opening a PR
- `npm run build`
- `npm test`
- `npm run guard` (ensure `should_run` output is correct when relevant)
- `npm run fetch` only if you intentionally need a live check during market hours

## 5. Documentation
- Update `README.md` or other docs if behaviour or configuration changes.
- Add entries to `KNOWN_ISSUES.md` when identifying a new quirk that impacts users.

## 6. Commit Style
- Use conventional commits (e.g. `feat: ...`, `fix: ...`, `chore: ...`).
- Keep commits focused; no sweeping formatting changes alongside feature work.

Ready to open a PR? Continue with `PR_GUIDE.md` for the submission checklist.
