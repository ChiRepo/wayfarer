export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const TERRAIN_OFFSETS = [-450,-350,-260,-195,-140,-100,-70,-48,-32,-22,-15,-10,-7,-5.2,0,5.2,7,10,15,22,32,48,70,100,140,195,260,350,450];
export function makeRoad(seed = 7, biome = "alpine") {
  const phase = (seed % 997) * 0.007;
  const bend = biome === "coast" ? 1.25 : biome === "desert" ? 0.8 : 1;
  const center = (s) =>
    bend * (45 * Math.sin(s * 0.0038 + phase) + 19 * Math.sin(s * 0.0101 + phase * 0.7));
  const elevation = (s) =>
    biome === "coast"
      ? 7 + 3 * Math.sin(s * 0.0045)
      : biome === "desert"
        ? 9 + 4 * Math.sin(s * 0.005)
        : 16 + 9 * Math.sin(s * 0.0038) + 3 * Math.sin(s * 0.012);
  const heading = (s) => Math.atan2(center(s + 0.5) - center(s - 0.5), 1);
  const curvature = (s) => wrap(heading(s + 1) - heading(s - 1)) / 2;
  const terrainVertex = (x, s) => {
    const d = x - center(s),
      a = Math.abs(d),
      blend = clamp((a - 6) / 30, 0, 1);
    const rough =
      (Math.sin(x * 0.051 + s * 0.027) * 2 + Math.sin(x * 0.019 - s * 0.011) * 5) * blend;
    if (biome === "coast" && d > 0)
      return lerp(elevation(s) - 0.15, -3, clamp((d - 6) / 40, 0, 1)) + rough * 0.15;
    return (
      elevation(s) -
      0.18 +
      blend * (Math.pow(Math.max(a - 12, 0), 0.72) * 0.54 + rough) +
      Math.sin(s * 0.11 + x * 0.3) * 0.18 * blend
    );
  };
  // Match the exact triangles used by the rendered ground, including chunk seams.
  const terrain = (x, s) => {
    const s0 = Math.floor(s / 4) * 4, t = (s - s0) / 4;
    const d = x - lerp(center(s0), center(s0 + 4), t);
    let j = 0;
    while (j < TERRAIN_OFFSETS.length - 2 && d > TERRAIN_OFFSETS[j + 1]) j++;
    const a = TERRAIN_OFFSETS[j], b = TERRAIN_OFFSETS[j + 1];
    const u = clamp((d - a) / (b - a), 0, 1);
    const h00 = terrainVertex(center(s0) + a, s0);
    const h10 = terrainVertex(center(s0) + b, s0);
    const h01 = terrainVertex(center(s0 + 4) + a, s0 + 4);
    const h11 = terrainVertex(center(s0 + 4) + b, s0 + 4);
    return u + t <= 1 ? h00 + u * (h10 - h00) + t * (h01 - h00)
      : h11 + (1 - u) * (h01 - h11) + (1 - t) * (h10 - h11);
  };
  const surface = (x, s) => {
    const s0 = Math.floor(s / 4) * 4, t = (s - s0) / 4;
    const d = Math.abs(x - lerp(center(s0), center(s0 + 4), t));
    return d <= 5.1 ? lerp(elevation(s0), elevation(s0 + 4), t) + 0.015 : terrain(x, s);
  };
  return { center, elevation, heading, curvature, terrain, terrainVertex, surface, seed, biome };
}
export class Vehicle {
  constructor(road) {
    this.road = road;
    this.distance = 0;
    this.reset();
  }
  reset(s = 0) {
    this.x = this.road.center(s) + 1.85;
    this.z = -s;
    this.heading = this.road.heading(s);
    this.u = 0;
    this.v = 0;
    this.yawRate = 0;
    this.steer = 0;
    this.y = this.road.surface(this.x, s) + 0.67;
    this.vy = 0;
    this.roll = 0;
    this.pitch = 0;
    this.slip = 0;
    this.wheelSpin = 0;
    this.offroad = false;
    this.acceleration = 0;
    this.gear = 1;
    this.shiftHold = 0;
    this.rollVelocity = this.pitchVelocity = 0;
    this.impact = 0;
    this.wheels = [-1, 1].flatMap(side => [-1.3, 1.3].map(z => ({
      x: side * 0.94, z, height: -0.32, compression: 0, grounded: true, ground: 0,
    })));
    this.updateSuspension(0, true);
  }
  collideCircle(x, z, radius) {
    const dx = this.x - x,
      dz = this.z - z,
      distance = Math.hypot(dx, dz),
      limit = radius + 1.05;
    if (distance >= limit) return false;
    const nx = distance > 0.001 ? dx / distance : 1,
      nz = distance > 0.001 ? dz / distance : 0;
    this.x += nx * (limit - distance);
    this.z += nz * (limit - distance);
    const sin = Math.sin(this.heading),
      cos = Math.cos(this.heading);
    let vx = sin * this.u + cos * this.v,
      vz = -cos * this.u + sin * this.v;
    const incoming = vx * nx + vz * nz;
    if (incoming < 0) {
      vx -= incoming * 1.12 * nx;
      vz -= incoming * 1.12 * nz;
      this.u = clamp(vx * sin - vz * cos, -9, 57);
      this.impact = Math.min(1, -incoming / 14);
      this.rollVelocity += clamp((nx * cos + nz * sin) * incoming * 0.015, -0.3, 0.3);
      this.v = clamp(vx * cos + vz * sin, -10, 10);
      this.yawRate *= 0.45;
    }
    return incoming < -1;
  }
  collideObstacle(x, z, radius) {
    // Three overlapping spheres cover both bumpers and the cabin, in either direction.
    let hit = false;
    for (const along of [-1.25, 0, 1.25]) {
      const dx = Math.sin(this.heading) * along, dz = -Math.cos(this.heading) * along;
      this.x += dx; this.z += dz;
      hit = this.collideCircle(x, z, radius) || hit;
      this.x -= dx; this.z -= dz;
    }
    return hit;
  }
  updateSuspension(dt, snap = false) {
    const sin = Math.sin(this.heading), cos = Math.cos(this.heading);
    let total = 0, front = 0, rear = 0, left = 0, right = 0;
    for (const w of this.wheels) {
      const x = this.x + cos * w.x - sin * w.z;
      const z = this.z + sin * w.x + cos * w.z;
      w.ground = this.road.surface(x, -z);
      total += w.ground;
      if (w.z < 0) front += w.ground; else rear += w.ground;
      if (w.x < 0) left += w.ground; else right += w.ground;
    }
    const pitchTarget = clamp(Math.atan2(front - rear, 5.2) - this.acceleration * 0.006, -0.42, 0.42);
    const rollTarget = clamp(Math.atan2(right - left, 3.76) + this.u * this.yawRate * 0.009, -0.32, 0.32);
    const target = total / 4 + 0.67;
    if (snap) { this.y = target; this.pitch = pitchTarget; this.roll = rollTarget; }
    else {
      // Sprung body: critically damped heave plus independent pitch/roll springs.
      let support = 0;
      for (const w of this.wheels) {
        const mount = this.y + Math.sin(this.roll) * w.x - Math.sin(this.pitch) * w.z;
        const length = mount - w.ground - 0.35;
        const velocity = this.vy + this.rollVelocity * w.x - this.pitchVelocity * w.z;
        w.load = length < 0.58 ? clamp((0.429 - length) * 28800 - velocity * 4800, 0, 12500) : 0;
        support += w.load;
      }
      this.vy += (support / 1280 - 9.81) * dt;
      this.y += this.vy * dt;
      this.pitchVelocity += ((pitchTarget - this.pitch) * 65 - this.pitchVelocity * 12) * dt;
      this.rollVelocity += ((rollTarget - this.roll) * 75 - this.rollVelocity * 13) * dt;
      this.pitch = clamp(this.pitch + this.pitchVelocity * dt, -0.45, 0.45);
      this.roll = clamp(this.roll + this.rollVelocity * dt, -0.35, 0.35);
    }
    // Bump stops keep the body and tires out of the solid ground on sharp crests.
    let floor = this.road.surface(this.x, -this.z) + 0.38;
    for (const w of this.wheels) floor = Math.max(floor, w.ground + 0.43);
    if (this.y < floor) { this.y = floor; this.vy = Math.max(0, this.vy); }
    for (const w of this.wheels) {
      const desired = w.ground + 0.35 - this.y;
      const droop = -0.58 + Math.sin(this.roll) * w.x - Math.sin(this.pitch) * w.z;
      w.height = Math.max(droop, desired);
      w.grounded = desired >= droop;
      w.compression = clamp((w.height + 0.32) / 0.26, -1, 1);
    }
  }
  autopilot() {
    const s = -this.z,
      look = 15 + this.u * 0.85;
    const desired = Math.atan2(this.road.center(s + look) + 1.85 - this.x, look);
    const curvature = Math.abs(this.road.curvature(s + look));
    const target = Math.min(25, Math.sqrt(3.3 / Math.max(curvature, 0.001)));
    return {
      steer: clamp(wrap(desired - this.heading) * 2.1 - this.yawRate * 0.22, -0.8, 0.8),
      throttle: clamp((target - this.u) * 0.6, 0, 1),
      brake: clamp((this.u - target) * 0.5, 0, 1),
      handbrake: false,
      automatic: true,
    };
  }
  step(dt, input, wet = false) {
    const s = -this.z,
      offset = this.x - this.road.center(s);
    this.offroad = Math.abs(offset) > 5.15;
    const oldU = this.u;
    const throttle = clamp(input.throttle || 0, 0, 1), brake = clamp(input.brake || 0, 0, 1);
    if (input.automatic) { this.gear = 1; this.shiftHold = 0; }
    else if (Math.abs(this.u) < 0.18 && !input.handbrake &&
      ((this.gear === 1 && brake > 0.1 && throttle === 0) ||
       (this.gear === -1 && throttle > 0.1 && brake === 0))) {
      this.shiftHold += dt;
      if (this.shiftHold >= 0.45) { this.gear *= -1; this.shiftHold = 0; }
    } else this.shiftHold = 0;
    const contact = this.wheels.filter(w => w.grounded).length / 4;
    const grip = 1.2 * (1 - clamp(Number(wet), 0, 1) * 0.28) * (this.offroad ? 0.55 : 1) * Math.max(0.15, contact);
    const steeringLimit = 0.58 / (1 + Math.abs(this.u) * 0.024);
    // Keep full-lock input within available cornering grip at speed. Small inputs
    // retain their sensitivity, while low-speed turns can still use full lock.
    const cornerLimit = Math.atan2(9.81 * grip * 0.9 * 2.6, Math.max(this.u * this.u, 1));
    const steerTarget = clamp(input.steer || 0, -1, 1) * steeringLimit;
    this.steer = damp(this.steer, input.handbrake ? steerTarget : clamp(steerTarget, -cornerLimit, cornerLimit), 11, dt);
    const mass = 1280,
      lf = 1.22,
      lr = 1.38,
      inertia = 2100;
    const speed = Math.max(Math.abs(this.u), 3);
    const frontSlip = this.steer - Math.atan2(this.v + lf * this.yawRate, speed);
    const rearSlip = -Math.atan2(this.v - lr * this.yawRate, speed);
    const maxFront = mass * 9.81 * 0.53 * grip,
      maxRear = mass * 9.81 * 0.47 * grip * (input.handbrake ? 0.34 : 1.12);
    const front = maxFront * Math.tanh((frontSlip * 85000) / maxFront);
    const rear = maxRear * Math.tanh((rearSlip * 100000) / maxRear);
    const drive = this.gear === 1 ? throttle : brake;
    const stop = this.gear === 1 ? brake : throttle;
    const engine = drive * (this.gear === 1 ? 6.4 : -3.4) * Math.max(0.15, 1 - Math.abs(this.u) / (this.gear === 1 ? 57 : 9));
    const braking = stop * 10.8 + (input.handbrake ? 9 : 0);
    const resistance = 0.16 + 0.00095 * this.u * this.u + (this.offroad ? 1.9 + 0.04 * Math.abs(this.u) : 0);
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const slope = (this.road.surface(this.x + fx, s + fz) - this.road.surface(this.x - fx, s - fz)) / 2;
    let next = this.u + (engine - slope * 9.81 + this.v * this.yawRate) * dt;
    const slowing = (braking + resistance) * dt;
    next = Math.sign(next) * Math.max(0, Math.abs(next) - slowing);
    this.u = clamp(next, this.gear === -1 ? -9 : 0, this.gear === 1 ? 57 : 0);
    if (this.u > 2) {
      this.v += ((front + rear) / mass - this.u * this.yawRate) * dt;
      this.yawRate += ((lf * front - lr * rear) / inertia) * dt;
      if (!input.handbrake && contact > 0) {
        // Arcade stability assistance keeps the rear wheels following the turn
        // and removes lingering sideways motion when the driver straightens up.
        const desiredYaw = this.u * Math.tan(this.steer) / (lf + lr);
        this.yawRate = damp(this.yawRate, desiredYaw, 5 * grip * contact, dt);
        this.v = damp(this.v, lr * this.yawRate, 7 * grip * contact, dt);
      }
    } else {
      this.v = damp(this.v, 0, 9, dt);
      this.yawRate = damp(this.yawRate, (this.u * Math.tan(this.steer)) / (lf + lr), 12, dt);
    }
    this.v = clamp(this.v, -15, 15);
    this.yawRate = clamp(this.yawRate, -2, 2);
    this.heading = wrap(this.heading + this.yawRate * dt);
    this.x += (Math.sin(this.heading) * this.u + Math.cos(this.heading) * this.v) * dt;
    this.z += (-Math.cos(this.heading) * this.u + Math.sin(this.heading) * this.v) * dt;
    this.acceleration = (this.u - oldU) / dt;
    this.updateSuspension(dt);
    this.impact = damp(this.impact, 0, 4, dt);
    this.slip = Math.max(Math.abs(frontSlip), Math.abs(rearSlip));
    this.distance += Math.hypot(this.u, this.v) * dt;
    this.wheelSpin += (this.u * dt) / 0.34;
  }
}
