# Contributing

Thanks for your interest in improving this project! This guide covers everything you need to open a compliant pull request.

## Getting started

1. Fork the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/<repo>.git
   cd <repo>
   ```

2. Install dependencies (see the README for the exact package manager and runtime used by this project).

3. Create a branch off the default branch using the naming convention below.

## Branch conventions

Use a short, descriptive branch name prefixed by the type of change:

- `feat/<short-description>` — new feature
- `fix/<short-description>` — bug fix
- `docs/<short-description>` — documentation only
- `chore/<short-description>` — maintenance, tooling, dependencies
- `refactor/<short-description>` — internal changes with no behavior change

Keep branches focused on a single issue where possible.

## Local checks

Run the same checks CI runs before pushing. Replace the commands below with the scripts defined in this repository's `package.json` (or equivalent manifest) if they differ.

```bash
# install dependencies
npm install

# lint
npm run lint

# type-check (if applicable)
npm run typecheck

# tests
npm test

# build
npm run build
```

All of the above must pass locally before you open a pull request.

## CI gates

Every pull request must pass the following required checks before it can be merged:

- **Lint** — no lint errors.
- **Type check** — no type errors (where the project is typed).
- **Tests** — the full test suite passes.
- **Build** — the project builds successfully.
- **Security scanning** — no new high/critical findings (see `docs/security-scanning.md`).

If a gate fails, fix the underlying issue rather than disabling the check.

## Opening a pull request

1. Push your branch to your fork and open a pull request against the default branch.
2. Fill out the pull request template completely, including the checklist.
3. Link the issue your change addresses (for example, `Closes #123`).
4. Keep the change scoped to the linked issue; split unrelated work into separate PRs.
5. Respond to review feedback and keep the branch up to date with the default branch.

## Reporting issues

Use the issue forms under `.github/ISSUE_TEMPLATE/`:

- **Bug report** — for reproducible defects.
- **Feature request** — for new functionality or enhancements.

Please search existing issues before opening a new one, and include the details requested by the form so maintainers can triage quickly.

## Code of conduct

Be respectful and constructive. Assume good intent, keep discussions focused on the work, and help keep the project welcoming for everyone.
