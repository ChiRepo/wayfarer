import { World } from "./world.js";
import { Vehicle, makeRoad, clamp } from "./physics.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
let preferences = {
  biome: "alpine",
  weather: "golden",
  seed: 7,
  color: "#efb46e",
  quality: "balanced",
  volume: 35,
};
try {
  const saved = JSON.parse(localStorage.getItem("wayfarer-preferences") || "{}");
  if (["alpine", "coast", "desert"].includes(saved.biome)) preferences.biome = saved.biome;
  if (["golden", "day", "rain", "night"].includes(saved.weather))
    preferences.weather = saved.weather;
  if (Number.isSafeInteger(saved.seed) && saved.seed >= 0) preferences.seed = saved.seed;
  if (/^#[a-f0-9]{6}$/i.test(saved.color)) preferences.color = saved.color;
  if (["balanced", "high", "low"].includes(saved.quality)) preferences.quality = saved.quality;
  if (Number.isFinite(saved.volume)) preferences.volume = clamp(saved.volume, 0, 100);
} catch {}
const save = () => {
  try {
    localStorage.setItem("wayfarer-preferences", JSON.stringify(preferences));
  } catch {}
};
let road = makeRoad(preferences.seed, preferences.biome),
  vehicle = new Vehicle(road),
  world;
try {
  world = new World($("#scene"), road);
} catch (error) {
  console.error(error);
  $("#webgl-error").hidden = false;
  $("#loading").hidden = true;
  throw error;
}
world.setRoad(road);
world.paint.color.set(preferences.color);
world.setWeather(preferences.weather);
world.setQuality(preferences.quality);
let started = false,
  auto = false,
  photo = false,
  keys = new Set(),
  touch = new Set(),
  lastTime = performance.now(),
  accumulator = 0,
  tripStart = 0,
  hudTime = 0,
  frameTime = 0,
  frames = 0,
  fps = 0,
  soundOn = false,
  audio,
  toastTimer;
const names = {
  alpine: ["The Alpine Pass", "High peaks. Deep breaths.", "ALPINE PASS"],
  coast: ["The Pacific Coast", "Salt air. Open horizons.", "PACIFIC COAST"],
  desert: ["The Painted Desert", "Warm earth. Wide open skies.", "PAINTED DESERT"],
};
const moods = {
  golden: ["Golden hour", "◒"],
  day: ["Clear daylight", "☼"],
  rain: ["Passing rain", "☂"],
  night: ["Blue hour", "☾"],
};
const paused = () => !!$("dialog[open]") || photo || document.hidden;
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2800);
}
function syncUI() {
  const n = names[preferences.biome];
  $("#destination-name").textContent = n[0];
  $("#destination-description").textContent = n[1];
  $(".destination-number").textContent =
    `0${["alpine", "coast", "desert"].indexOf(preferences.biome) + 1} / 03`;
  $$("[data-biome]").forEach((b) => {
    b.classList.toggle("active", b.dataset.biome === preferences.biome);
    b.setAttribute("aria-pressed", String(b.dataset.biome === preferences.biome));
  });
  $("#mood-label").textContent = moods[preferences.weather][0];
  $("#mood-icon").textContent = moods[preferences.weather][1];
  $("#route-label").textContent = `${n[2]} / ${moods[preferences.weather][0].toUpperCase()}`;
  $("#landscape").value = preferences.biome;
  $("#weather").value = preferences.weather;
  $("#quality").value = preferences.quality;
  $("#volume").value = preferences.volume;
  $("#seed-label").textContent = `ROAD ${String(preferences.seed).padStart(4, "0")}`;
  $$("[data-color]").forEach((b) =>
    b.classList.toggle("selected", b.dataset.color === preferences.color),
  );
}
function changeRoad(biome = preferences.biome, newSeed = false) {
  preferences.biome = biome;
  if (newSeed) preferences.seed = Math.floor(Math.random() * 99999);
  road = makeRoad(preferences.seed, biome);
  vehicle.road = road;
  vehicle.reset(0);
  world.setRoad(road);
  keys.clear();
  touch.clear();
  syncUI();
  save();
}
function setWeather(w) {
  preferences.weather = w;
  world.setWeather(w);
  syncUI();
  save();
}
function toggleAuto() {
  auto = !auto;
  $("#autodrive").setAttribute("aria-pressed", String(auto));
  toast(auto ? "Autodrive on. Take in the view." : "You’re in the driver’s seat.");
}
function resetCar() {
  vehicle.reset(Math.max(0, -vehicle.z));
  toast("Back on the road.");
}
function camera() {
  const modes = ["chase", "hood", "wide"];
  world.mode = modes[(modes.indexOf(world.mode) + 1) % modes.length];
  $("#camera").innerHTML =
    `<span>▣</span> ${world.mode[0].toUpperCase() + world.mode.slice(1)} <kbd>C</kbd>`;
}
function start() {
  started = true;
  world.home = false;
  tripStart = vehicle.distance;
  vehicle.u = Math.min(vehicle.u, 8);
  document.body.classList.add("driving");
  $("#welcome").inert = true;
  $("#welcome-footer").inert = true;
  $("#destination").inert = true;
  $("#drive-ui").hidden = false;
  $("#start").blur();
  keys.clear();
  toast("Hold W or ↑ to accelerate. The road is yours.");
  if (soundOn) enableAudio();
}
function goHome() {
  started = false;
  auto = false;
  $("#autodrive").setAttribute("aria-pressed", "false");
  world.home = true;
  document.body.classList.remove("driving");
  $("#welcome").inert = false;
  $("#welcome-footer").inert = false;
  $("#destination").inert = false;
  $("#drive-ui").hidden = true;
  $("#pause-dialog").close();
  keys.clear();
}
function openDialog(id) {
  keys.clear();
  touch.clear();
  $(id).showModal();
}
function setPhoto(on) {
  photo = on;
  world.photo = on;
  document.body.classList.toggle("photo", on);
  $(".topbar").inert = on;
  $("#drive-ui").inert = on;
  $("#photo-ui").hidden = !on;
  keys.clear();
  touch.clear();
  if (on) {
    world.orbit = vehicle.heading + 0.55;
    world.orbitDistance = 9;
  } else $("#scene").style.cursor = "default";
}
$("#start").addEventListener("click", start);
$(".brand").addEventListener("click", (e) => {
  e.preventDefault();
  if (started) openDialog("#pause-dialog");
});
$$("[data-biome]").forEach((b) => b.addEventListener("click", () => changeRoad(b.dataset.biome)));
$("#mood").addEventListener("click", () => {
  const states = Object.keys(moods);
  setWeather(states[(states.indexOf(preferences.weather) + 1) % states.length]);
});
$("#settings").addEventListener("click", () => openDialog("#settings-dialog"));
$("#help").addEventListener("click", () => openDialog("#help-dialog"));
$$("dialog .close").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
$$("dialog").forEach((d) => {
  d.addEventListener("close", () => {
    keys.clear();
    touch.clear();
  });
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        d.close();
    }
  });
});
$("#landscape").addEventListener("change", (e) => changeRoad(e.target.value));
$("#weather").addEventListener("change", (e) => setWeather(e.target.value));
$("#quality").addEventListener("change", (e) => {
  preferences.quality = e.target.value;
  world.setQuality(e.target.value);
  save();
});
$$("[data-color]").forEach((b) =>
  b.addEventListener("click", () => {
    preferences.color = b.dataset.color;
    world.paint.color.set(preferences.color);
    syncUI();
    save();
  }),
);
$("#new-road").addEventListener("click", () => {
  changeRoad(preferences.biome, true);
  toast("A new horizon is waiting.");
});
$("#volume").addEventListener("input", (e) => {
  preferences.volume = Number(e.target.value);
  save();
});
$("#autodrive").addEventListener("click", toggleAuto);
$("#camera").addEventListener("click", camera);
$("#photo").addEventListener("click", () => setPhoto(true));
$("#exit-photo").addEventListener("click", () => setPhoto(false));
$("#pause").addEventListener("click", () => openDialog("#pause-dialog"));
$("#resume").addEventListener("click", () => $("#pause-dialog").close());
$("#home").addEventListener("click", goHome);
$("#capture").addEventListener("click", () => {
  try {
    const image = world.photograph();
    $("#photo-preview").src = image;
    $("#photo-download").href = image;
    $("#photo-download").download = `wayfarer-${preferences.biome}-${Date.now()}.png`;
    $("#capture-dialog").showModal();
  } catch {
    toast("Could not capture this photograph. Try your browser’s screenshot control.");
  }
});
window.addEventListener("keydown", (e) => {
  if (e.target.matches("input,select,textarea")) return;
  if ($("dialog[open]")) return;
  const key = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();
  if (!e.repeat) {
    if (photo) {
      if (key === "escape" || key === "p") setPhoto(false);
      return;
    }
    if (started) {
      if (key === "f") toggleAuto();
      if (key === "c") camera();
      if (key === "p") setPhoto(true);
      if (key === "r") resetCar();
      if (key === "escape") openDialog("#pause-dialog");
    } else if (key === "enter" && e.target === document.body) start();
  }
  keys.add(key);
  if (
    started &&
    auto &&
    ["a", "d", "arrowleft", "arrowright", "s", "arrowdown", " "].includes(key)
  ) {
    auto = false;
    $("#autodrive").setAttribute("aria-pressed", "false");
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  touch.clear();
  if (started && !photo && !$("dialog[open]")) openDialog("#pause-dialog");
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  touch.clear();
  accumulator = 0;
  lastTime = performance.now();
});
$$("[data-input]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    touch.add(b.dataset.input);
    if (auto) {
      auto = false;
      $("#autodrive").setAttribute("aria-pressed", "false");
    }
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(name, () => touch.delete(b.dataset.input));
});
let pointer = null;
$("#scene").addEventListener("pointerdown", (e) => {
  if (!photo) return;
  pointer = { x: e.clientX, y: e.clientY };
  $("#scene").setPointerCapture(e.pointerId);
});
$("#scene").addEventListener("pointermove", (e) => {
  if (!photo || !pointer) return;
  world.orbit -= (e.clientX - pointer.x) * 0.007;
  world.orbitHeight = clamp(world.orbitHeight + (e.clientY - pointer.y) * 0.004, 0.12, 1.4);
  pointer = { x: e.clientX, y: e.clientY };
});
$("#scene").addEventListener("pointerup", () => (pointer = null));
$("#scene").addEventListener(
  "wheel",
  (e) => {
    if (!photo) return;
    e.preventDefault();
    world.orbitDistance = clamp(world.orbitDistance + e.deltaY * 0.015, 4, 30);
  },
  { passive: false },
);
function manualInput() {
  let steer =
      (keys.has("d") || keys.has("arrowright") || touch.has("right") ? 1 : 0) -
      (keys.has("a") || keys.has("arrowleft") || touch.has("left") ? 1 : 0),
    throttle = keys.has("w") || keys.has("arrowup") || touch.has("throttle") ? 1 : 0,
    brake = keys.has("s") || keys.has("arrowdown") || touch.has("brake") ? 1 : 0,
    handbrake = keys.has(" ");
  const pad = navigator.getGamepads?.()?.find((p) => p && p.mapping === "standard");
  if (pad) {
    if (Math.abs(pad.axes[0]) > 0.12) steer = pad.axes[0];
    throttle = Math.max(throttle, pad.buttons[7]?.value || 0);
    brake = Math.max(brake, pad.buttons[6]?.value || 0);
    handbrake = handbrake || pad.buttons[0]?.pressed;
  }
  return { steer, throttle, brake, handbrake };
}
function enableAudio() {
  if (!audio) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const motor = ctx.createOscillator(),
      harmonic = ctx.createOscillator(),
      motorGain = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    motor.type = "triangle";
    harmonic.type = "sine";
    motor.frequency.value = 40;
    harmonic.frequency.value = 80;
    filter.type = "lowpass";
    filter.frequency.value = 260;
    motorGain.gain.value = 0.25;
    motor.connect(filter);
    harmonic.connect(filter);
    filter.connect(motorGain);
    motorGain.connect(master);
    motor.start();
    harmonic.start();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 450;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.03;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    wind.start();
    audio = { ctx, master, motor, harmonic, motorGain, windGain, filter };
  }
  audio.ctx.resume();
}
$("#sound").addEventListener("click", () => {
  soundOn = !soundOn;
  if (soundOn)
    try {
      enableAudio();
    } catch {
      soundOn = false;
      toast("Audio is unavailable in this browser.");
    }
  $("#sound").setAttribute("aria-label", soundOn ? "Mute sound" : "Enable sound");
  $("#sound").innerHTML = soundOn
    ? '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/></svg>';
});
let lastInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.06);
  lastTime = now;
  if (document.hidden) return;
  const stopped = paused();
  if (!stopped) {
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      lastInput = !started || auto ? vehicle.autopilot() : manualInput();
      vehicle.step(1 / 120, lastInput, preferences.weather === "rain");
      world.resolveCollisions(vehicle);
      accumulator -= 1 / 120;
    }
    if (Math.abs(vehicle.x - road.center(-vehicle.z)) > 240 || -vehicle.z < -200) {
      vehicle.reset(Math.max(0, -vehicle.z));
      if (started) toast("A fresh start on the open road.");
    }
  } else {
    accumulator = 0;
    lastInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  }
  world.update(vehicle, dt, lastInput);
  if (audio) {
    const at = audio.ctx.currentTime;
    audio.master.gain.setTargetAtTime(
      soundOn && !stopped ? (preferences.volume / 100) * 0.28 : 0,
      at,
      0.15,
    );
    audio.motor.frequency.setTargetAtTime(33 + vehicle.u * 2.2 + lastInput.throttle * 13, at, 0.1);
    audio.harmonic.frequency.setTargetAtTime(66 + vehicle.u * 4.4, at, 0.1);
    audio.motorGain.gain.setTargetAtTime(0.13 + lastInput.throttle * 0.16, at, 0.1);
    audio.windGain.gain.setTargetAtTime(
      0.01 +
        vehicle.u * 0.002 +
        (preferences.weather === "rain" ? 0.1 : 0) +
        (vehicle.offroad ? 0.06 : 0),
      at,
      0.2,
    );
  }
  hudTime += dt;
  frames++;
  frameTime += dt;
  if (frameTime > 1) {
    fps = Math.round(frames / frameTime);
    frames = 0;
    frameTime = 0;
  }
  if (hudTime > 0.1) {
    hudTime = 0;
    $("#speed").textContent = Math.round(vehicle.u * 3.6);
    $("#trip").innerHTML =
      `${(Math.max(0, vehicle.distance - tripStart) / 1000).toFixed(2)} <small>km</small>`;
    $("#gear").textContent =
      vehicle.u < 0.2 ? "N" : `D${Math.min(6, 1 + Math.floor(vehicle.u / 8))}`;
    $("#gauge-fill").style.strokeDashoffset = String(300 - clamp(vehicle.u / 57, 0, 1) * 300);
    const status = vehicle.offroad
      ? "LOOSE SURFACE · REDUCED GRIP"
      : lastInput.handbrake
        ? "HANDBRAKE"
        : auto
          ? "AUTODRIVE · ENJOY THE VIEW"
          : "";
    $("#road-status").textContent = status;
    $("#road-status").classList.toggle("show", !!status);
    document.body.dataset.speed = vehicle.u.toFixed(3);
    document.body.dataset.distance = vehicle.distance.toFixed(2);
    document.body.dataset.offset = (vehicle.x - road.center(-vehicle.z)).toFixed(2);
    document.body.dataset.fps = String(fps);
    document.body.dataset.mode = photo
      ? "photo"
      : stopped
        ? "paused"
        : started
          ? auto
            ? "autodrive"
            : "manual"
          : "welcome";
  }
}
syncUI();
vehicle.u = 12;
requestAnimationFrame(frame);
setTimeout(() => {
  $("#loading").classList.add("done");
  $("#loading").setAttribute("aria-hidden", "true");
}, 450);
$("#scene").addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  openDialog("#pause-dialog");
  toast("The graphics connection was interrupted. Reload to continue.");
});
