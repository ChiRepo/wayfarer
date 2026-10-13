import { test } from "node:test";
import assert from "node:assert/strict";
import { Vehicle, makeRoad } from "../dist/physics.js";
const neutral = { steer: 0, throttle: 0, brake: 0, handbrake: false };
function run(v, seconds, input, wet = false) {
  for (let i = 0; i < seconds * 120; i++)
    v.step(1 / 120, typeof input === "function" ? input(v) : input, wet);
}
test("same seed reproduces a smooth, continuous endless road", () => {
  const a = makeRoad(72),
    b = makeRoad(72);
  for (let s = 0; s < 20000; s += 10) {
    assert.equal(a.center(s), b.center(s));
    assert.ok(Math.abs(a.center(s + 0.001) - a.center(s)) < 0.001);
    assert.ok(Number.isFinite(a.terrain(500, s)));
  }
});
test("accelerator gains speed and brakes stop without reversing", () => {
  const v = new Vehicle(makeRoad());
  run(v, 10, { ...neutral, throttle: 1 });
  assert.ok(v.u > 12);
  run(v, 8, { ...neutral, brake: 1 });
  assert.equal(v.u, 0);
  assert.ok(v.distance > 50);
});
test("fixed steps give stable frame-rate independent results", () => {
  const a = new Vehicle(makeRoad()),
    b = new Vehicle(makeRoad());
  run(a, 20, (v) => v.autopilot());
  for (let frames = 0; frames < 600; frames++)
    for (let step = 0; step < 4; step++) b.step(1 / 120, b.autopilot());
  assert.ok(Math.abs(a.x - b.x) < 1e-9);
  assert.ok(Math.abs(a.z - b.z) < 1e-9);
});
test("autodrive stays within the road across all landscapes and weather", () => {
  for (const biome of ["alpine", "coast", "desert"])
    for (const wet of [false, true]) {
      const v = new Vehicle(makeRoad(7, biome));
      let maxOffset = 0;
      run(
        v,
        180,
        (v) => {
          maxOffset = Math.max(maxOffset, Math.abs(v.x - v.road.center(-v.z)));
          return v.autopilot();
        },
        wet,
      );
      assert.ok(v.distance > 2500);
      assert.ok(maxOffset < 4.5, `${biome} wet=${wet} offset=${maxOffset}`);
    }
});
test("hard steering and handbrake remain finite on wet terrain", () => {
  const v = new Vehicle(makeRoad());
  run(v, 60, { steer: 1, throttle: 1, brake: 0, handbrake: true }, true);
  for (const k of ["x", "z", "u", "v", "heading", "roll", "pitch", "y"])
    assert.ok(Number.isFinite(v[k]), k);
  assert.ok(Math.abs(v.roll) <= 0.13);
});
test("reset clears momentum and places car at the requested road position", () => {
  const v = new Vehicle(makeRoad());
  run(v, 8, { ...neutral, throttle: 1, steer: 0.2 });
  v.reset(500);
  assert.equal(v.z, -500);
  assert.equal(v.u, 0);
  assert.equal(v.v, 0);
  assert.equal(v.x, v.road.center(500) + 1.85);
});
test("obstacle collision resolves overlap and removes impact velocity", () => {
  const v = new Vehicle(makeRoad());
  v.heading = 0;
  v.u = 20;
  const x = v.x,
    z = v.z - 1;
  assert.equal(v.collideCircle(x, z, 0.6), true);
  assert.ok(Math.hypot(v.x - x, v.z - z) >= 1.649);
  assert.ok(v.u < 2);
  assert.ok(Number.isFinite(v.v));
});
