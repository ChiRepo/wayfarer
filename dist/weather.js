import { clamp, damp } from "./physics.js";
export const weatherNames = ["golden", "day", "overcast", "mist", "rain", "night"];
export class WeatherCycle {
  constructor(seed = 7, initial = "golden") {
    this.seed = seed >>> 0; this.current = initial; this.elapsed = 0;
    this.duration = 120 + this.random() * 120;
    this.wetness = initial === "rain" ? 0.8 : 0;
    this.rain = initial === "rain" ? 0.8 : 0;
    this.wind = 0.3; this.variation = 0.5;
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  select(name) {
    if (!weatherNames.includes(name)) return;
    this.current = name; this.elapsed = 0;
    this.duration = 120 + this.random() * 120;
    this.variation = this.random();
  }
  step(dt, automatic = true) {
    dt = Math.max(0, dt);
    let changed = false;
    if (automatic) {
      this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        const choices = weatherNames.filter(n => n !== this.current);
        this.select(choices[Math.floor(this.random() * choices.length)]);
        changed = true;
      }
    }
    const targetRain = this.current === "rain" ? 0.45 + this.variation * 0.55 : 0;
    this.rain = damp(this.rain, targetRain, 0.085, dt);
    this.wetness = clamp(damp(this.wetness, this.rain, this.rain > this.wetness ? 0.045 : 0.009, dt), 0, 1);
    this.wind = damp(this.wind, this.current === "rain" ? 0.7 + this.variation * 0.3 : 0.15 + this.variation * 0.3, 0.06, dt);
    return changed;
  }
}

// All room participants derive the same sky from server time, including late arrivals.
export function roomWeather(seed, initial, elapsedSeconds) {
  const c = new WeatherCycle(seed, initial);
  let remaining = clamp(elapsedSeconds, 0, 86400);
  while (remaining >= c.duration) {
    const duration = c.duration;
    c.step(duration, false); remaining -= duration;
    const choices = weatherNames.filter(n => n !== c.current);
    c.select(choices[Math.floor(c.random() * choices.length)]);
  }
  c.step(remaining, false);
  return c;
}
