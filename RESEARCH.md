# REA investigation and reconstruction notes

Investigation date: 12 October 2026.

## Tool provenance

Cloned the user-requested repository, [morluto/rea](https://github.com/morluto/rea/), at commit `11fe5a13f8aee87d0c0e036a9f497407e085fe48`, package version 6.4.0. Installed its dependencies locally, compiled its CLI, and ran:

```sh
node scripts/rea.mjs analyze-javascript-application ../reference --json
```

REA evidence ID: `ev_ed824156e2d66e02d65b926b02575befb90055065efae34e2094731481cd05c4`.

Input tree SHA-256: `936adf1364c3904cde4c131f32212fbee37f862958b533120b7461dced4087d4`.

The original page's root HTML rejected the command-line download with HTTP 403. The page was inspected through the ordinary browser, and three JavaScript resources already observed loading there were obtained directly for local static analysis:

- `https://slowroads.io/_app/immutable/chunks/HillsHeightmap.1d759caa.js`
- `https://slowroads.io/_app/immutable/chunks/SettingsManager.a31845d6.js`
- `https://slowroads.io/_app/immutable/nodes/3.da2ad8c8.js`

REA parsed all three selected files, totaling 1,243,150 bytes, with zero parse failures. It visited 337,961 AST nodes and reported 657 findings; the application graph contains 72 nodes and 663 edges. The graph distinguishes assets, module relationships, and local storage observations. Missing imported modules remain unresolved.

Raw evidence and reference modules are retained in the task's `work/` directory, outside this deliverable and outside deployment. A compact provenance record is included as `rea-summary.json`.

## Observed behavior

The live browser showed a Three.js-based driving scene with a following camera, distance and speed readouts, autodrive, world/style/vehicle controls, and seeded landscape generation. The source resource inventory exposed Svelte-generated entry/chunk modules and distinct terrain and settings modules. Local static inspection of the terrain module showed seeded, layered procedural height generation and road interpolation. REA identified settings/profile-related browser storage calls. These findings support the broad architecture; they do not prove every runtime interaction.

## Reconstruction decisions

Wayfarer reproduces the observable endless-driving loop using independently written road generation, rendering, physics, interface, sound synthesis, and geometry. It uses a smooth analytical road with deterministic seed-dependent curvature and elevation, streamed terrain bands, reusable instanced vegetation, and a standalone vehicle model. Weather changes rendering and tire grip. A curvature-aware controller follows the road for autodrive.

The new aesthetic uses warm cream typography, dark green controls, atmospheric layers, a sculpted retro coupe, animated lighting/weather, and three contrasting landscape palettes. Enhancements are implementation choices rather than measured claims of superiority.

## Limits

This was a selected-module investigation, not an exhaustive decompilation or recovery of the original engine. Static AST relationships do not establish runtime execution, and minified or dynamic relationships remain uncertain. No original physics parameters were reconstructed or copied. No original source or assets are distributed with Wayfarer. The public reference is credited for the concept and behavioral comparison.
