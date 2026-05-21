## Summary

<!-- What does this PR do? Why? Link the related issue if one exists. -->

Resolves # <!-- issue number, or delete this line -->

## Changes

<!-- Bullet list of the main changes. -->

-

## Test plan

<!-- How did you verify this works? Check what applies. -->

- [ ] `pnpm check` passes (lint + tsc + knip + unit tests)
- [ ] `pnpm test:e2e` passes
- [ ] Tested in browser (describe what you clicked / observed)
- [ ] No new server-side code imports `src/lib/crypto.ts`
- [ ] No new client-side code imports `src/server/`

## Security checklist (skip if not applicable)

- [ ] No plaintext vault data logged or returned from API routes
- [ ] New API routes validate input with Zod and call `verifySession()`
- [ ] No secrets or tokens committed
