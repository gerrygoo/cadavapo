---
description: Launch local HTTP server and open in Chrome
---

# Run the cadavapo site locally

Starts a Python HTTP server on port 8000 and opens Chrome to view the site.

## Implementation

Check the port first — a server from an earlier session is often still up,
and starting a second one silently fails while looking like it worked.

```bash
cd /Users/ggo/code/cadavapo
if lsof -ti:8000 >/dev/null 2>&1; then
  echo "Already serving on :8000"
else
  python3 -m http.server 8000 > /tmp/cadavapo-server.log 2>&1 &
  sleep 1
  echo "Server running (PID: $!)"
fi
open -a "Google Chrome" "http://localhost:8000"
```

## Running the QA audit

`scripts/qa-audit.mjs` needs this server up. Per CLAUDE.md, run it for any
change touching layout, CSS, or `js/main.js`:

```bash
npm install --no-save playwright@1.57.0 axe-core   # pin 1.57.0 — see below
node scripts/qa-audit.mjs           # staging/ ; --live audits the live pages
```

Pin Playwright to **1.57.0**: it matches the `chromium-1200` build already in
`~/Library/Caches/ms-playwright`. Newer versions want a build that isn't
cached and fail with "Executable doesn't exist".

## Gotchas when driving Chrome

- **Hard-reload after editing `js/` or `css/`** (`cmd+shift+r`). Chrome
  caches them aggressively, and a normal reload will show you the old
  behavior — easy to misread as a broken change.
- **A backgrounded tab reports `document.visibilityState === "hidden"` and
  starves media decoding.** Videos then sit at `readyState 0` indefinitely
  and look broken when nothing is wrong. Check visibility before chasing it.

## Cleanup

```bash
kill $(lsof -ti:8000)
```

Only if you started it — leave a pre-existing server alone.
