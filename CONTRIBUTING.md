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
- Update or create unit tests in a future `tests/` directory if we add one; for now, include mocked scripts where practical.

## 4. Testing Checklist
- `npm run build`
- `npm run fetch` (mock or run during market hours)
- `npm run merge`
- `npm run render`
- `npm run guard` (ensure `should_run` output is correct)

## 5. Documentation
- Update `README.md` or other docs if behaviour or configuration changes.
- Add entries to `KNOWN_ISSUES.md` when identifying a new quirk that impacts users.

## 6. Commit Style
- Use conventional commits (e.g. `feat: ...`, `fix: ...`, `chore: ...`).
- Keep commits focused; no sweeping formatting changes alongside feature work.

Ready to open a PR? Continue with `PR_GUIDE.md` for the submission checklist.
