/* Public Blender illustration. The capture images stay fixed throughout the sweep.
   Works offline and over file:// URLs (never calls getImageData on <img>). */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const figure = byId('cottage-demo');
  if (!figure) return;
  const band = byId('cottage-band');
  const play = byId('cottage-play');
  const quality = byId('cottage-quality');
  const freqEl = byId('cottage-freq');
  const output = byId('cottage-output');
  const pixels = byId('cottage-pixels');
  const wave = byId('cottage-wave');
  const cloud = byId('cottage-cloud');
  const ripple = byId('cottage-ripple');
  const stops = [...figure.querySelectorAll('[data-band]')];
  const media = 'media/cottage/';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const defaultYaw = 0.47;
  let yaw = defaultYaw, phase = 0, value = 50;
  let playing = !motion.matches, visible = true, frame = 0, previous = 0;
  let drawPoints, drag = null;

  // Deterministic patch-grid & phase-streak tables to emulate wide-band ViT artifacts (Fig. 1, 3^11).
  const GCOLS = 32, GROWS = 24;
  const patchJitter = [];
  for (let i = 0; i < GCOLS * GROWS; i++) {
    const s1 = Math.sin((i + 1) * 12.9898) * 43758.5453;
    const s2 = Math.sin((i + 1) * 78.233) * 19341.231;
    patchJitter.push([
      (s1 - Math.floor(s1)) * 2 - 1,
      (s2 - Math.floor(s2)) * 2 - 1
    ]);
  }
  const streaks = [];
  for (let k = 0; k < 28; k++) {
    const u = Math.sin((k + 3) * 37.719) * 15731.7;
    const f = u - Math.floor(u);
    streaks.push({
      y: (k + 0.35 + 0.4 * f) / 28,
      h: 1.2 + 2.8 * f,
      hue: k % 2 === 0 ? 'rgba(196,52,45,' : 'rgba(48,132,196,',
      ph: k * 0.9
    });
  }

  // Dwell on each setting so the same roof tiles and windows can be inspected across the sweep.
  const tour = [[0, 0], [1.2, 0], [3.1, 50], [5.5, 50], [7.9, 100], [9.5, 100], [12, 50], [13, 50], [15, 0]];
  let time = 1.15;
  function tourValue(t) {
    const next = tour.findIndex(stop => stop[0] > t);
    const [start, low] = tour[next - 1];
    const [end, high] = tour[next];
    const u = (t - start) / (end - start);
    return Math.round(low + (high - low) * u * u * (3 - 2 * u));
  }

  function drawWave() {
    const path = [];
    const cycles = 1.2 * Math.pow(8, value / 100);
    const wavelength = (cloud.clientWidth || 320) / cycles;
    ripple.style.maskSize = wavelength + 'px 100%';
    ripple.style.webkitMaskSize = wavelength + 'px 100%';
    ripple.style.maskPosition = (wavelength * phase / (2 * Math.PI)) + 'px 0';
    ripple.style.webkitMaskPosition = (wavelength * phase / (2 * Math.PI)) + 'px 0';
    for (let i = 0; i <= 220; i++) {
      const t = i / 220;
      const amplitude = 10 + 7 * Math.sin(Math.PI * t);
      const y = 21 - amplitude * Math.sin(Math.PI * 2 * t * cycles - phase);
      path.push((i ? 'L' : 'M') + (400 * t).toFixed(1) + ' ' + y.toFixed(1));
    }
    wave.setAttribute('d', path.join(''));
  }

  function renderWideArtifact(sev, width) {
    const nw = output.naturalWidth, nh = output.naturalHeight;
    const cw = Math.min(680, Math.max(320, Math.round(width)));
    const ch = Math.max(1, Math.round(cw * nh / nw));
    if (pixels.width !== cw || pixels.height !== ch) {
      pixels.width = cw;
      pixels.height = ch;
    }
    const ctx = pixels.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);

    // 1. Softened correspondence base + multi-view epipolar ghosting (keeping crisp terracotta contrast)
    if ('filter' in ctx) ctx.filter = 'blur(' + (0.75 + 1.8 * sev).toFixed(2) + 'px) contrast(1.04) saturate(1.03)';
    ctx.drawImage(output, -2, -2, cw + 4, ch + 4);
    if ('filter' in ctx) ctx.filter = 'none';

    ctx.globalAlpha = 0.24 * sev;
    ctx.drawImage(output, 4.8 * sev, -1.6 * sev, cw, ch);
    ctx.drawImage(output, -4.4 * sev, 1.5 * sev, cw, ch);

    // 2. Patch-grid phase decorrelation (mirrors 8-px patch seams at 3^11 in Fig. 1)
    const pw = cw / GCOLS, ph = ch / GROWS, sw = nw / GCOLS, sh = nh / GROWS;
    ctx.globalAlpha = 0.48 * sev;
    for (let r = 0; r < GROWS; r++) {
      for (let c = 0; c < GCOLS; c++) {
        const [jx, jy] = patchJitter[r * GCOLS + c];
        ctx.drawImage(
          output,
          c * sw, r * sh, sw, sh,
          c * pw + jx * 3.4 * sev, r * ph + jy * 1.8 * sev, pw + 0.35, ph + 0.35
        );
      }
    }
    ctx.globalAlpha = 1;

    // 3. Directional chromatic phase-noise streaks along the camera baseline
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(cw * 0.5, ch * 0.5);
    ctx.rotate(-0.14);
    ctx.translate(-cw * 0.65, -ch * 0.65);
    const spanW = cw * 1.3, spanH = ch * 1.3;
    for (let k = 0; k < streaks.length; k++) {
      const st = streaks[k];
      const pulse = 0.65 + 0.35 * Math.sin(phase + st.ph);
      const alpha = (0.16 * sev * pulse).toFixed(3);
      ctx.fillStyle = st.hue + alpha + ')';
      ctx.fillRect(0, st.y * spanH, spanW, st.h * (0.7 + 0.6 * sev));
    }
    ctx.restore();
  }

  function formatTopFreq(v) {
    // Piecewise log mapping so 0 -> 0.012 (3x), 50 -> 0.95 (243x center), 100 -> 692 (3^11)
    const f = v <= 50
      ? 0.012 * Math.pow(0.95 / 0.012, v / 50)
      : 0.95 * Math.pow(692 / 0.95, (v - 50) / 50);
    return f >= 100 ? f.toFixed(0) : f >= 10 ? f.toFixed(0) : f >= 1 ? f.toFixed(1) : f >= 0.1 ? f.toFixed(2) : f.toFixed(3);
  }

  function showOutput() {
    const width = output.clientWidth;
    const blur = Math.max(0, (44 - value) / 44) * width * 0.0102;
    output.style.filter = blur > 0.08 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
    const sev = Math.max(0, (value - 56) / 44);
    const hasWide = sev > 0.02 && width > 0 && output.naturalWidth > 0;
    pixels.hidden = !hasWide;
    if (hasWide) renderWideArtifact(sev, width);

    const state = hasWide ? 'Streaked' : blur > 0.08 ? 'Blurred' : 'Sharp';
    const stateKey = hasWide ? 'streaked' : blur > 0.08 ? 'blurred' : 'sharp';
    quality.textContent = state;
    quality.dataset.state = stateKey;
    if (freqEl) {
      freqEl.textContent = 'top: ' + formatTopFreq(value) + ' rot./patch';
      freqEl.dataset.state = stateKey;
    }
    const setting = value < 44 ? 'Narrow' : value > 56 ? 'Wide' : 'Tuned';
    band.setAttribute('aria-valuetext', setting + ' band, ' + state.toLowerCase() + ' novel view');
    stops.forEach(stop => stop.setAttribute('aria-pressed', +stop.dataset.band === value));
  }

  function setBand(next) {
    value = Number(next);
    band.value = value;
    showOutput();
    drawWave();
  }

  function animate(now) {
    frame = 0;
    if (!playing || !visible || document.hidden) return;
    if (!previous || now - previous >= 40) {
      const dt = previous ? Math.min(0.12, (now - previous) / 1000) : 0;
      previous = now;
      time = (time + dt) % tour[tour.length - 1][0];
      phase = (phase + 1.8 * dt) % (2 * Math.PI);
      const next = tourValue(time);
      if (next !== value) setBand(next);
      else {
        drawWave();
        if (value > 56) showOutput();
      }
    }
    queueFrame();
  }
  function queueFrame() {
    if (playing && visible && !document.hidden && !frame) frame = requestAnimationFrame(animate);
  }
  function setPlaying(on) {
    playing = on;
    play.setAttribute('aria-pressed', on);
    play.setAttribute('aria-label', (on ? 'Pause' : 'Play') + ' frequency sweep');
    previous = 0;
    if (!on) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else queueFrame();
  }

  // Decoded model geometry and a depth buffer keep the orbit usable offline, including file URLs.
  function preparePoints(encoded) {
    const ctx = cloud.getContext('2d');
    if (!ctx) return;
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const buffer = new DataView(bytes.buffer);
    const n = bytes.length / 9;
    const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
    const rgba = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      const pos = i * 9;
      x[i] = buffer.getInt16(pos, true) / 4096;
      y[i] = buffer.getInt16(pos + 2, true) / 4096;
      z[i] = buffer.getInt16(pos + 4, true) / 4096 - 1.85;
      rgba[i] = (255 << 24) | (bytes[pos + 8] << 16) | (bytes[pos + 7] << 8) | bytes[pos + 6];
    }
    let surface, color, depth;
    const near = new Float32Array(n), sx = new Int32Array(n), sy = new Int32Array(n);
    const elev = 0.33, ce = Math.cos(elev), se = Math.sin(elev);
    drawPoints = function () {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
      const w = Math.round(cloud.clientWidth * ratio), h = Math.round(cloud.clientHeight * ratio);
      if (!w || !h) return;
      if (!surface || surface.width !== w || surface.height !== h) {
        cloud.width = w;
        cloud.height = h;
        ripple.width = w;
        ripple.height = h;
        surface = ctx.createImageData(w, h);
        color = new Uint32Array(surface.data.buffer);
        depth = new Float32Array(w * h);
      }
      depth.fill(-Infinity);
      color.fill(0);
      const co = Math.cos(yaw), si = Math.sin(yaw);
      const scale = Math.min(w / 10.6, h / 7.0);
      const radius = Math.max(1, Math.round(scale / 30));
      const cell = Math.max(3, Math.round(scale / 6.5));
      const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      const nearest = new Float32Array(cols * rows);
      nearest.fill(-Infinity);
      for (let i = 0; i < n; i++) {
        const back = -x[i] * si + y[i] * co;
        const px = Math.round(w * 0.5 + scale * (x[i] * co + y[i] * si));
        const py = Math.round(h * 0.53 - scale * (z[i] * ce + back * se));
        sx[i] = px;
        sy[i] = py;
        near[i] = -back * ce + z[i] * se;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const bin = Math.floor(py / cell) * cols + Math.floor(px / cell);
        nearest[bin] = Math.max(nearest[bin], near[i]);
      }
      for (let i = 0; i < n; i++) {
        const px = sx[i], py = sy[i], d = near[i];
        if (px < 0 || py < 0 || px + radius > w || py + radius > h) continue;
        if (d < nearest[Math.floor(py / cell) * cols + Math.floor(px / cell)] - 0.65) continue;
        for (let row = 0; row < radius; row++) {
          let index = (py + row) * w + px;
          for (let col = 0; col < radius; col++, index++) {
            if (d > depth[index]) {
              depth[index] = d;
              color[index] = rgba[i];
            }
          }
        }
      }
      ctx.putImageData(surface, 0, 0);
      ripple.getContext('2d').putImageData(surface, 0, 0);
    };
    cloud.hidden = false;
    ripple.hidden = false;
    drawPoints();
    figure.querySelector('.cloud-poster').hidden = true;
    figure.querySelector('.orbit-hint').hidden = false;
  }

  cloud.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0) return;
    drag = { x: e.clientX, yaw: yaw };
    cloud.setPointerCapture(e.pointerId);
  });
  cloud.addEventListener('pointermove', e => {
    if (!drag || !e.isPrimary) return;
    yaw = drag.yaw + (drag.x - e.clientX) * Math.PI / cloud.clientWidth;
    drawPoints();
  });
  cloud.addEventListener('lostpointercapture', () => { drag = null; });
  cloud.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
    e.preventDefault();
    yaw = e.key === 'Home' ? defaultYaw : yaw + (e.key === 'ArrowRight' ? 0.18 : -0.18);
    drawPoints();
  });

  function selectBand(v) {
    setPlaying(false);
    setBand(v);
    let nearest = 0, delta = Infinity;
    for (let t = 0; t <= 8; t += 0.025) {
      const distance = Math.abs(v - tourValue(t));
      if (distance < delta) { nearest = t; delta = distance; }
    }
    time = nearest;
  }
  band.addEventListener('input', () => selectBand(+band.value));
  stops.forEach(stop => stop.addEventListener('click', () => selectBand(+stop.dataset.band)));
  play.addEventListener('click', () => setPlaying(!playing));
  motion.addEventListener('change', e => { if (e.matches) selectBand(50); });
  output.addEventListener('load', showOutput);
  document.addEventListener('visibilitychange', () => { previous = 0; queueFrame(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      previous = 0;
      queueFrame();
    }).observe(figure);
  }
  function resize() {
    showOutput();
    if (drawPoints) drawPoints();
    drawWave();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(figure);
  else window.addEventListener('resize', resize);
  figure.hidden = false;
  figure.querySelectorAll('[data-cottage]').forEach(img => { img.src = media + img.dataset.cottage; });
  const geometry = document.createElement('script');
  geometry.src = media + 'cloud.js';
  geometry.onload = () => {
    preparePoints(window.MTB_COTTAGE_CLOUD);
    delete window.MTB_COTTAGE_CLOUD;
  };
  document.body.appendChild(geometry);
  setBand(playing ? tourValue(time) : 50);
  setPlaying(playing);
})();
