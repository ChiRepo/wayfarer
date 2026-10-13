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
  run(v, 8, { ...neutral, brake: 1, automatic: true });
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

test("brake stops before engaging reverse, then accelerator returns to drive", () => {
  const v = new Vehicle(makeRoad()); v.heading = 0;
  run(v, 3, { ...neutral, throttle: 1 });
  const forwardSpeed = v.u;
  v.step(1 / 120, { ...neutral, brake: 1 });
  assert.equal(v.gear, 1); assert.ok(v.u < forwardSpeed && v.u > 0);
  run(v, 8, { ...neutral, brake: 1 });
  assert.equal(v.gear, -1); assert.ok(v.u < -1 && v.u >= -9);
  run(v, 8, { ...neutral, throttle: 1 });
  assert.equal(v.gear, 1); assert.ok(v.u > 1);
});
test("short brake taps and handbrake never shift gears", () => {
  const v = new Vehicle(makeRoad());
  run(v, 0.25, { ...neutral, brake: 1 }); assert.equal(v.gear, 1);
  run(v, 3, { ...neutral, brake: 1, handbrake: true });
  assert.equal(v.gear, 1); assert.equal(v.u, 0);
});
test("reverse steering changes heading and rear bumper collides", () => {
  const v = new Vehicle(makeRoad()); v.gear = -1;
  const before = v.heading;
  run(v, 3, { ...neutral, brake: 1, steer: 0.5 });
  assert.ok(v.heading < before - 0.1);
  v.heading = 0; v.u = -5;
  assert.equal(v.collideObstacle(v.x, v.z + 2, 0.5), true);
  assert.ok(v.u > -2);
});
test("four wheels follow solid terrain and independent suspension settles", () => {
  for (const biome of ["alpine", "coast", "desert"]) {
    const v = new Vehicle(makeRoad(71, biome));
    v.x = v.road.center(0) - 24; v.u = 6;
    let independent = false;
    for (let i = 0; i < 2400; i++) {
      v.step(1 / 120, { ...neutral, throttle: 0.4, steer: Math.sin(i / 300) * 0.15 });
      for (const w of v.wheels) assert.ok(v.y + w.height - 0.35 >= w.ground - 1e-8);
      independent ||= Math.abs(v.wheels[0].height - v.wheels[2].height) > 0.03;
      assert.ok(Number.isFinite(v.y));
    }
    assert.ok(independent, biome);
    v.reset(240); run(v, 8, { ...neutral, handbrake: true });
    assert.ok(Math.abs(v.vy) < 0.01); assert.ok(Math.abs(v.pitchVelocity) < 0.01);
  }
});
test("surface height matches triangle interpolation and stays continuous at chunk joins", () => {
  const r = makeRoad(88);
  for (let s = -320; s < 1600; s += 160) {
    const x = r.center(s) + 19;
    assert.ok(Math.abs(r.surface(x, s - 1e-6) - r.surface(x, s + 1e-6)) < 1e-5);
  }
  const s = 83, t = 0.75, a = 15, b = 22, u = 0.6;
  const x = (1 - t) * r.center(80) + t * r.center(84) + a + (b - a) * u;
  const h11 = r.terrainVertex(r.center(84) + b, 84);
  const expected = h11 + (1-u)*(r.terrainVertex(r.center(84)+a,84)-h11) + (1-t)*(r.terrainVertex(r.center(80)+b,80)-h11);
  assert.ok(Math.abs(r.terrain(x,s)-expected) < 1e-9);
});
