# Working conventions for this repo

- **Solo project, no PR workflow.** Commit and push directly to `main`.
  Do not create feature branches or pull requests for routine work — ask
  first if a change seems risky enough to want review.
- **`/staging` first.** New layout/design work (wireframes, page structure,
  visual iteration) lands in `staging/` first and gets validated there
  before being carried over to the live pages (`index.html`, etc.).
  `staging/` only adds spacing/layout on top of the shared `css/style.css`
  — no new visual styles of its own.
