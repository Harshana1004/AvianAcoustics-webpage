// AvianAcoustics product page: small interactions plus an in-browser
// copy of the firmware's region-of-interest detector
// (firmware/birdcall_device/src/dsp, include/config.h).

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ============================================================
  // Navigation
  // ============================================================

  const toggle = document.querySelector(".menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  toggle.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  mobileNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      mobileNav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  const navLinks = [...document.querySelectorAll(".nav-links .nav-link")];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) =>
        link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section.block").forEach((s) => sectionObserver.observe(s));

  // ============================================================
  // Reveal on scroll
  // ============================================================

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      revealObserver.unobserve(entry.target);
      entry.target.dispatchEvent(new CustomEvent("revealed"));
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  // ============================================================
  // Hero waveform
  // ============================================================

  const wave = document.getElementById("hero-wave");
  for (let i = 0; i < 64; i++) {
    const bar = document.createElement("span");
    const centre = 1 - Math.abs(i - 32) / 32;
    bar.style.height = Math.round(8 + 28 * (0.35 + 0.65 * centre) * (0.5 + Math.random() * 0.5)) + "px";
    bar.style.animationDelay = (-Math.random() * 1.6).toFixed(2) + "s";
    bar.style.animationDuration = (1.1 + Math.random() * 0.9).toFixed(2) + "s";
    wave.appendChild(bar);
  }

  // ============================================================
  // 01 -- 720 hours, only the calls kept
  // ============================================================

  const tileGrid = document.getElementById("tile-grid");
  const tiles = [];
  for (let i = 0; i < 72; i++) {
    const t = document.createElement("span");
    tileGrid.appendChild(t);
    tiles.push(t);
  }

  const bigNumber = document.querySelector(".big-number");
  bigNumber.addEventListener("revealed", () => {
    // 25 % kept, as in the 3 min 21 s demo recording: 18 of 72 tiles.
    const kept = tiles.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 18);
    const counter = document.getElementById("pct-counter");
    tileGrid.classList.add("filtered");

    if (reduceMotion) {
      kept.forEach((i) => tiles[i].classList.add("kept"));
      return;
    }

    // A timer, not requestAnimationFrame, so it also finishes in a
    // tab that is not being painted.
    let shown = 0;
    counter.textContent = "0";
    const timer = setInterval(() => {
      tiles[kept[shown++]].classList.add("kept");
      counter.textContent = Math.round((shown / tiles.length) * 100);
      if (shown >= kept.length) clearInterval(timer);
    }, 75);
  });

  // ============================================================
  // 02 -- pipeline stages light up with the travelling pulse
  // ============================================================

  const stages = [...document.querySelectorAll("#pipeline .stage")];
  if (!reduceMotion) {
    const t0 = performance.now();
    setInterval(() => {
      const phase = ((performance.now() - t0) % 6000) / 6000;
      const index = Math.min(stages.length - 1, Math.floor(phase * stages.length));
      stages.forEach((s, i) => s.classList.toggle("lit", i === index));
    }, 120);
  }

  // ============================================================
  // Videos: play only while visible
  // ============================================================

  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target;
      if (entry.isIntersecting) {
        if (v.dataset.userPaused !== "1" && !reduceMotion) v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.35 });

  document.querySelectorAll("video[autoplay], video[data-autoplay], #player").forEach((v) => {
    if (reduceMotion) v.removeAttribute("autoplay");
    videoObserver.observe(v);
  });

  // ============================================================
  // 04 -- clip player
  // ============================================================

  const player = document.getElementById("player");
  const caption = document.getElementById("player-caption");
  const tabs = [...document.querySelectorAll(".tab")];

  player.addEventListener("pause", () => {
    if (document.visibilityState === "visible" && player.matches(":hover, :focus-within")) {
      player.dataset.userPaused = "1";
    }
  });
  player.addEventListener("play", () => { player.dataset.userPaused = "0"; });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      const name = tab.dataset.src;
      player.poster = "assets/video/" + name + ".jpg";
      player.src = "assets/video/" + name + ".mp4";
      player.dataset.userPaused = "0";
      caption.textContent = tab.dataset.caption;
      player.play().catch(() => {});
    });
  });

  // ============================================================
  // 05 -- illustrative detection feed
  // ============================================================

  const SPECIES = [
    ["Common Myna", "Acridotheres tristis"],
    ["Sri Lanka Blue-Magpie", "Urocissa ornata"],
    ["Red-vented Bulbul", "Pycnonotus cafer"],
    ["Asian Koel", "Eudynamys scolopaceus"],
    ["White-throated Kingfisher", "Halcyon smyrnensis"],
    ["Oriental Magpie-Robin", "Copsychus saularis"],
    ["Brown-headed Barbet", "Psilopogon zeylanicus"],
    ["Purple-rumped Sunbird", "Leptocoma zeylonica"],
    ["Yellow-billed Babbler", "Argya affinis"],
    ["Greater Coucal", "Centropus sinensis"],
    ["Spotted Dove", "Spilopelia chinensis"],
    ["Sri Lanka Junglefowl", "Gallus lafayettii"],
  ];

  const feed = document.getElementById("det-feed");
  let feedIndex = 0;
  let feedVisible = false;

  function addDetection(animate) {
    const [common, sci] = SPECIES[feedIndex++ % SPECIES.length];
    const conf = 0.42 + Math.random() * 0.55;
    const snippet = (0.8 + Math.random() * 2.6).toFixed(1);
    const row = document.createElement("div");
    row.className = "det-row" + (animate ? " new" : "");
    row.innerHTML =
      '<div><div class="species-name"></div><div class="species-sci"></div>' +
      '<div class="meta"></div></div><span class="conf"></span>';
    row.querySelector(".species-name").textContent = common;
    row.querySelector(".species-sci").textContent = sci;
    row.querySelector(".meta").textContent = "ESP32-DEV-01 · " + snippet + " s snippet";
    const badge = row.querySelector(".conf");
    badge.textContent = Math.round(conf * 100) + "%";
    if (conf < 0.7) badge.classList.add("mid");
    feed.prepend(row);
    feed.querySelectorAll(".det-row.new").forEach((r) => { if (r !== row) r.classList.remove("new"); });
    while (feed.children.length > 5) feed.lastChild.remove();
  }

  for (let i = 0; i < 4; i++) addDetection(false);
  new IntersectionObserver((e) => { feedVisible = e[0].isIntersecting; }).observe(feed);
  if (!reduceMotion) setInterval(() => { if (feedVisible) addDetection(true); }, 3600);

  // ============================================================
  // 06 -- board power toggle
  // ============================================================

  const board = document.getElementById("board");
  const boardHint = document.getElementById("board-hint");
  function toggleBoard() {
    const on = board.classList.toggle("powered");
    board.setAttribute("aria-pressed", String(on));
    boardHint.textContent = on ? "Status lights on · tap to switch off" : "⏻ Tap to power on";
  }
  board.addEventListener("click", toggleBoard);
  board.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleBoard(); }
  });

  // ============================================================
  // 03 -- ROI detector demo
  // ============================================================

  // Same constants as include/config.h.
  const SR = 16000;
  const DURATION = 10;                       // CAPTURE_WINDOW_SECONDS
  const N = SR * DURATION;
  const FRAME = 400;                         // 25 ms
  const HOP = 160;                           // 10 ms
  const SMOOTH = 15;                         // ENERGY_SMOOTHING_WINDOW
  const THRESHOLD_FACTOR = 2;                // ROI_THRESHOLD_FACTOR
  const MIN_DURATION = 0.5;                  // ROI_MIN_DURATION_SECONDS
  const MERGE_GAP = 0.5;                     // ROI_MERGE_GAP_SECONDS
  const PADDING = 0.25;                      // ROI_PADDING_SECONDS
  const HPF_HZ = 1000;                       // 4th-order Butterworth

  const state = { seed: 7, gate: 4, hpf: true, wind: 45, raw: null, birds: [], result: null };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Soundscape ----------

  function synthesize(seed, windLevel) {
    const rand = mulberry32(seed);
    const gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = rand();
      while (v === 0) v = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    const x = new Float32Array(N);

    // Forest hiss: gently high-passed white noise.
    let prev = 0;
    for (let i = 0; i < N; i++) {
      const w = gauss();
      x[i] = 0.010 * (w - 0.6 * prev);
      prev = w;
    }

    // Wind: low-passed noise under a slow, gusting envelope.
    if (windLevel > 0) {
      const wind = new Float32Array(N);
      let y1 = 0, y2 = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 90 / SR);
      let sumSq = 0;
      for (let i = 0; i < N; i++) {
        y1 += a * (gauss() - y1);
        y2 += a * (y1 - y2);
        wind[i] = y2;
        sumSq += y2 * y2;
      }
      const rms = Math.sqrt(sumSq / N) || 1;
      const p1 = rand() * 6.28, p2 = rand() * 6.28, p3 = rand() * 6.28;
      const amp = (windLevel / 100) * 0.35 / rms;
      for (let i = 0; i < N; i++) {
        const t = i / SR;
        const g = 0.15 + 0.55 * Math.sin(0.55 * t + p1) + 0.35 * Math.sin(1.7 * t + p2) + 0.2 * Math.sin(3.1 * t + p3);
        const env = Math.max(0, g);
        x[i] += amp * env * env * wind[i];
      }
    }

    // Birds.
    const birds = [];
    const count = 6 + Math.floor(rand() * 3);
    const slots = [];
    for (let k = 0; k < count; k++) slots.push(0.3 + (k + 0.15 + rand() * 0.6) * (9.0 / count));

    slots.forEach((t0, k) => {
      const kinds = ["sweep", "trill", "whistle", "chips"];
      const kind = kinds[Math.floor(rand() * kinds.length)];
      // Mostly clear calls, a couple faint and distant.
      const amp = k === 1 || rand() < 0.22 ? 0.012 + rand() * 0.02 : 0.08 + rand() * 0.35;
      const notes = [];
      if (kind === "sweep") {
        const reps = 1 + Math.floor(rand() * 3);
        const f0 = 2500 + rand() * 2500, f1 = f0 + (rand() < 0.5 ? -1 : 1) * (800 + rand() * 1500);
        let t = t0;
        for (let r = 0; r < reps; r++) {
          const d = 0.14 + rand() * 0.22;
          notes.push({ t, d, f0, f1, vib: 0 });
          t += d + 0.07 + rand() * 0.1;
        }
      } else if (kind === "trill") {
        const n = 7 + Math.floor(rand() * 9);
        const f = 3200 + rand() * 2200;
        let t = t0;
        for (let r = 0; r < n; r++) {
          const d = 0.03 + rand() * 0.02;
          notes.push({ t, d, f0: f + 300, f1: f - 300, vib: 0 });
          t += d + 0.022;
        }
      } else if (kind === "whistle") {
        const f = 2100 + rand() * 1400;
        notes.push({ t: t0, d: 0.45 + rand() * 0.4, f0: f, f1: f * (0.9 + rand() * 0.25), vib: 120 });
      } else {
        const n = 2 + Math.floor(rand() * 3);
        let t = t0;
        for (let r = 0; r < n; r++) {
          notes.push({ t, d: 0.05 + rand() * 0.03, f0: 5200 + rand() * 1500, f1: 3800 + rand() * 800, vib: 0 });
          t += 0.16 + rand() * 0.12;
        }
      }

      let end = t0;
      notes.forEach((note) => {
        let phase = 0;
        const start = Math.floor(note.t * SR);
        const len = Math.floor(note.d * SR);
        for (let j = 0; j < len && start + j < N; j++) {
          const u = j / len;
          const f = note.f0 + (note.f1 - note.f0) * u + note.vib * Math.sin(2 * Math.PI * 7 * j / SR);
          phase += 2 * Math.PI * f / SR;
          const env = Math.pow(Math.sin(Math.PI * u), 1.5);
          x[start + j] += amp * env * (Math.sin(phase) + 0.22 * Math.sin(2 * phase));
        }
        end = Math.max(end, note.t + note.d);
      });
      birds.push({ start: t0, end, amp, faint: amp < 0.05 });
    });

    return { x, birds };
  }

  // ---------- DSP (dsp_pipeline.cpp) ----------

  function biquadHighpass(x, f0, q) {
    const w0 = 2 * Math.PI * f0 / SR;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw = Math.cos(w0);
    const a0 = 1 + alpha;
    const b0 = (1 + cosw) / 2 / a0, b1 = -(1 + cosw) / a0, b2 = (1 + cosw) / 2 / a0;
    const a1 = -2 * cosw / a0, a2 = (1 - alpha) / a0;
    let z1 = 0, z2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = x[i];
      const y = b0 * v + z1;
      z1 = b1 * v - a1 * y + z2;
      z2 = b2 * v - a2 * y;
      x[i] = y;
    }
  }

  function normalize(x) {
    let peak = 0;
    for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
    if (peak > 0) for (let i = 0; i < x.length; i++) x[i] /= peak;
    return peak;
  }

  function median(values) {
    const s = Float32Array.from(values).sort();
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function detect(raw, useHighpass, gate) {
    const det = Float32Array.from(raw);
    if (useHighpass) {
      biquadHighpass(det, HPF_HZ, 0.5411961);
      biquadHighpass(det, HPF_HZ, 1.3065630);
    }
    normalize(det);

    const frames = Math.floor((N - FRAME) / HOP) + 1;
    const energy = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      let sum = 0;
      const o = f * HOP;
      for (let j = 0; j < FRAME; j++) sum += det[o + j] * det[o + j];
      energy[f] = sum / FRAME;
    }

    const smoothed = new Float32Array(frames);
    const half = (SMOOTH - 1) >> 1;
    for (let f = 0; f < frames; f++) {
      let sum = 0, n = 0;
      for (let k = f - half; k <= f + half; k++) {
        if (k >= 0 && k < frames) { sum += energy[k]; n++; }
      }
      smoothed[f] = sum / n;
    }

    const med = median(smoothed);
    const threshold = THRESHOLD_FACTOR * med;
    const peakThreshold = Math.max(threshold, gate * med);

    // build_raw_regions
    let regions = [];
    let f = 0;
    while (f < frames) {
      if (smoothed[f] > threshold) {
        const s = f;
        while (f + 1 < frames && smoothed[f + 1] > threshold) f++;
        regions.push({ sf: s, ef: f, start: s * HOP / SR, end: (f * HOP + FRAME) / SR });
      }
      f++;
    }

    // merge_regions
    const merged = [];
    regions.forEach((r) => {
      const last = merged[merged.length - 1];
      if (last && r.start - last.end <= MERGE_GAP) {
        last.end = Math.max(last.end, r.end);
        last.ef = r.ef;
      } else {
        merged.push({ ...r });
      }
    });

    // gate_regions_by_peak
    const kept = [], gated = [];
    merged.forEach((r) => {
      let peak = 0;
      for (let k = r.sf; k <= r.ef; k++) peak = Math.max(peak, smoothed[k]);
      r.peak = peak;
      (peak >= peakThreshold ? kept : gated).push(r);
    });

    // filter_and_pad_regions
    const rois = [];
    let tooShort = 0;
    kept.forEach((r) => {
      if (r.end - r.start < MIN_DURATION) { tooShort++; return; }
      rois.push({ ...r, start: Math.max(0, r.start - PADDING), end: Math.min(DURATION, r.end + PADDING) });
    });

    return { smoothed, med, threshold, peakThreshold, rois, gated, tooShort };
  }

  // ---------- Rendering ----------

  const canvas = document.getElementById("demo-canvas");
  const ctx = canvas.getContext("2d");
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d");
  const CSS_H = 320;
  const WAVE = { top: 10, height: 178 };
  const ENERGY = { top: 214, height: 82 };
  const AXIS_Y = 312;
  let playhead = null;   // seconds, or null

  function inRegion(t, list) {
    for (const r of list) if (t >= r.start && t <= r.end) return true;
    return false;
  }

  function renderBase() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    if (!w) return;  // hidden; the ResizeObserver renders once laid out
    canvas.width = base.width = Math.round(w * dpr);
    canvas.height = base.height = Math.round(CSS_H * dpr);
    canvas.style.height = CSS_H + "px";
    const c = bctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, CSS_H);

    const { raw } = state;
    const res = state.result;
    const xOf = (t) => (t / DURATION) * w;

    // Region shading.
    res.gated.forEach((r) => {
      c.fillStyle = "rgba(227,180,91,0.07)";
      c.fillRect(xOf(r.start), WAVE.top, xOf(r.end) - xOf(r.start), ENERGY.top + ENERGY.height - WAVE.top);
    });
    res.rois.forEach((r) => {
      c.fillStyle = "rgba(79,208,139,0.12)";
      c.fillRect(xOf(r.start), WAVE.top, xOf(r.end) - xOf(r.start), ENERGY.top + ENERGY.height - WAVE.top);
      c.fillStyle = "#4fd08b";
      c.fillRect(xOf(r.start), WAVE.top, xOf(r.end) - xOf(r.start), 3);
    });

    // Waveform (min/max per column).
    const mid = WAVE.top + WAVE.height / 2;
    const cols = Math.max(1, Math.floor(w));
    const per = N / cols;
    for (let col = 0; col < cols; col++) {
      let lo = 1, hi = -1;
      const s = Math.floor(col * per), e = Math.min(N, Math.floor((col + 1) * per));
      for (let i = s; i < e; i++) { const v = raw[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const t = (col + 0.5) * per / SR;
      c.fillStyle = inRegion(t, res.rois) ? "#4fd08b" : "#3a5a4d";
      const y1 = mid - hi * (WAVE.height / 2 - 4), y2 = mid - lo * (WAVE.height / 2 - 4);
      c.fillRect(col, y1, 1, Math.max(1, y2 - y1));
    }

    // Energy, in dB.
    const sm = res.smoothed;
    const db = (v) => 10 * Math.log10(v + 1e-12);
    let maxDb = -Infinity;
    for (let i = 0; i < sm.length; i++) maxDb = Math.max(maxDb, db(sm[i]));
    const minDb = db(res.med) - 8;
    maxDb = Math.max(maxDb + 2, db(res.peakThreshold) + 4);
    const yOf = (v) => ENERGY.top + ENERGY.height * (1 - (Math.min(maxDb, Math.max(minDb, db(v))) - minDb) / (maxDb - minDb));

    c.fillStyle = "#0c1511";
    c.fillRect(0, ENERGY.top, w, ENERGY.height);
    c.beginPath();
    for (let i = 0; i < sm.length; i++) {
      const x = ((i * HOP + FRAME / 2) / N) * w;
      if (i === 0) c.moveTo(x, yOf(sm[i])); else c.lineTo(x, yOf(sm[i]));
    }
    c.strokeStyle = "#7fe0ab";
    c.lineWidth = 1.4;
    c.stroke();

    c.setLineDash([]);
    c.strokeStyle = "#b5e655";
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, yOf(res.threshold)); c.lineTo(w, yOf(res.threshold)); c.stroke();
    if (res.peakThreshold > res.threshold) {
      c.setLineDash([5, 4]);
      c.strokeStyle = "#e3b45b";
      c.beginPath(); c.moveTo(0, yOf(res.peakThreshold)); c.lineTo(w, yOf(res.peakThreshold)); c.stroke();
      c.setLineDash([]);
    }

    // Time axis.
    c.fillStyle = "#6c8379";
    c.font = "11px Inter, system-ui, sans-serif";
    c.textBaseline = "middle";
    for (let s = 0; s <= DURATION; s += 1) {
      const x = xOf(s);
      c.textAlign = s === 0 ? "left" : s === DURATION ? "right" : "center";
      if (w > 480 || s % 2 === 0) c.fillText(s + "s", x, AXIS_Y);
    }

    drawOverlay();
  }

  function drawOverlay() {
    const dpr = base.width / canvas.clientWidth;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    if (playhead !== null) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const x = (playhead / DURATION) * canvas.clientWidth;
      ctx.fillStyle = "#e4eee8";
      ctx.fillRect(x - 0.75, WAVE.top, 1.5, ENERGY.top + ENERGY.height - WAVE.top);
    }
  }

  // ---------- Stats + narrative ----------

  function overlaps(a, b) { return a.start < b.end && b.start < a.end; }

  function updateStats() {
    const res = state.result;
    const sent = res.rois.reduce((s, r) => s + (r.end - r.start), 0);
    document.getElementById("s-rois").textContent = res.rois.length;
    document.getElementById("s-sent").textContent = sent.toFixed(1) + " s";
    document.getElementById("s-sent-l").textContent = "sent over 4G · " + Math.round((sent / DURATION) * 100) + " % of the audio";
    document.getElementById("s-rej").textContent = res.gated.length + res.tooShort;

    const caught = state.birds.filter((b) => res.rois.some((r) => overlaps(b, r)));
    const missedFaint = state.birds.filter((b) => b.faint && !caught.includes(b)).length;
    const windOnly = res.rois.filter((r) => !state.birds.some((b) => overlaps(b, r))).length;

    let note = `${caught.length} of ${state.birds.length} birds in this soundscape are inside a region that gets sent.`;
    if (windOnly > 0) {
      note += ` ${windOnly} region${windOnly > 1 ? "s" : ""} contain${windOnly > 1 ? "" : "s"} only wind${state.hpf ? "" : ": the high-pass is off, so gusts look like calls"}.`;
    } else if (!state.hpf && state.wind > 20) {
      note += " The high-pass is off: wind now raises the noise floor, so quieter calls no longer stand out.";
    }
    if (missedFaint > 0) {
      note += ` ${missedFaint} faint, distant call${missedFaint > 1 ? "s" : ""} stayed below the ×${state.gate} gate.`;
    }
    if (res.tooShort > 0) {
      note += ` ${res.tooShort} region${res.tooShort > 1 ? "s" : ""} shorter than 0.5 s ${res.tooShort > 1 ? "were" : "was"} dropped.`;
    }
    if (state.gate === 2) note += " ×2 means no gate beyond the threshold: more audio, more noise.";
    if (state.gate === 8) note += " ×8 was too strict in busy soundscapes: it sends little and misses a lot.";
    document.getElementById("demo-note").textContent = note;
  }

  function recompute(resynth) {
    if (resynth) {
      const s = synthesize(state.seed, state.wind);
      normalize(s.x);
      state.raw = s.x;
      state.birds = s.birds;
    }
    state.result = detect(state.raw, state.hpf, state.gate);
    renderBase();
    updateStats();
  }

  // ---------- Audio ----------

  let audioCtx = null;
  let source = null;
  let rafId = 0;
  let activeButton = null;

  const playAll = document.getElementById("play-all");
  const playSent = document.getElementById("play-sent");
  const labels = new Map([[playAll, playAll.textContent], [playSent, playSent.textContent]]);

  function stopAudio() {
    if (source) { source.onended = null; try { source.stop(); } catch (e) { /* already stopped */ } source = null; }
    cancelAnimationFrame(rafId);
    playhead = null;
    drawOverlay();
    labels.forEach((text, btn) => { btn.textContent = text; });
    activeButton = null;
  }

  function play(button, sentOnly) {
    if (activeButton === button) { stopAudio(); return; }
    stopAudio();
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();

    // Map buffer time -> soundscape time for the playhead.
    const segments = [];
    let length;
    const gap = Math.floor(0.25 * SR);
    if (sentOnly) {
      if (!state.result.rois.length) { document.getElementById("demo-note").textContent = "Nothing is sent with these settings: the node stays quiet."; return; }
      length = 0;
      state.result.rois.forEach((r) => {
        const n = Math.floor((r.end - r.start) * SR);
        segments.push({ at: length, n, from: Math.floor(r.start * SR) });
        length += n + gap;
      });
    } else {
      length = N;
      segments.push({ at: 0, n: N, from: 0 });
    }

    const buffer = audioCtx.createBuffer(1, length, SR);
    const data = buffer.getChannelData(0);
    segments.forEach((s) => {
      for (let i = 0; i < s.n; i++) data[s.at + i] = state.raw[s.from + i] * 0.7;
    });

    source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    const startedAt = audioCtx.currentTime;
    source.onended = stopAudio;
    source.start();
    activeButton = button;
    button.textContent = "■ Stop";

    const tick = () => {
      const pos = (audioCtx.currentTime - startedAt) * SR;
      const seg = segments.find((s) => pos >= s.at && pos < s.at + s.n);
      playhead = seg ? (seg.from + pos - seg.at) / SR : null;
      drawOverlay();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  playAll.addEventListener("click", () => play(playAll, false));
  playSent.addEventListener("click", () => play(playSent, true));

  // ---------- Controls ----------

  document.querySelectorAll("#gate button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#gate button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      state.gate = Number(btn.dataset.v);
      stopAudio();
      recompute(false);
    });
  });

  document.getElementById("hpf").addEventListener("change", (e) => {
    state.hpf = e.target.checked;
    stopAudio();
    recompute(false);
  });

  let windTimer = 0;
  document.getElementById("wind").addEventListener("input", (e) => {
    state.wind = Number(e.target.value);
    clearTimeout(windTimer);
    windTimer = setTimeout(() => { stopAudio(); recompute(true); }, 120);
  });

  document.getElementById("regen").addEventListener("click", () => {
    state.seed = Math.floor(Math.random() * 1e9);
    stopAudio();
    recompute(true);
  });

  let lastWidth = 0;
  new ResizeObserver(() => {
    if (canvas.clientWidth !== lastWidth && state.result) {
      lastWidth = canvas.clientWidth;
      renderBase();
    }
  }).observe(canvas);

  recompute(true);
})();
