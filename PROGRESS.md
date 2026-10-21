# Project progress

Canonical folder: `/Users/chinmayc/Documents/slow roads remake`.
Project name: **Slow Roads Remake — Wayfarer**.
Original chat: `01a13134-2b74-7150-a90b-4720844a3b5c` — Rebuild Slowroads.io from scratch.

## 22 October 2026 — Shared mini-games and persistent lobby scenarios

Extended both existing lobby types with host-controlled Sprint, Cruise, Drift, race and free-drive activities. An atomic round message carries route, weather and a five-second server-time countdown; player seats, room code and invitations remain intact. Host settings now change shared scenery/weather/road without leaving. Scenario changes end the current round and reset everyone. Late joins load the current route and wait for the next start. Shared score/finish data is displayed in the room, with pause ghosting for races and retained score visibility for Cruise/Drift. Old-route peers are hidden until their updated pose arrives. An in-flight old pose rejected during a switch no longer asks players to rejoin.

Validation: 37 offline tests and six syntax checks passed. Deployed additive database rules and passed all 57 live isolated checks, including all five activity transitions, guest denial, invalid round data, seat preservation and bounded scores. Two browser clients in room 2XHEGEH7Z4 received synchronized Cruise and Drift starts, shared points, and the same new scenery when returning to free driving; both original identities remained in the room. Guest start buttons were disabled. Test clients left normally after verification. Screenshot: work/qa/shared-session-release.png. One expected stale pose rejection during switching led to the retry-status fix, covered by regression. Physical devices and adverse network contacts remain unverified.

Firebase Hosting published release 20261022a successfully at https://wavefinder-2da9d.web.app. All 13 deployed files match local hashes; live startup and lobby controls show no captured console errors. Prepared the verified source for the existing GitHub main branch.

## 21 October 2026 — Steering sensitivity correction and manual scenarios

Fixed saturated steering input: previously digital full-lock hit the same grip limit at most sensitivity settings. Manual sensitivity now scales the available angle after limiting and controls response speed; 2.00× reaches the safe maximum. Preserved the existing autopilot mapping. Added a regression measuring sustained heading changes at 10, 20 and 35 m/s across 0.25×, 1.00× and 2.00×.

Added visible Manual mini-games buttons to welcome and free driving. The chooser offers current road, Alpine daylight, Coastal rain, Desert after dark and Racing road for all three challenges. Presets set deterministic routes and initial weather, disable weather cycling, and retain that scenery when returning to free driving; HUD identifies the scenario. Keyboard/touch/gamepad remain manual and autodrive is disabled during challenges.

Verification: 33 offline tests and six syntax checks pass. Browser verified both new launch buttons, coastal rain selection and sprint countdown, manual acceleration to 38 km/h, scenario HUD, end/results and return to free driving. No captured console errors. Physical devices/controllers remain untested. Firebase Hosting deployment succeeded at https://wavefinder-2da9d.web.app; all 13 deployed files match local hashes. The published launcher and scenario chooser were verified in browser. Screenshot: work/qa/manual-scenarios-release.png.

## 21 October 2026 — Release verification and sensitivity

Added persistent 0.25×–2.00× steering sensitivity with a live numeric output for keyboard, touch and gamepad. Both input gain and response smoothing use the setting; the high-speed steering limit remains. Verified saved 1.35× after reload and fixed narrow-screen label wrapping. Bumped module/style versions to avoid stale assets.

Current verification: 32 offline tests, six syntax checks and all 31 live isolated multiplayer checks pass. Browser verified Drift Flow start/HUD, track regeneration, visible settlements/curbs, acceleration/cornering, fullscreen entry/exit, sensitivity persistence and responsive layout. No captured browser console errors. Earlier checks recorded below cover remaining challenge/photo flows. Physical phones/controllers and adverse-network race collisions remain unverified.

Firebase Hosting successfully deployed the final cache-version update to https://wavefinder-2da9d.web.app. Live browser startup and the new settings control were verified; screenshot: work/qa/sensitivity-release.png. The linked historical Sites registration remains version 0 with no live URL; its source helper returned "Unable to prepare the Site." Continued the canonical Firebase release destination required by AGENTS.md, preserving Sites access and GitHub history.

## 21 October 2026 — Race modes, immersive handling and scenery

Preserved and completed the existing uncommitted mini-game/fullscreen/camera work. Added Drift Flow, shared race lobbies with owner-controlled synchronized starts, 1500-metre sprint/120-second timeout, provisional finish timing, and car contact limited to active fresh racers. Free-drive rooms remain ghosted. Paused racers are ghosted and the race clock continues; late joins wait for another round. Extended the strict room schema for mode, countdown and bounded race/finish fields without changing player ownership or room capacity.

Removed off-road grip loss, replacing it with a smooth entry-speed-relative 5–15 km/h cap reduction. Added bounded assisted handbrake slides, tyre smoke, less body roll/pitch, smoother wheel travel, sport body details, touch drift control, aerial/trackside cameras, and four photo presets. Added deterministic racing-style endless routes (reserved seed range), instanced curbs, villages/city districts, shared facade atlas, bounded particles, and incremental distant chunk generation. Added versioned local module/style URLs after browser testing exposed stale cached modules.

Verification so far: 30 offline checks and six syntax checks pass. Database rules deployed and 31 isolated live checks pass, including owner-only race start, invalid timestamps/fields, race membership, ghosting, existing ownership, and eight-seat capacity. Browser checks confirmed fresh startup, desktop acceleration/handbrake, full-screen entry/exit, challenge HUD, generated curbs/buildings and aerial framing. Further release checks below. Physical device/gamepad and adverse-network race contact remain unverified. Roads are point-to-point, not closed lap circuits; racing is client-authoritative and finishing position is provisional.

## 20 October 2026 — Mini-games, fullscreen and racing camera

Added two solo manual-driving mini-games: Horizon Sprint (750 metres / 90 seconds) and Clean Cruise (60 seconds, clean-road streak scoring). Full-viewport chooser/results dialogs have close, replay and free-drive controls; the live HUD includes countdown, timer, progress and end action. Paused dialogs/photo/hidden tabs stop the challenge clock. Reset/route changes end an attempt, and multiplayer cannot start during a challenge. Added browser fullscreen entry/exit with unsupported-browser feedback.

Added progressive engine power delivery with immediate brake torque cut, lower chase framing, damped speed-dependent distance/FOV, turn look-ahead and smoother hood-camera entry. Reduced-motion behavior is retained. Files: app, HTML/CSS, world/physics, new challenges module and tests, package syntax check list.

Verification: all 25 offline tests and six syntax checks pass. New tests cover countdown, forward-only progress, completion/timeout, clean scoring and power ramp/braking. Desktop browser checks covered both starts, countdown/scoring, pause/resume, camera cycling, end/results, fullscreen entry/exit, and Escape closing menus. Portrait 390×844 and landscape 844×390 previews were inspected. No console errors observed. Physical devices/controllers remain untested. Release verification is recorded below when completed; multiplayer rules/backend are unchanged.

## 20 October 2026 — Reduced drifting and smoother steering

Completed the handling adjustment requested on 16 October: increased tire grip/cornering stiffness and rear traction, faster damped steering, grip-limited high-speed steering, and grounded stability assistance for yaw and lateral motion. Low-speed steering has more available lock. Handbrake input deliberately bypasses the assistance; wet/off-road grip differences remain.

Verified all 22 offline tests and five syntax checks. Added regression coverage for full-lock turns at 10/20/30/45 m/s in dry/wet conditions, steering release/reversal, and handbrake recovery. On an isolated flat driving pad at an initial 20 m/s with a two-second full-steer input, peak body sideslip fell from 34.6 to 0.32 degrees dry and from 26.26 to 0.21 degrees wet. These are simulation checks, not physical automotive measurements. Browser checks covered dry steering reversals, wet steering at approximately 75 km/h, reset, and autodrive; no browser errors were observed. Physical controller/device checks remain outstanding.

Firebase Hosting deployment succeeded, and the published physics.js SHA-256 matches the canonical local file. Source and verification notes are saved in this checkpoint for pushing to the existing GitHub main branch. Multiplayer backend/rules were unchanged. Local browser QA used port 4174 because port 4173 was serving another application when the work began.

## 14 October 2026 — MIT license

Added the standard MIT license in root `LICENSE`, with copyright `2026 Chinmay Chaudhari`, as requested. Linked the license from README and set MIT in the package metadata and lockfile. Existing third-party license notices are retained. Refreshed `main` from GitHub first, preserving the newer README commit `1e84b97`. Checked the license text, JSON metadata, and diff formatting before committing and pushing these changes.

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
