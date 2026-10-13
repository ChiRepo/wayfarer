# Slow Roads Remake — Wayfarer

## Canonical project

The user requested this permanent project directory on 13 October 2026:
`/Users/chinmayc/Documents/slow roads remake`

Continue all game development here. The former projectless chat directory under `Documents/Codex/2026-10-12/` is a preserved backup, not the active checkout.

Read `PROGRESS.md` and `README.md` at the beginning of project work. Keep `PROGRESS.md` current after meaningful changes, recording the outcome, files affected, verification actually completed, and remaining work. Preserve a local Git checkpoint for completed user-requested work; do not commit unrelated user changes. No automatic background work or timed backups have been configured.

## Structure

- The runnable static game is `dist/`; no dependency installation or build is needed.
- `npm start` serves the game at `http://127.0.0.1:4173`.
- `npm test` exercises vehicle and road behavior. `npm run check` checks source syntax.
- The complete REA checkout, dependencies, selected reference modules, and raw evidence are preserved under `work/`. Treat the reference captures and original evidence as immutable research inputs. Do not include them in the game's deployment.
- `RESEARCH.md` and `rea-summary.json` retain concise analysis provenance. `MIGRATION.json` records migration verification; the detailed per-file inventory is `work/migration-verification.json`.
- This is an independently written game. Do not copy the reference game's source, textures, models, or audio into the deliverable.

## Verification and publication

Read `.openai/hosting.json` for the existing Site identity. Reuse it; do not create a duplicate Site. The last verified hosted state had version 0 and no live URL. Do not claim deployment or comparative superiority without evidence. Follow applicable Sites tooling for future publication.

Run relevant checks after implementation changes. Browser checks are needed for rendering or interaction changes; distinguish desktop viewport tests from physical phone or controller tests. Preserve explicit verification limitations from `PROGRESS.md` until they are resolved.
