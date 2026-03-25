# Deferred Items

## Out-of-scope discoveries

- `package.json`: `pnpm lint` runs `eslint .`, but `eslint` is not present in `devDependencies`, so repository lint verification cannot run in this workspace without unrelated tooling changes.
