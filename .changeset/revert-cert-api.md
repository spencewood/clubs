---
"clubs": patch
---

Revert certificate fetching to use filesystem instead of Caddy API. The `/config/apps/tls/certificates` API endpoint returns null in production and doesn't expose ACME certificates. Certificate viewing now requires mounting the `caddy_data` volume.
