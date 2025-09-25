
# Patch Notes — 2025-08-30

## Fix: Save-version compatibility
- **loadGame** now loads any existing save (no strict `saveVersion` equality).
- Existing "ensure" / migration scaffolding runs for all saves.
- **Import** accepts any valid save JSON and prompts for confirmation before overwriting.

## Change: Remove Disciples upgrade
- Removed the **Disciples** upgrade definition from `upgradeDefs`.
- Removed UI/logic skips for `def.id === 'disciples'` (no longer needed).
- The **disciples system** (party, assignments, contributions) remains intact.

## Cleanup: Dead references
- Removed handlers for non-existent elements: `gather-btn`, `home-stats`, `upgrade-stats`, `party-clear-btn`.
- After cleanup, all `getElementById`/`querySelector('#…')` targets in `main.js` exist in `index.html` (composite selectors excepted).

## Build size: Heavy/duplicate assets
- Deleted the unused `V1_Cultivation_World/` directory (~10.6 MB) to prevent duplicate downloads.
- No compression or quality reductions were applied to remaining assets.

---
This patch was generated programmatically with careful regex edits and manual validation around changed regions.
