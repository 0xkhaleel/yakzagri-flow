## Description
<!-- Provide a clear, detailed description of your changes -->

## Related Issues
<!-- List related issues below using 'Closes #issue-number' -->
- Closes #

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Infrastructure / CI / Policy / Documentation update

## PR Checklist
<!-- All gates below must pass before this PR can be merged. See CONTRIBUTING.md for details. -->
- [ ] Code builds and passes all unit & integration tests locally (`pnpm build` / `pnpm test`)
- [ ] Linting and formatting pass locally (`pnpm lint` / `pnpm format:check`)
- [ ] Documentation has been updated to reflect code changes
- [ ] **Secret Management**: No secrets, private keys, or credentials are hardcoded.
- [ ] Branch is up to date with the base branch and CI is green

## API Contract Changes (complete if this PR changes frontend/backend API calls)
- [ ] Any endpoint shape changes are reflected in the typed API clients under `frontend/src/lib/api/` and matched against the backend contract docs in `docs/api/`.
