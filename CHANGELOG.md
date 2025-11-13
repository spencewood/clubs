# clubs

## 0.15.1

### Patch Changes

- cf45de0: Add caddy version in status dropdown

## 0.15.0

### Minor Changes

- f4527e7: Add e2e tests with playwright

### Patch Changes

- 963a0a9: Make dialog editing easier with api
- fafcf67: Fix minor mobile ux issues on upstreams page

## 0.14.0

### Minor Changes

- 7b93988: Add autocompletion for Caddy directives, handlers, and upstreams
- f0d3558: Add autocomplete for upstream selection

## 0.13.1

### Patch Changes

- 4e203a9: Update charts in analytics for better visuals

## 0.13.0

### Minor Changes

- 2dd3bbb: Add the ability to add upstreams and autocomplete them
- 5e28e5a: Use shadcn components instead of custom components

## 0.12.5

### Patch Changes

- 568ebe1: Use pie charts for secondary metrics
- e4e684f: Fix visual inconsistencies and component cleanup

## 0.12.4

### Patch Changes

- 54afb75: Add server info to mode indicator

## 0.12.3

### Patch Changes

- 1f117f5: Fix transitions and mobile interactions

## 0.12.2

### Patch Changes

- eb41216: Update chart colors and labels

## 0.12.1

### Patch Changes

- b901363: Small tweaks to analytics
- 014f70d: Fix traffic rate numbers and chart

## 0.12.0

### Minor Changes

- 6ad9842: Change metrics to analytics. Update filters to be more useful.

### Patch Changes

- 3225462: Hide certificate viewing feature from documentation. Both the Caddy API endpoint and filesystem approaches are unreliable - the API returns null and filesystem certificates are often stale. The feature remains in code as a hidden/undocumented capability until a reliable method is found.

## 0.11.1

### Patch Changes

- 1f50b1f: Revert certificate fetching to use filesystem instead of Caddy API. The `/config/apps/tls/certificates` API endpoint returns null in production and doesn't expose ACME certificates. Certificate viewing now requires mounting the `caddy_data` volume.

## 0.11.0

### Minor Changes

- 91ed3db: Remove filesystem certs. Use caddy to get current SSL certs.

### Patch Changes

- a3b5be6: Load metrics tab on server
- 26e0aab: Add health endpoint for container health

## 0.10.0

### Minor Changes

- 3304d7a: Add local ssl certs to certificates tab

### Patch Changes

- acfb6e2: Fix site delete issue. Clean up dialogs. Update footer stats.

## 0.9.2

### Patch Changes

- c67d97b: Consistency updates and style cleanup

## 0.9.1

### Patch Changes

- f96ee9e: Fall back to caddyfile when endpoint is json

## 0.9.0

### Minor Changes

- a3288c2: Add metrics tab in left panel

### Patch Changes

- a758633: Move editor under left pane on smaller screens
- b4274ee: Fix response type for caddyfile

## 0.8.2

### Patch Changes

- a02c1aa: Fix status endpoint

## 0.8.1

### Patch Changes

- 8911091: Add logging and better handling for status
- 2b7f5ee: Fix upstream and certificate endpoints

## 0.8.0

### Minor Changes

- 614b8d4: Add caddy back to docker image for formatting

## 0.7.0

### Minor Changes

- 72c0147: Remove caddy from dockerfile

## 0.6.0

### Minor Changes

- da02da0: Fix container ipv6 issue

## 0.5.0

### Minor Changes

- dd70ca4: Move from pure react to Next.js

### Patch Changes

- 88c96bd: Move view full config
- 613884a: Visual update for site

## 0.4.0

### Minor Changes

- 99ccbde: Add certificates tab and info
- 0d49017: Add metrics

### Patch Changes

- 3b54ef9: Consolidate upstreams without port. Add offline server.

## 0.3.5

### Patch Changes

- Fix caddy site inspect

## 0.3.4

### Patch Changes

- Fix site id tags and pulling correct config

## 0.3.3

### Patch Changes

- Optimize docker and approve builds

## 0.3.2

### Patch Changes

- Fix confirmation on all deletes

## 0.3.1

### Patch Changes

- b50bbc1: Fix individual site configs. Add version in header.

## 0.3.0

### Minor Changes

- 7162d0c: Add configuration inspectors for seeing caddy json configuration

## 0.2.1

### Patch Changes

- More style updates. Fix format.

## 0.2.0

### Minor Changes

- bb71673: Add multi-platform Docker support

## 0.1.0

### Minor Changes

- a5fb35d: Change naming convention for containers and sites. UI/Theme tweaks.
