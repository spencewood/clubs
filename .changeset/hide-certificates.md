---
"clubs": patch
---

Hide certificate viewing feature from documentation. Both the Caddy API endpoint and filesystem approaches are unreliable - the API returns null and filesystem certificates are often stale. The feature remains in code as a hidden/undocumented capability until a reliable method is found.
