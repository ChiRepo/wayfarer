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

// An open, flat driving pad isolates handling from roadside obstacles and edges.
function handlingCar(speed) {
  let car;
  const road = { center: () => car?.x || 0, heading: () => 0, surface: () => 0 };
  car = new Vehicle(road);
  car.u = speed;
  return car;
}
test("normal sharp turns stay aligned and settle after steering release", () => {
  for (const wet of [false, true]) for (const speed of [10, 20, 30, 45]) {
    const car = handlingCar(speed);
    let peakSlip = 0;
    run(car, 2, () => {
      peakSlip = Math.max(peakSlip, Math.abs(Math.atan2(car.v, car.u)));
      return { ...neutral, throttle: 0.3, steer: 1 };
    }, wet);
    assert.ok(peakSlip < 6 * Math.PI / 180, `speed=${speed} wet=${wet} slip=${peakSlip}`);
    assert.ok(car.heading > 0.2, 'Full steering must still produce a useful turn');
    run(car, 1, neutral, wet);
    assert.ok(Math.abs(car.v) < 0.15, 'Sideways motion must stop after release');
    assert.ok(Math.abs(car.yawRate) < 0.02, 'Car must stop rotating after release');
  }
});
test("steering reversals are smooth, responsive, and retain wet-road differences", () => {
  const dry = handlingCar(20), wet = handlingCar(20);
  run(dry, 1, { ...neutral, steer: 1 });
  run(wet, 1, { ...neutral, steer: 1 }, true);
  assert.ok(dry.heading > wet.heading * 1.15, 'Rain must still reduce cornering grip');
  const oldSteer = dry.steer, oldYaw = dry.yawRate;
  dry.step(1 / 120, { ...neutral, steer: -1 });
  assert.ok(dry.steer > 0 && dry.steer < oldSteer, 'Steering must blend through a reversal');
  assert.ok(Math.abs(dry.yawRate - oldYaw) < 0.1, 'Yaw must not snap');
  run(dry, 0.5, { ...neutral, steer: -1 });
  assert.ok(dry.yawRate < -0.2, 'Car must follow the opposite turn promptly');
  assert.ok(Math.abs(dry.v) < 1, 'Changing direction must not start a slide');
});
test("handbrake permits an intentional slide and releasing it restores control", () => {
  const car = handlingCar(25);
  run(car, 0.8, { ...neutral, throttle: 1, steer: 1, handbrake: true });
  assert.ok(Math.abs(car.v) > 1, 'Handbrake should still break rear traction');
  run(car, 1, neutral);
  assert.ok(Math.abs(car.v) < 0.2);
  assert.ok(Math.abs(car.yawRate) < 0.03);
});

test('power builds progressively and braking immediately cuts drive torque', () => {
  const v = new Vehicle(makeRoad());
  v.step(1/120, {...neutral, throttle:1});
  assert.ok(v.drivePower > 0 && v.drivePower < 0.03);
  run(v,1,{...neutral,throttle:1});
  assert.ok(v.drivePower > 0.9 && v.drivePower < 1);
  v.step(1/120,{...neutral,throttle:1,brake:1});
  assert.equal(v.drivePower,0);
  v.reset(); assert.equal(v.drivePower,0);
});

test('track seeds are reproducible, distinct and smooth at segment boundaries',()=>{
 const a=makeRoad(90001),b=makeRoad(90001),c=makeRoad(90002);
 assert.equal(a.circuit,true);assert.equal(makeRoad(7).circuit,false);
 assert.notEqual(a.center(110),c.center(110));
 for(let s=-440;s<5000;s+=220){
   assert.equal(a.center(s),b.center(s));
   assert.ok(Math.abs(a.heading(s+.01)-a.heading(s-.01))<.001);
   assert.ok(Math.abs(a.surface(a.center(s),s+.001)-a.surface(a.center(s),s-.001))<.01);
 }
});
test('offroad applies a single speed-relative penalty without reducing steering grip',()=>{
 const flat={...makeRoad(),center:()=>0,heading:()=>0,surface:()=>0};
 for(const speed of [10,25,45]) {
   const v=new Vehicle(flat);v.x=10;v.u=speed;
   v.step(1/120,neutral);
   const loss=(speed-v.offroadLimit)*3.6;
   assert.ok(loss>=4.99 && loss<=15.01);
   const limit=v.offroadLimit;run(v,1,neutral);assert.equal(v.offroadLimit,limit);
   assert.ok(Math.abs(v.v)<.001);
   v.x=0;v.step(1/120,neutral);assert.equal(v.offroadLimit,null);
 }
});
test('race collisions resolve own car contact, ignore height-separated cars and stay bounded',()=>{
 const v=new Vehicle(makeRoad());v.heading=0;v.u=20;
 const peer={x:v.x,y:v.y,z:v.z-2,h:0,u:5};
 assert.equal(v.collidePlayer({...peer,y:v.y+5},1/120),false);
 assert.equal(v.collidePlayer(peer,1/120),true);assert.ok(v.u<20 && v.u>=5);
 for(let i=0;i<120;i++) v.collidePlayer(peer,1/120);
 assert.ok(Number.isFinite(v.x+v.z+v.u+v.v));
});

test("sensitivity adjusts response without exceeding safe steering limits", () => {
  const slow = new Vehicle(makeRoad()), fast = new Vehicle(makeRoad());
  slow.step(1/120, {...neutral, steer:.5, sensitivity:.25});
  fast.step(1/120, {...neutral, steer:.5, sensitivity:2});
  assert.ok(fast.steer > slow.steer * 2);
  for (const sensitivity of [.25, 1, 2, NaN, Infinity, -100, 100]) {
    const v = new Vehicle(makeRoad());
    run(v, 4, {...neutral, throttle:1, steer:1, sensitivity});
    assert.ok(Number.isFinite(v.heading));
    assert.ok(Math.abs(v.steer) <= .58);
  }
});
