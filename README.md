# Wayfarer

Permanent project folder: `/Users/chinmayc/Documents/slow roads remake`. See `PROGRESS.md` for saved progress and `AGENTS.md` for continuing work.

An original, stylized endless-driving game inspired by the relaxed driving loop of [Slow Roads](https://slowroads.io/). Built from scratch with Three.js after examining public browser behavior and selected public JavaScript modules using [REA](https://github.com/morluto/rea/).

## Play locally

Requires Node.js 22 or newer. No dependency installation or build is needed.

```sh
npm start
```

Open `http://127.0.0.1:4173`. The `dist/` directory is also deployable to any static web host. Open through HTTP, rather than double-clicking the HTML file, because ES modules require an appropriate origin.

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

Seven automated checks cover seeded terrain continuity, acceleration/braking, consistent fixed-step integration, three-minute autodrive runs for each landscape in dry and wet conditions, extreme handling stability, reset, and impact response. Browser checks covered startup, manual acceleration, reset, pause, autodrive, scenery/weather/paint changes, camera modes, photo rendering, and the mobile layout/touch accelerator. The desktop preview reported around 60 FPS on the development machine; this is not a cross-device benchmark.

PNG capture produced a valid 1280 × 720 image in the browser. The in-app browser's automated download interface timed out, so native file saving remains unverified there. The preview supports the ordinary image context menu as a fallback. WebGL 2 is required. Physical phone and gamepad testing remain outstanding.

## Scope and architecture

This is an original browser game, not a redistribution of Slow Roads or a claim of complete feature parity. The art is deliberately stylized, not photorealistic. Vehicle dynamics are game-oriented approximations rather than a validated automotive simulator. There is one vehicle, no reverse gear, no traffic, multiplayer, damage model, or full rigid-body rollover simulation. Visual and handling superiority to the original has not been established by comparative user testing.

- `dist/world.js`: Three.js scene, generated geometry, chunk lifetime, weather, car, cameras, and collision candidates.
- `dist/physics.js`: renderer-independent seeded road and vehicle dynamics.
- `dist/app.js`: fixed-step loop, input, interface, settings, sound, and photo capture.
- `dist/style.css` and `dist/index.html`: responsive interface.
- `tests/physics.test.mjs`: physics checks using Node's built-in test runner.
- `RESEARCH.md`: REA provenance, observations, and analysis boundaries.

Three.js r170 is vendored under its MIT license in `dist/vendor/THREE-LICENSE.txt`. The UI requests DM Sans and Manrope through Google Fonts, with local sans-serif fallbacks. No Slow Roads source, textures, models, sounds, or branding are included in the deployed game.
