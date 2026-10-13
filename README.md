# Wayfarer

Source repository: https://github.com/ChiRepo/wayfarer (private).

Permanent project folder: `/Users/chinmayc/Documents/slow roads remake`. See `PROGRESS.md` for saved progress and `AGENTS.md` for continuing work.

An original, stylized endless-driving game inspired by the relaxed driving loop of [Slow Roads](https://slowroads.io/). Built from scratch with Three.js after examining public browser behavior and selected public JavaScript modules using [REA](https://github.com/morluto/rea/).

## Firebase Hosting

Live game: https://wavefinder-2da9d.web.app. Deployment target: `wavefinder-2da9d`, serving only `dist/`. Deploy with an authorized Firebase CLI session:

```sh
firebase deploy --only hosting --project wavefinder-2da9d
```

The public client API key is not needed to serve this static game. Analytics is not loaded. Multiplayer loads a locally bundled Firebase Auth/Realtime Database client only when joining a room. Firebase is now the requested deployment destination; the older unpublished Sites registration is retained only as historical metadata.

## Play locally

Requires Node.js 22 or newer. No dependency installation or build is needed.

```sh
npm start
```

Open `http://127.0.0.1:4173`. The `dist/` directory is also deployable to any static web host. Open through HTTP, rather than double-clicking the HTML file, because ES modules require an appropriate origin.

## Drive together

Use the people icon in the top bar to create a room, then share its invitation link or 10-character code. Up to eight drivers share the same seeded road, scenery, and weather. Enter a nickname; anonymous Firebase sign-in handles session identity without asking for an email or password.

Remote cars use interpolation and short bounded extrapolation. Driving updates send at most ten times per second, paused cars send less frequently, and an idle heartbeat preserves presence. Disconnect cleanup removes cars; abandoned slots can be reclaimed after two minutes. Rooms last up to 24 hours. Meet the convoy moves you near another driver. Leaving restores solo route controls. Other drivers are non-colliding companions to prevent disruptive impacts.

This is cooperative, client-authoritative driving, not competitive anti-cheat multiplayer. State and nicknames are visible to authenticated players who possess the room code. No chat, personal-location tracking, or Analytics was added. Empty rooms are removed on a normal last-player exit; metadata from crashed/abandoned rooms may remain until revisited or administratively cleaned up. An internet connection is required for multiplayer. Solo play remains available without joining a room.

Firebase Realtime Database lives in `asia-southeast1`. Rules deny room-directory enumeration, unauthenticated reads, invalid/out-of-range payloads, extra fields, a ninth seat, and writes to another active driver's car. `database.rules.json` is the tracked source. Deploy rule changes with `firebase deploy --only database --project wavefinder-2da9d`; anonymous auth was provisioned with the tracked `auth` configuration.

`npm ci` installs development dependencies; `npm run build:firebase` rebuilds the vendored browser client from `src/firebase-entry.js`. `npm run test:multiplayer:live` performs 22 live checks using two disposable identities and an isolated room, then deletes its test data. It contacts the configured real Firebase project. The ordinary `npm test` stays offline. Java-based emulators were not used; the local machine has Java 8.

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

Nineteen automated checks cover seeded terrain continuity, acceleration/braking, consistent fixed-step integration, three-minute autodrive runs for each landscape in dry and wet conditions, extreme handling stability, reset, impact response, reverse shifting and steering, four-wheel ground contact and suspension settling, triangle-matched terrain seams, closed mesh topology, and timed weather evolution/drying. Browser checks covered startup, manual acceleration, reset, pause, autodrive, scenery/weather/paint changes, camera modes, photo rendering, and the mobile layout/touch accelerator. The desktop preview reported around 60 FPS on the development machine; this is not a cross-device benchmark. Multiplayer passed 22 live rules/integration checks, and two clients using the live backend displayed companion cars and matching weather. The user confirmed fresh room creation on the public site in their regular browser. Codex's in-app browser could create the initial public session but later fresh public sign-ins failed at the browser fetch layer; the same local client and direct sign-in with the public Origin/Referer succeeded. A two-device public invitation join remains unverified.

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
