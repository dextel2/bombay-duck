# Pull Request Guide

## Before Opening the PR
- ✅ All steps in `CONTRIBUTING.md` completed.
- ✅ Local build + render succeed with no uncommitted artifacts.
- ✅ `KNOWN_ISSUES.md` updated if you discovered a new limitation.
- ✅ README snapshot still renders (guard markers intact).

## PR Description Template
```
## Summary
- bullet list of key changes

## Testing
- commands executed and results

## Screenshots / Logs (if relevant)
- paste or link

## Checklist
- [ ] Ready for review
- [ ] Linked issue: #
- [ ] Docs updated (if needed)
```

## Review Expectations
- PRs that touch the workflow or guard logic require at least one maintainer approval.
- Keep diffs lean; use draft PRs for ongoing work so reviewers can track progress.

## After Merge
- Verify the next scheduled workflow run succeeds.
- Monitor README and `data/` for unexpected changes.
- Celebrate responsibly! 🎉
