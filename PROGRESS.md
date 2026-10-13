# Project progress

Canonical folder: `/Users/chinmayc/Documents/slow roads remake`.
Project name: **Slow Roads Remake — Wayfarer**.
Original chat: `01a13134-2b74-7150-a90b-4720844a3b5c` — Rebuild Slowroads.io from scratch.

## 13 October 2026 — GitHub publication

The user requested creating a new GitHub repository named `wayfarer`, committing, and pushing the project. The completed game and Firebase multiplayer release are committed as `e254cee`. GitHub repository: https://github.com/ChiRepo/wayfarer (private). The canonical checkout uses this repository as `origin`, and `main` tracks `origin/main`. Only the tracked original game, deployment configuration, tests, and concise research/progress records will be pushed; the ignored full research workspace and installed dependencies remain local. Private visibility is the default because public visibility was not requested.

Installed the official GitHub CLI. The user completed GitHub device authorization; the verified account is `ChiRepo`. Created the private repository and successfully pushed the full local commit history to `main`, including game release `e254cee` and publication preparation `7f194d0`. Repository creation, committing, and the initial push are complete. This publication record is saved in a follow-up commit and pushed to the same branch. No additional game changes or Firebase deployment were needed for GitHub publication.

## 13 October 2026 — Multiplayer

The user expanded the request to multiplayer after the first updated game successfully deployed to https://wavefinder-2da9d.web.app. Added eight-seat shared rooms, invitation codes/links, anonymous player identities, synchronized road/biome/server-time weather, remote cars with independent paint and wheel animation, interpolation, presence/heartbeat and disconnect cleanup, rejoin/regroup controls, connection cancellation, and solo fallback. Remote drivers are intentionally non-colliding companions.

Created the first default Realtime Database in asia-southeast1 and enabled anonymous Auth in the same requested project. Added restrictive database rules with per-driver ownership, validated fields/bounds, immutable route metadata, and eight-seat capacity. No unrelated project services or database data were changed. All multiplayer runtime dependencies are bundled locally; npm audit reported zero vulnerabilities after updating Firebase and applying a patched gRPC dependency override.

Verified 19 offline tests, all syntax checks, and 22 live rule/integration checks against an isolated disposable room with two disposable identities. The live script cleans up its own test records and identities. Two browser clients joined the same room, both displayed two players and matching sky state, and one client's driving appeared on the other. Regroup and leave worked, reducing the remaining client's count back to one. Java emulators were not used (local Java 8); live rule testing was used instead.

Final release: Firebase Hosting deployed successfully at https://wavefinder-2da9d.web.app. All 12 hosted files were fetched and their SHA-256 hashes matched the canonical dist/ files after the last release. Re-ran all 19 offline tests, five source syntax checks, and all 22 live database checks against the final rules; all passed. Anonymous sign-in now initializes only the required in-memory Auth dependency, avoiding unused popup/redirect helpers. Safe connection diagnostics record only stage, code, and a bounded URL-redacted cause.

Final browser evidence: one public-site client and a local client using the same deployed backend showed two drivers, visible companion cars/name labels, and matching evolving weather. Leaving removed the companion from the remaining client's roster. The public room dialog fits a 390 × 844 viewport. Screenshots are copied into work/qa/. Two fresh public-site clients could not both be verified inside Codex's in-app browser: its Firebase anonymous sign-in request failed with TypeError: Failed to fetch, while the identical local client succeeded. Direct sign-in using the public site's Origin/Referer returned HTTP 200 with the correct CORS origin. The user separately confirmed that a fresh room was created successfully from the live public site in their regular browser. This confirms public room creation; a two-device public invitation join is not independently verified.

Physical devices, controllers, eight simultaneous browsers, and competitive anti-cheat remain unvalidated. Room metadata from abnormal disconnects is not backed by a scheduled cleanup service. No sidebar registration or background automation is pending.

## 13 October 2026 — Dynamic driving and Firebase update

Implemented closed terrain volumes with collision height matching rendered triangles; four sampled wheel contacts with spring/damper loads, suspension travel, gravity and body pitch/roll; bumper/cabin collision coverage; posts/sign collisions and continuous rail contact; reverse with a stopped shift delay, reverse lights, HUD and camera direction; six timed weather moods with wet-grip buildup/drying, wind-driven foliage, clouds, rain and tire spray; adaptive pixel budgets, battery-saver 30 FPS, mobile safe areas and landscape layouts. Fixed Escape opening and immediately closing the pause dialog.

Verification: all 15 automated tests and source syntax checks pass. Browser checks verified keyboard and touch reverse (approximately 22 km/h), forward shift, all three scenery choices, rain/mist/blue hour, paint, graphics modes, autodrive, camera switching and a valid 390 × 844 photo preview. Portrait 390 × 844, landscape 844 × 390, and desktop 1280 × 720 were inspected. No console errors observed. Physical devices and gamepads remain untested; universal device performance is not claimed.

Firebase CLI access and the `wavefinder-2da9d` Hosting site are confirmed. Deployment is complete; see the final multiplayer release verification above. Only the static game in `dist/` is published; research/dependencies are excluded. The initial solo deployment did not load Firebase SDK/Analytics; the later multiplayer addition lazily loads Firebase Auth and Realtime Database. Analytics remains absent.

## 13 October 2026 — Permanent project and preservation

- Copied the complete game and complete REA working directory into the user-requested folder. The game is now at the project root; REA and evidence are in `work/`.
- Verified all 18,531 copied file/symlink entries: 509,066,208 file bytes, zero mismatches. SHA-256 hashes were compared for every regular file. Detailed inventory: `work/migration-verification.json`.
- Preserved hidden files, the local Git metadata, the original REA Git checkout, installed analysis dependencies, the full 107,510,292-byte raw analysis record, and the three original downloaded modules.
- Ran `npm test` from the new folder: all seven physics checks passed.
- Ran `npm run check` from the new folder: all three source syntax checks passed.
- Added durable project guidance in `AGENTS.md` and this progress log, and established a local Git checkpoint.
- The older projectless workspace remains as a backup. Future edits belong in this canonical directory.

### Folder-only storage confirmed

The user explicitly requested skipping Codex project creation/attachment and keeping all progress in this directory. App project registration is no longer required or pending. Continue using this canonical folder explicitly for future work in this chat.

Rechecked 18,511 preserved file/symlink entries on 13 October: zero mismatches. The 20 entries excluded from this follow-up comparison are root Git metadata and the intentionally updated README/.gitignore. Game source, the full REA checkout, dependencies, and research evidence remain intact. This progress log and AGENTS.md record the folder-only decision.

## 12 October 2026 — Initial playable implementation

Implemented an original Three.js endless-driving game with alpine, coast, and desert scenery, four weather/light presets, procedural road/terrain chunks, a custom coupe with paint choices, tire slip and wet grip, suspension/body motion, approximate tree/rock/guardrail collisions, autodrive, three cameras, photo mode, sound synthesis, keyboard/touch input, gamepad mapping, and local preference persistence.

Used the requested morluto/rea repository (commit `11fe5a13f8aee87d0c0e036a9f497407e085fe48`) for static analysis of three publicly delivered Slow Roads modules. See `RESEARCH.md` for scope and evidence provenance. The original source/assets are not part of the deployed game files.

### Verified previously in browser

- Startup, keyboard acceleration, reset, pause, autodrive, scenery/weather/paint controls, and camera switching.
- Rain and blue-hour rendering, and photo preview rendering at 1280 × 720.
- Mobile viewport at 390 × 844 and touch acceleration to approximately 41 km/h.
- Desktop preview around 60 FPS on the development machine; not a cross-device benchmark.

### Remaining work and known limits

- Native PNG file saving through the in-app browser remains unverified: automated downloads timed out, although the generated image preview was valid.
- Physical phone and physical gamepad testing remain outstanding.
- One vehicle; no traffic, damage simulation, or full rigid-body rollover. Physics is an approximate game model.
- Visual and handling superiority over Slow Roads has not been established by comparative testing.
- Historical Sites publication was unfinished (`appgprj_6acd1c205138819180d529fe26d5224f`, version 0). This was superseded by the user-requested, completed Firebase deployment above. Do not resume Sites publication; no raw credentials were saved here.
