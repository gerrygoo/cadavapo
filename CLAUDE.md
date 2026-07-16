# Working conventions for this repo

- **Solo project, no PR workflow.** Commit and push directly to `main`.
  Never open a pull request, even if a branch got created for you (e.g. by
  an outer harness/task runner) — merge or rebase that branch's work into
  `main` locally and push `main` directly instead of leaving it as a PR.
  Do not create feature branches for routine work — ask first if a change
  seems risky enough to want review.
- **Test before pushing.** Verify the change actually works (run it,
  load the page, exercise the affected flow) before pushing to `main` —
  `main` is live, there's no review step to catch problems after the
  fact.
- **`/staging` first.** New layout/design work (wireframes, page structure,
  visual iteration) lands in `staging/` first and gets validated there
  before being carried over to the live pages (`index.html`, etc.).
  `staging/` only adds spacing/layout on top of the shared `css/style.css`
  — no new visual styles of its own.
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
