export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
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
  const terrain = (x, s) => {
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
  return { center, elevation, heading, curvature, terrain, seed, biome };
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
    this.y = this.road.elevation(s) + 0.64;
    this.vy = 0;
    this.roll = 0;
    this.pitch = 0;
    this.slip = 0;
    this.wheelSpin = 0;
    this.offroad = false;
    this.acceleration = 0;
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
      this.u = clamp(vx * sin - vz * cos, 0, 57);
      this.v = clamp(vx * cos + vz * sin, -10, 10);
      this.yawRate *= 0.45;
    }
    return incoming < -1;
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
    };
  }
  step(dt, input, wet = false) {
    const s = -this.z,
      offset = this.x - this.road.center(s);
    this.offroad = Math.abs(offset) > 5.15;
    const oldU = this.u;
    const steeringLimit = 0.52 / (1 + this.u * 0.024);
    this.steer = damp(this.steer, clamp(input.steer, -1, 1) * steeringLimit, 7.5, dt);
    const grip = (wet ? 0.72 : 1) * (this.offroad ? 0.55 : 1);
    const mass = 1280,
      lf = 1.22,
      lr = 1.38,
      inertia = 2100;
    const speed = Math.max(Math.abs(this.u), 3);
    const frontSlip = this.steer - Math.atan2(this.v + lf * this.yawRate, speed);
    const rearSlip = -Math.atan2(this.v - lr * this.yawRate, speed);
    const maxFront = mass * 9.81 * 0.53 * grip,
      maxRear = mass * 9.81 * 0.47 * grip * (input.handbrake ? 0.34 : 1);
    const front = maxFront * Math.tanh((frontSlip * 65000) / maxFront);
    const rear = maxRear * Math.tanh((rearSlip * 70000) / maxRear);
    const engine = clamp(input.throttle, 0, 1) * 6.4 * Math.max(0.15, 1 - this.u / 57);
    const braking = clamp(input.brake, 0, 1) * 10.8 + (input.handbrake ? 4 : 0);
    const resistance = 0.16 + 0.00095 * this.u * this.u + (this.offroad ? 1.9 + 0.04 * this.u : 0);
    const slope = (this.road.elevation(s + 1) - this.road.elevation(s - 1)) / 2;
    this.u = clamp(
      this.u + (engine - braking - resistance - slope * 9.81 + this.v * this.yawRate) * dt,
      0,
      57,
    );
    if (this.u > 2) {
      this.v += ((front + rear) / mass - this.u * this.yawRate) * dt;
      this.yawRate += ((lf * front - lr * rear) / inertia) * dt;
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
    const currentS = -this.z,
      ground = this.road.terrain(this.x, currentS) + 0.82;
    const bump = this.offroad
      ? Math.sin(currentS * 2.1) * 0.09 + Math.sin(currentS * 3.9) * 0.04
      : Math.sin(currentS * 0.55) * 0.008;
    this.vy += ((ground + bump - this.y) * 105 - this.vy * 16) * dt;
    this.y += this.vy * dt;
    this.roll = damp(this.roll, clamp(-this.u * this.yawRate * 0.012, -0.13, 0.13), 5, dt);
    this.pitch = damp(this.pitch, clamp(this.acceleration * 0.008 - slope, -0.18, 0.18), 6, dt);
    this.slip = Math.max(Math.abs(frontSlip), Math.abs(rearSlip));
    this.distance += Math.hypot(this.u, this.v) * dt;
    this.wheelSpin += (this.u * dt) / 0.34;
  }
}
