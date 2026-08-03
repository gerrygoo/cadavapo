---
description: Launch local HTTP server and open in Chrome
---

# Run the cadavapo site locally

Starts a Python HTTP server on port 8000 and opens Chrome to view the site.

## Implementation

```bash
cd /Users/ggo/code/cadavapo
python3 -m http.server 8000 > /tmp/cadavapo-server.log 2>&1 &
SERVER_PID=$!
sleep 1
open -a "Google Chrome" "http://localhost:8000"
echo "Server running (PID: $SERVER_PID). View at http://localhost:8000"
```

## Cleanup

To stop the server:
```bash
kill $(lsof -ti:8000)
```
