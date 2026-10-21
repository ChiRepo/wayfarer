export const scenarios = {
  current: { name: 'Your current road' },
  alpine: { name: 'Alpine daylight', biome: 'alpine', weather: 'day', seed: 72 },
  rain: { name: 'Coastal rain', biome: 'coast', weather: 'rain', seed: 25 },
  night: { name: 'Desert after dark', biome: 'desert', weather: 'night', seed: 49 },
  track: { name: 'Racing road', biome: 'alpine', weather: 'day', seed: 97752 },
};
export const challenges = {
  sprint: { name: 'Horizon Sprint', seconds: 90, distance: 750, description: 'Cover 750 metres in 90 seconds. Keep moving forward and follow the road.' },
  race: { name: 'Shared Road Race', seconds: 120, distance: 1500, description: 'Race 1500 metres with friends. Car contact is enabled.' },
  drift: { name: 'Drift Flow', seconds: 60, description: 'Hold controlled on-road slides above 25 km/h to score. Release the handbrake to recover.' },
  cruise: { name: 'Clean Cruise', seconds: 60, description: 'Drive for 60 seconds. Stay on the road above 30 km/h to build a clean streak and earn points.' },
};
// Pure fixed-step challenge state; paused frames never advance the clock.
export class Challenge {
  constructor(kind, s) {
    if (!challenges[kind]) throw new Error('Unknown challenge');
    Object.assign(this, { kind, start: s, countdown: 3, elapsed: 0, progress: 0, score: 0, streak: 0, bestStreak: 0, done: false, won: false });
  }
  step(dt, car) {
    if (this.done || dt <= 0) return;
    if (this.countdown > 0) { this.countdown = Math.max(0, this.countdown - dt); return; }
    const config = challenges[this.kind];
    dt = Math.min(dt, config.seconds - this.elapsed);
    this.elapsed += dt;
    // Forward route progress cannot be farmed by reversing or circling.
    this.progress = Math.max(this.progress, -car.z - this.start);
    const clean = !car.offroad && car.u >= 30 / 3.6 && car.impact < 0.1;
    const drifting = !car.offroad && car.u > 25/3.6 && Math.abs(car.v) > 1 && Math.abs(car.v/car.u) < .65 && car.impact < .1;
    if (this.kind === 'drift' ? drifting : clean) {
      this.streak += dt;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += dt * 10 * (1 + Math.min(2, this.streak / 10));
    } else this.streak = 0;
    if (this.kind === 'sprint' && this.progress >= config.distance) { this.done = true; this.won = true; }
    if (this.elapsed >= config.seconds - 1e-7) { this.elapsed = config.seconds; this.done = true; this.won = ['cruise','drift'].includes(this.kind) || this.won; }
  }
}

// Race time always follows the server clock, including paused/hidden tabs.
export class RoadRace {
  constructor(startedAt) {
    Object.assign(this,{kind:'race',startedAt,countdown:5,elapsed:0,progress:0,done:false,won:false});
  }
  tick(now, car) {
    if(this.done) return;
    this.countdown=Math.max(0,(this.startedAt-now)/1000);
    this.elapsed=Math.max(0,(now-this.startedAt)/1000);
    this.progress=Math.max(0,-car.z);
    if(this.countdown===0 && this.progress>=1500) {this.done=true;this.won=true;}
    if(this.elapsed>=120) {this.done=true;this.elapsed=120;}
  }
  step() {} // fixed physics frames do not own the shared clock
}

// Shared rounds use wall-clock time; menus never extend a competitive round.
export class SharedChallenge extends Challenge {
  constructor(kind, startedAt) {
    super(kind, 0);
    this.shared = true;
    this.startedAt = startedAt;
    this.countdown = 5;
  }
  tick(now, car) {
    if (this.done) return;
    const config = challenges[this.kind];
    this.countdown = Math.max(0, (this.startedAt - now) / 1000);
    this.elapsed = Math.min(config.seconds, Math.max(0, (now - this.startedAt) / 1000));
    if (this.countdown > 0) return;
    this.progress = Math.max(this.progress, -car.z);
    if (config.distance && this.progress >= config.distance) {
      this.done = true; this.won = this.elapsed < config.seconds;
    }
    if (this.elapsed >= config.seconds) {
      this.done = true;
      this.won = !config.distance;
    }
  }
  step(dt, car) {
    if (this.countdown > 0 || this.done) return;
    const elapsed = this.elapsed;
    super.step(dt, car);
    this.elapsed = elapsed; // tick owns the shared deadline; step only scores active driving.
  }
}
