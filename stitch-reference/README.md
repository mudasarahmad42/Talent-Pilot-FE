# Stitch Reference Assets

This folder stores the frontend design references captured from Google Stitch.

Commit the curated references needed to make Angular screens pixel-aligned with Stitch. Do not commit local browser profiles, temporary capture caches, or broad API dumps.

## Keep

- `selected/`
  - Curated Stitch screenshots and exported HTML used as the source reference for frontend implementation.
- `stitch-screens.json`
  - Lightweight Stitch screen index for finding source screens.

## Ignore

Browser profile folders are generated during local capture/testing and are ignored by `.gitignore`:

- `chrome-profile/`
- `chrome-profile-check/`
- `chrome-profile-check-2/`

Do not use profile folders as source material.

Also ignore:

- `current-*.png` local QA screenshots
- `stitch-screens-response.json` raw Stitch API response with transient download URLs

## Rule

Stitch is the visual/layout reference. Product behavior, data rules, and API contracts come from the repository knowledge base and backend contracts.
