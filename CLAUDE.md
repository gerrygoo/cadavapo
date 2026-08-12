# Working conventions for this repo

- **Solo project, no PR workflow.** Commit and push directly to `main`.
  Never open a pull request, even if a branch got created for you (e.g. by
  an outer harness/task runner) — merge or rebase that branch's work into
  `main` locally and push `main` directly instead of leaving it as a PR.
  Do not create feature branches for routine work — ask first if a change
  seems risky enough to want review.
  **When a harness forces you onto a non-`main` branch:** do your work
  there, then immediately merge into `main` and push `main` without asking
  for confirmation. Only pause if there are merge conflicts or ambiguity
  about how to proceed.
- **Test before pushing.** Verify the change actually works (run it,
  load the page, exercise the affected flow) before pushing to `main` —
  `main` is live, there's no review step to catch problems after the
  fact.
  - **Run `node scripts/qa-audit.mjs`** for anything touching layout, CSS,
    or `js/main.js`. It sweeps 4 pages × 10 viewports for overflow/overlap/
    clipping/target-size, runs axe-core with the disclosure menus opened,
    checks that `prefers-reduced-motion` actually suppresses every
    self-starting animation, and traces a rotation. Install deps ad hoc:
    `npm install --no-save playwright@1.57.0 axe-core`. **Pin 1.57.0** —
    newer Playwright wants a Chromium build that isn't in the local cache
    and will fail with "Executable doesn't exist".
  - **A green headless run is not sufficient on its own.** It reports
    structure, not appearance, and it cannot see anything gated on real
    playback. A pause-control change once passed the whole suite while
    leaving every clip stuck behind `opacity: 0` on a real page. Load the
    affected page in an actual browser too.
  - **Watch for `visibility: "hidden"` when driving Chrome.** A backgrounded
    tab starves media decoding, so videos sit at `readyState 0` forever and
    look broken when they aren't. Check `document.visibilityState` before
    concluding a media bug is real.
- **`/staging` first.** New layout/design work (wireframes, page structure,
  visual iteration) lands in `staging/` first and gets validated there
  before being carried over to the live pages (`index.html`, etc.).
  - **Keep `staging.css` to scaffolding.** It drifted into holding real
    visual styles once already, and promoting the direction section
    (2026-08-11) meant unpicking that: everything genuine moved into
    `css/style.css` and only `.wireframe-placeholder` /
    `.proyecto-tile-placeholder` stayed. Put *new* shared visual styles in
    `css/style.css` from the start, and treat promoting a staged page as a
    **merge into `css/style.css`**, not a file move.
  - **Don't leave a promoted page in `staging/` too.** Delete the staged
    copy and repoint whatever linked to it at the live page. Two copies of
    the same page drift, and nothing warns you.
  - **Live pages must not carry staging names.** `page-staging` /
    `staging-nav` became `page-site` / `nav-pills` at promotion time; keep
    it that way.
- **Working on multiple things at once: use git worktrees, not feature
  branches.** Add a worktree per concurrent task with a throwaway local
  branch (`git worktree add ../cadavapo-<task> -b scratch/<task>`), do the
  work there, then merge it into `main` locally and push
  (`git checkout main && git merge scratch/<task> && git push`), and clean
  up (`git worktree remove ../cadavapo-<task> && git branch -d
  scratch/<task>`). The branch is scratch scaffolding for the worktree,
  never a PR — this still counts as "commit and push directly to `main`."
  Worktrees isolate the working directory, not file history, so this works
  best when the concurrent tasks touch different files (e.g. one in
  `staging/`, one elsewhere); overlapping edits will still conflict on
  merge.
