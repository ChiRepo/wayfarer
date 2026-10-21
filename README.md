# Wayfarer

Source repository: https://github.com/ChiRepo/wayfarer.

Permanent project folder: `/Users/chinmayc/Documents/slow roads remake`. See `PROGRESS.md` for saved progress and `AGENTS.md` for continuing work.

An original, stylized endless-driving game inspired by the relaxed driving loop of [Slow Roads](https://slowroads.io/). Built from scratch with Three.js after examining public browser behavior and selected public JavaScript modules using [REA](https://github.com/morluto/rea/).

## Firebase Hosting

Live game: https://wavefinder-2da9d.web.app. Deployment target: `wavefinder-2da9d`, serving only `dist/`. Deploy with an authorized Firebase CLI session:


The public client API key is not needed to serve this static game. Analytics is not loaded. Multiplayer loads a locally bundled Firebase Auth/Realtime Database client only when joining a room. Firebase is now the requested deployment destination; the older unpublished Sites registration is retained only as historical metadata.

## Play locally

Requires Node.js 22 or newer. No dependency installation or build is needed.

```sh
npm start
```

Open `http://127.0.0.1:4173`. The `dist/` directory is also deployable to any static web host. Open through HTTP, rather than double-clicking the HTML file, because ES modules require an appropriate origin.

## Drive together

Use the people icon in the top bar to create a room, then share its invitation link or 10-character code. Up to eight drivers share the same seeded road, scenery, and weather. Enter a nickname; anonymous Firebase sign-in handles session identity without asking for an email or password.

Remote cars use interpolation and short bounded extrapolation. Driving updates send at most ten times per second, paused cars send less frequently, and an idle heartbeat preserves presence. Disconnect cleanup removes cars; abandoned slots can be reclaimed after two minutes. Rooms last up to 24 hours. Meet the convoy moves you near another driver. Leaving restores solo route controls. Shared-drive companions stay non-colliding. Race lobbies enable bounded car contact between active racers; paused, disconnected, finished, and stale peers are ghosted.

This is cooperative, client-authoritative driving, not competitive anti-cheat multiplayer. State and nicknames are visible to authenticated players who possess the room code. No chat, personal-location tracking, or Analytics was added. Empty rooms are removed on a normal last-player exit; metadata from crashed/abandoned rooms may remain until revisited or administratively cleaned up. An internet connection is required for multiplayer. Solo play remains available without joining a room.

Firebase Realtime Database lives in `asia-southeast1`. Rules deny room-directory enumeration, unauthenticated reads, invalid/out-of-range payloads, extra fields, a ninth seat, and writes to another active driver's car. `database.rules.json` is the tracked source. Deploy rule changes with `firebase deploy --only database --project wavefinder-2da9d`; anonymous auth was provisioned with the tracked `auth` configuration.

`npm ci` installs development dependencies; `npm run build:firebase` rebuilds the vendored browser client from `src/firebase-entry.js`. `npm run test:multiplayer:live` performs 57 live checks using two disposable identities and an isolated room, then deletes its test data. It contacts the configured real Firebase project. The ordinary `npm test` stays offline. Java-based emulators were not used; the local machine has Java 8.

## Mini-games and immersive driving

Use **Manual mini-games** on the welcome screen or while free driving (or the flag icon) to open the full-screen challenge chooser. Select your current road, Alpine daylight, Coastal rain, Desert after dark, or Racing road, then press a challenge’s Start button. Presets load a fixed route and steady weather, retained when returning to free driving. **Horizon Sprint** asks you to travel 750 metres forward in 90 seconds. **Clean Cruise** gives you 60 seconds to earn points by staying on the road above 30 km/h; longer clean streaks increase your multiplier. **Drift Flow** scores controlled on-road slides for 60 seconds. Solo challenges have a three-second countdown; shared rounds use five seconds. All three have a progress HUD, results, replay, and return to free driving. In solo play, dialogs, photo mode, and hidden tabs pause the timer. Shared rounds use server time and continue while menus or hidden tabs pause your driving. Reset ends the attempt. Challenges support solo and shared manual driving. In a lobby, the host starts the round for everyone without changing the room code or player seats.

The adjacent full-screen icon enters browser fullscreen and becomes an exit control. Escape also uses the browser's normal fullscreen exit behavior; × or Escape closes challenge menus. Unsupported browsers keep the viewport-filling layout and show a helpful message.

The chase camera now rides lower, looks into turns, and eases its distance and field of view with speed. Camera changes blend smoothly, including entry to hood view. Reduced-motion preferences disable extra speed and turn movement. Accelerator power builds gradually while brakes still cut power immediately.

## Shared mini-games and scenario changes

From either kind of lobby, open **Mini-games & scenarios** (or **Manual mini-games**), choose a scenario and start Sprint, Cruise or Drift. The host can replace an active round, start a 1500-metre race, or choose **Apply scenario & return lobby to free drive**. Room code, invitation and player seats stay intact. Host settings also allow landscape, weather, weather-cycle and road regeneration changes in the same session. These changes end the current round and reset everyone onto the updated road.

Guests receive the shared road, weather and countdown automatically. Late arrivals load the current scenario and wait for the next round. The room roster shows live Cruise/Drift points and finish times. Sprint and race have player contact; Cruise, Drift and free driving remain ghosted. Scores and contacts are client-authoritative. Paused drivers earn no points; the common deadline continues. Your personal steering sensitivity, graphics, paint and volume remain adjustable.

Everyone should load the latest game before playing together; older clients do not understand shared mini-games. Physical-device, eight-browser and adverse-network racing remain unverified.

## 21 October racing and scenery update

Settings includes a **Steering sensitivity** slider with a live **0.25×–2.00×** value, saved between visits. Lower values soften steering; higher values sharpen response. Sensitivity scales the usable wheel angle after the speed/grip limit, so held keyboard and touch inputs remain distinct at every setting; 2.00× uses the full safe angle. It applies to keyboard, touch and gamepad, while preserving the speed-dependent steering safety limit. Autodrive retains its own tuning.

- **Race with friends:** create a race lobby from the people icon, share the invite, then the host starts a five-second synchronized countdown. Drive 1500 metres within 120 seconds. Results report your finish time; the room lists received finish times. Reset/end forfeits the attempt. The server clock continues through menus and hidden tabs. Late arrivals wait for the next race; the host can start a replacement round without leaving the lobby. Each client resolves its own car contacts; this is casual racing, not authoritative competitive physics or anti-cheat.
- **Off-road driving:** retains road tyre grip. Entering the shoulder smoothly limits speed by 5–15 km/h, proportional to entry speed, with a low-speed crawl allowance. The limit resets when returning to the road; terrain slopes and obstacles still affect motion. Rain still changes grip.
- **Controlled slides:** progressive rear-traction release, bounded yaw assistance and lower handbrake deceleration make slides easier to catch. Tap Space (or the touch DRIFT button), steer, then release to regain grip. Pooled, fading tyre smoke appears during grounded slides; spray and dust remain.
- **Car and cameras:** limited spring-driven body lean, smoothed wheel travel, a rigid sport-touring body with skirts/splitter/rear wing, gradual engine torque, speed-responsive chase camera, and five blended views (chase, hood, wide, aerial, trackside). Photo mode includes hero, overlook, profile and bird’s-eye presets plus PNG capture.
- **Routes and places:** settings can generate seeded racing-style roads with continuous straights, sweepers, chicanes and red/white curbs. These are endless point-to-point roads, not closed F1 lap circuits. Seeds 90000–99999 select this route family and reproduce it in shared rooms. Procedural villages and city districts appear along all routes; buildings have approximate collisions.
- **Streaming budget:** collision-critical neighbouring chunks load immediately; distant chunks generate one per frame. Buildings and curbs use instancing and shared geometry/materials. A single tiny procedural facade atlas is reused, avoiding per-building downloads or texture churn. Smoke has a fixed 70-particle pool; battery saver lowers emissions. Existing adaptive pixel budgets remain. This is bounded procedural streaming, not a benchmarked guarantee for every device.

## 20 October handling update

Normal steering now uses stronger tire grip, faster smooth steering response, and stability assistance to reduce sideways sliding. Steering is limited by available grip at high speed; low-speed turns retain more steering angle. Releasing steering quickly settles the car. Rain still reduces grip and the handbrake allows an intentional slide. The 21 October update replaces off-road grip loss with a speed penalty.

Three added regression checks cover dry/wet cornering at multiple speeds, steering reversals and recovery, and regaining control after handbrake use.

## 13 October update

- Ground is closed into solid volumes, and contact sampling matches its rendered triangles. Terrain chunk joins remain continuous. Tires sample four contact points; spring/damper forces support the body, with gravity, suspension travel, bump stops, and independent pitch/roll response.
- Three overlapping collision shapes cover both bumpers and the cabin. Trees, rocks, signs, posts, and guardrails block the car. Collisions remain approximate, not full mesh rigid-body simulation. Deep coastal water returns the car safely to the road.
- Hold brake after stopping to engage reverse, then hold accelerator to brake and return to drive. The touch brake and gamepad LT work the same way. Reverse has its own lights, HUD and camera direction.
- Six weather moods evolve every 2–4 minutes of active play: clear daylight, golden hour, cloud drift, mist, rain, and blue hour. Light, cloud cover, wind, rain and headlights fade gently. Wet roads lose grip, emit tire spray, and dry gradually. Disable the cycle in settings to keep a mood. In solo play, pausing or hiding the tab stops the weather clock. Shared rooms follow server time so everyone experiences the same weather.
- Adaptive graphics adjust rendering resolution to measured frame time, with a screen-pixel budget. Battery saver targets 30 FPS, disables shadows and reduces rain. Portrait framing, landscape-phone controls, safe-area spacing, scrollable dialogs and reduced-motion behavior are improved.

## Included

- Procedural alpine, coastal, and desert landscapes, reproducible road seeds, recycled terrain chunks, instanced foliage, mountains, grass, rocks, roadside markers, guardrails, and signs.
- Atmospheric sky with moving procedural clouds, directional shadows, animated ocean water, golden hour, daylight, rain, and blue hour; lighting changes blend smoothly.
- Original coupe geometry with configurable paint, animated steering and wheels, brake lights, working headlights, and body pitch and roll.
- A fixed 120 Hz bicycle dynamics model: front/rear tire slip, bounded lateral forces, speed-sensitive steering, drag, braking, handbrake, slope forces, rough-surface resistance, reduced wet grip, and damped suspension.
- Approximate collision response for tree trunks, rocks, and guardrails.
- Manual driving and curvature-aware pursuit-based autodrive.
- Chase, hood, and wide cameras; spring-smoothed camera movement and speed-responsive field of view.
- Orbiting photo mode, PNG preview/download, synthesized motor/wind/rain-like sound, local preference persistence, pause/resume, keyboard and touch controls, and standard gamepad input mapping.

## Controls

| Action | Input |
| --- | --- |
| Accelerate / brake | W / S or Up / Down |
| Reverse | Hold S / Down after stopping for 0.45 seconds |
| Return to forward drive | Hold W / Up to stop and shift forward |
| Steer | A / D or Left / Right |
| Handbrake | Space |
| Autodrive | F |
| Camera | C |
| Photo mode | P |
| Return to road | R |
| Pause / return from photo | Escape |

Touch buttons appear on small screens and touch devices. For a standard gamepad, use the left stick, right trigger, left trigger, and primary face button for steering, throttle, brake, and handbrake. A physical controller was not available for testing.

## Verification

```sh
npm test
npm run check
```

Thirty automated checks cover seeded terrain continuity, acceleration/braking, consistent fixed-step integration, three-minute autodrive runs for each landscape in dry and wet conditions, extreme handling stability, reset, impact response, reverse shifting and steering, four-wheel ground contact and suspension settling, triangle-matched terrain seams, closed mesh topology, and timed weather evolution/drying. Browser checks covered startup, manual acceleration, reset, pause, autodrive, scenery/weather/paint changes, camera modes, photo rendering, and the mobile layout/touch accelerator. The desktop preview reported around 60 FPS on the development machine; this is not a cross-device benchmark. Multiplayer passed 22 live rules/integration checks, and two clients using the live backend displayed companion cars and matching weather. The user confirmed fresh room creation on the public site in their regular browser. Codex's in-app browser could create the initial public session but later fresh public sign-ins failed at the browser fetch layer; the same local client and direct sign-in with the public Origin/Referer succeeded. A two-device public invitation join remains unverified.

PNG capture produced a valid 1280 × 720 image in the browser. The in-app browser's automated download interface timed out, so native file saving remains unverified there. The preview supports the ordinary image context menu as a fallback. WebGL 2 is required. Physical phone and gamepad testing remain outstanding.

## Scope and architecture

This is an original browser game, not a redistribution of Slow Roads or a claim of complete feature parity. The art is deliberately stylized, not photorealistic. Vehicle dynamics are game-oriented approximations rather than a validated automotive simulator. There is one vehicle, with reverse gear, but no traffic, damage model, or full rigid-body rollover simulation. Visual and handling superiority to the original has not been established by comparative user testing.

- `dist/world.js`: Three.js scene, generated geometry, chunk lifetime, weather, car, cameras, and collision candidates.
- `dist/physics.js`: renderer-independent seeded road and vehicle dynamics.
- `dist/app.js`: fixed-step loop, input, interface, settings, sound, and photo capture.
- `dist/weather.js`: timed solo weather and deterministic shared-room weather.
- `dist/multiplayer.js`: anonymous room sessions, presence, and movement publication.
- `database.rules.json`: room access and player-state validation.
- `src/firebase-entry.js`: minimal Firebase browser exports; rebuilt with `npm run build:firebase`.
- `dist/style.css` and `dist/index.html`: responsive interface.
- `tests/physics.test.mjs`: physics checks using Node's built-in test runner.
- `RESEARCH.md`: REA provenance, observations, and analysis boundaries.

Three.js r170 is vendored under its MIT license in `dist/vendor/THREE-LICENSE.txt`. The UI requests DM Sans and Manrope through Google Fonts, with local sans-serif fallbacks. No Slow Roads source, textures, models, sounds, or branding are included in the deployed game.

## License

Copyright (c) 2026 Chinmay Chaudhari. Licensed under the [MIT License](LICENSE). Bundled third-party dependencies retain their own license notices.
