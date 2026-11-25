/* Mind the Band: project page. Reads window.MTB (data.js) and window.MTB_SITE (config.js). No network access. */
(function () {
  'use strict';
  var D = window.MTB, S = window.MTB_SITE || { public: false };
  var $ = function (id) { return document.getElementById(id); };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = {
    ink: '#0f172a', muted: '#475569', faint: '#64748b', line: '#dde4ee',
    ray: '#c53030', raySoft: '#ebb5b5', world: '#1d4ed8', uro: '#64748b',
    band: '#bfd4f4', bandSoft: '#eaf1fb', bandBorder: '#bfd4f4', bandInk: '#254f8f',
    track: 'rgba(15,23,42,0.07)'
  };
  var SANS = '"Inter", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
  var MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  var f2 = function (v) { return v.toFixed(2); };
  var freq = function (v) { return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  var sup = function (n) { return String(n).split('').map(function (c) { return SUP[c]; }).join(''); };
  var stops = D.band.filter(function (b) { return !b.stop; }), stopB = D.band.filter(function (b) { return b.stop; })[0];
  var bandOf = function (key) { return D.band.filter(function (b) { return b.key === key; })[0]; };
  var kOf = function (f) { return Math.log(f * 256) / Math.log(3); }; // exponent of the range 3^k that tops out at f

  /* ---------- animation loop: draws only what is on screen ---------- */
  var anims = {};
  function addAnim(name, panel, a) {
    a.visible = false; a.playing = !reduce; a.dirty = true; a.panel = panel; anims[name] = a;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { a.visible = es[0].isIntersecting; a.dirty = true; }, { threshold: 0.05 }).observe(panel);
    } else a.visible = true;
  }
  var last = 0;
  function tick(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    Object.keys(anims).forEach(function (k) {
      var a = anims[k];
      if (!a.visible) return;
      if (a.playing) { a.step(dt); a.dirty = true; }
      if (a.dirty) { a.draw(); a.dirty = false; }
    });
    window.requestAnimationFrame(tick);
  }
  function setPlaying(name, on) {
    anims[name].playing = on;
    each(document.querySelectorAll('.play[data-anim="' + name + '"]'), function (b) { b.setAttribute('aria-pressed', on); });
  }
  function fit(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth;
    var h = Number(cv.dataset.logicalHeight || cv.getAttribute('height'));
    cv.dataset.logicalHeight = h;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    cv.style.height = h + 'px';
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function text(ctx, s, x, y, font, color, align) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y);
  }

  /* ---------- header, public fields & navigation ---------- */
  function iconSvg(label) {
    var k = (label || '').toLowerCase();
    if (k.indexOf('code') >= 0 || k.indexOf('git') >= 0) {
      return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4.2L1.8 8l3.7 3.8M10.5 4.2L14.2 8l-3.7 3.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (k.indexOf('vid') >= 0) {
      return '<svg viewBox="0 0 16 16" aria-hidden="true"><polygon points="5,3.5 13,8 5,12.5" fill="currentColor"/></svg>';
    }
    if (k.indexOf('bib') >= 0) {
      return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3.5h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zm1.7 3.2h3.6M6.2 9.3h2.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    }
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.5h4.8l2.7 2.7v8.3h-7.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.2 2.5v2.8H12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  }

  function buildHeader() {
    $('venue').textContent = S.venue || '';
    if (S.public) {
      document.body.classList.add('is-public');
      if ($('showcase')) $('showcase').hidden = false;
      var cottage = document.createElement('script');
      cottage.src = 'assets/cottage.js';
      document.body.appendChild(cottage);

      if (S.title) document.title = S.title;
      if (S.authors && S.authors.length) {
        $('authors').hidden = false;
        $('authors').innerHTML = '<span class="names">' + S.authors.map(function (a) {
          var name = a.url ? '<a href="' + a.url + '" target="_blank" rel="noopener">' + a.name + '</a>' : a.name;
          return '<span class="au">' + name + (a.mark || a.aff ? '<sup>' + (a.mark || a.aff) + '</sup>' : '') + '</span>';
        }).join('<i class="sep">&middot;</i>') + '</span>' +
          (S.affiliations && S.affiliations.length ? '<span class="aff">' + S.affiliations.join(' &middot; ') + '</span>' : '') +
          (S.notes ? '<span class="note">' + S.notes + '</span>' : '');
      }

      var resources = S.links || [];
      var pills = resources.map(function (link) {
        var ic = iconSvg(link.label);
        if (link.href && !link.soon) {
          var ext = (/\.pdf($|\?)|^https?:\/\//i).test(link.href) ? ' target="_blank" rel="noopener"' : '';
          return '<a href="' + link.href + '"' + ext + '>' + ic + '<span>' + link.label + '</span></a>';
        }
        return '<span class="pill-soon">' + ic + '<span>' + link.label + '</span><em>soon</em></span>';
      });
      pills.push('<a class="secondary" href="#overview">' + iconSvg('Video') + '<span>Video</span></a>');
      if (S.bibtex) pills.push('<a class="secondary" href="#cite">' + iconSvg('BibTeX') + '<span>BibTeX</span></a>');
      if (pills.length) {
        $('links').innerHTML = pills.join('');
        $('links').hidden = false;
        $('hero-bar').hidden = false;
      }
      if (S.releaseStatus) {
        $('release-status').textContent = S.releaseStatus;
        $('release-status').hidden = false;
        $('hero-bar').hidden = false;
      }
      var pending = resources.filter(function (link) { return !link.href || link.soon; });
      if (pending.length) {
        $('release-links').hidden = false;
        $('release-links').textContent = pending.map(function (link) { return link.label; }).join(' and ') + ' coming soon.';
      }
      $('foot').textContent = S.footer || '';
      if (S.bibtex) {
        $('cite').hidden = false; $('nav-cite').hidden = false; $('bib').textContent = S.bibtex;
        $('bib-copy').addEventListener('click', function () {
          var b = this, done = function () { b.textContent = 'Copied!'; window.setTimeout(function () { b.textContent = 'Copy BibTeX'; }, 1600); };
          var select = function () { var r = document.createRange(); r.selectNodeContents($('bib')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(S.bibtex).then(done, select); else select();
        });
      }
    } else {
      $('foot').textContent = 'Supplementary material of an anonymous CVPR 2027 submission. All files are in this folder; the page loads nothing from the network.';
    }

    var c = D.claims;
    var r = D.recovery[0];
    $('s-gap').textContent = c.gap25.toFixed(1); $('s-left').textContent = c.left25.toFixed(1);
    $('s-rec').textContent = Math.round(100 * Math.min(r.share, r.seed2)) + '–' + Math.round(100 * Math.max(r.share, r.seed2));
    $('n-rec1').textContent = Math.round(100 * r.share); $('n-rec2').textContent = Math.round(100 * r.seed2);
    var s = D.sweep.series;
    $('n-uro').textContent = (s[1].y[0] - s[2].y[0]).toFixed(1); $('n-wor').textContent = (s[0].y[0] - s[2].y[0]).toFixed(1);
    $('n-flat').textContent = f2(Math.max.apply(null, s[3].y) - Math.min.apply(null, s[3].y));
    $('n-world').textContent = '+' + f2(c.world_gain);
    $('n-311').textContent = f2(bandOf('b11').psnr);
    $('n-311lo').textContent = f2(c.runs311[0]); $('n-311hi').textContent = f2(c.runs311[c.runs311.length - 1]);
    if ($('still-fmt')) $('still-fmt').textContent = S.public ? 'lossless WebP' : 'WebP';
    if ($('media-fmt')) $('media-fmt').textContent = S.webm ? 'H.264 MP4 with VP9 WebM fallback' : 'H.264 MP4';
  }

  function initNavSpy() {
    var links = [];
    var bar = $('scroll-progress');
    each($('paper-nav').querySelectorAll('a[href^="#"]'), function (a) {
      var target = $(a.getAttribute('href').slice(1));
      if (target) links.push({ a: a, el: target });
    });
    var updateSpy = function () {
      var y = window.scrollY + 130, active = null;
      links.forEach(function (item) {
        if (item.el.hidden) return;
        if (item.el.offsetTop <= y) active = item.a;
      });
      links.forEach(function (item) { item.a.setAttribute('data-active', item.a === active); });
      if (bar) {
        var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        bar.style.transform = 'scaleX(' + clamp(window.scrollY / max, 0, 1).toFixed(4) + ')';
      }
    };
    window.addEventListener('scroll', updateSpy, { passive: true });
    window.addEventListener('resize', updateSpy, { passive: true });
    updateSpy();
  }

  /* ---------- hero: live teaser ---------- */
  var T = { i: 2, stop: false, touring: !reduce, picked: false, timer: null };
  function teaserPoint() { return T.stop && T.i === 5 ? stopB : stops[T.i]; }
  function buildTeaser() {
    var box = $('t-tiles');
    stops.forEach(function (b, i) {
      var el = document.createElement('button');
      el.type = 'button'; el.className = 't-tile';
      el.innerHTML = '<img alt="" width="256" height="256" src="media/hero/' + b.key + '.webp"><span class="tl">' + b.label +
        '</span><span class="tf">' + freq(b.top) + ' rot./patch</span>';
      el.addEventListener('click', function () { T.i = i; if (i !== 5) T.stop = false; userPick(); });
      box.appendChild(el);
    });
    new Image().src = 'media/hero/' + stopB.key + '.webp';
    var a = kOf(D.claims.good[0]) / 12 * 100, b2 = kOf(D.claims.good[1]) / 12 * 100;
    $('t-plateau').style.left = a + '%'; $('t-plateau').style.width = (b2 - a) + '%';
    $('t-stop').addEventListener('click', function () { T.stop = !T.stop; T.i = 5; userPick(); });
    $('t-play').addEventListener('click', function () { T.touring = !T.touring; T.picked = false; tour(); showTeaser(); });
    drawTeaserCurve(); showTeaser(); tour();
    if ('ResizeObserver' in window) new ResizeObserver(function () { drawTeaserCurve(); showTeaser(); }).observe($('t-curve'));
  }
  function userPick() { T.touring = false; T.picked = true; tour(); showTeaser(); }
  function tour() {
    window.clearInterval(T.timer); T.timer = null;
    if (!T.touring) return;
    T.timer = window.setInterval(function () {
      if (T.i === 5 && !T.stop) T.stop = true;
      else { T.i = T.stop ? 0 : T.i + 1; T.stop = false; }
      showTeaser();
    }, 1900);
  }
  var TC = { H: 160, top: 16, bot: 34, y0: 25.0, y1: 27.0 };
  function tx(k, w) { return k / 12 * w; }
  function ty(v) { return TC.top + (TC.y1 - v) / (TC.y1 - TC.y0) * (TC.H - TC.top - TC.bot); }
  function drawTeaserCurve() {
    var svg = $('t-curve'), w = svg.clientWidth || 1000, s = '';
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + TC.H); svg.style.height = TC.H + 'px';
    [25.5, 26, 26.5].forEach(function (v) {
      s += '<line x1="0" x2="' + w + '" y1="' + ty(v) + '" y2="' + ty(v) + '" stroke="' + C.line + '"/>';
      s += '<text x="2" y="' + (ty(v) - 4) + '">' + v.toFixed(1) + (v === 26.5 ? ' dB' : '') + '</text>';
    });
    var base = TC.H - TC.bot;
    s += '<line x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '" stroke="' + C.faint + '"/>';
    [0.01, 0.1, 1, 10, 100].forEach(function (f) {
      var x = tx(kOf(f), w);
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + base + '" y2="' + (base + 5) + '" stroke="' + C.faint + '"/>';
      s += '<text x="' + x + '" y="' + (base + 18) + '" text-anchor="middle">' + f + '</text>';
    });
    s += '<text x="' + w + '" y="' + (base + 18) + '" text-anchor="end">' + (w - tx(kOf(100), w) > 300 ? 'top frequency (rotations per patch)' : w - tx(kOf(100), w) > 110 ? 'rot./patch' : '') + '</text>';
    s += '<polyline class="draw" pathLength="1" fill="none" stroke="' + C.ray + '" stroke-width="2.2" stroke-linejoin="round" points="' +
      stops.map(function (b) { return tx(b.k, w) + ',' + ty(b.psnr); }).join(' ') + '"/>';
    var x11 = tx(11, w);
    s += '<line x1="' + x11 + '" x2="' + x11 + '" y1="' + (ty(stops[5].psnr) - 8) + '" y2="' + (ty(stopB.psnr) + 8) + '" stroke="' + C.ray + '" stroke-width="1.6" stroke-dasharray="3 4"/>';
    stops.forEach(function (b) { s += '<circle cx="' + tx(b.k, w) + '" cy="' + ty(b.psnr) + '" r="4.5" fill="' + C.ray + '"/>'; });
    s += '<circle cx="' + x11 + '" cy="' + ty(stopB.psnr) + '" r="4.8" fill="#fff" stroke="' + C.ray + '" stroke-width="2"/>';
    s += '<circle id="t-sel" r="10" fill="none" stroke="' + C.ink + '" stroke-width="2"/>';
    svg.innerHTML = s;
    $('teaser').classList.add('seen');
  }
  function showTeaser() {
    var tiles = $('t-tiles').children, p = teaserPoint(), w = $('t-curve').clientWidth || 1000;
    each(tiles, function (el, i) { el.setAttribute('aria-pressed', i === T.i); });
    tiles[5].querySelector('img').src = 'media/hero/' + (T.stop ? stopB.key : stops[5].key) + '.webp';
    $('t-stop').setAttribute('aria-pressed', T.stop);
    $('t-play').setAttribute('aria-pressed', T.touring);
    $('teaser').classList.toggle('touring', T.touring); $('teaser').classList.toggle('picked', T.picked);
    var sel = $('t-sel'); if (sel) { sel.setAttribute('cx', tx(p.k, w)); sel.setAttribute('cy', ty(p.psnr)); }
    $('t-read').innerHTML = '<b>' + p.label + '</b> <span class="dim">&middot; top frequency</span> ' + freq(p.top) +
      ' <span class="dim">rot./patch &middot; test PSNR</span> <b>' + f2(p.psnr) + ' dB</b>';
  }

  /* ---------- 01: grid positions against continuous positions ---------- */
  var CA = { f: 0.16, t: 0, keys: [[0.08, 0.3], [0.16, 1.6], [0.5, 1.6], [1.0, 2.6], [1.25, 0.4]], move: 2.4 };
  var OFFS = [0.31, -0.22, 0.07, -0.38, 0.40, -0.10, 0.24, -0.33];
  function conceptAt(t) {
    var seq = CA.keys.concat(CA.keys.slice(1, -1).reverse()), total = 0, i;
    for (i = 0; i < seq.length; i++) total += seq[i][1] + CA.move;
    t = t % total;
    for (i = 0; i < seq.length; i++) {
      var a = seq[i], b = seq[(i + 1) % seq.length];
      if (t < a[1]) return a[0];
      t -= a[1];
      if (t < CA.move) return a[0] + (b[0] - a[0]) * ease(t / CA.move);
      t -= CA.move;
    }
    return seq[0][0];
  }
  function drawConcept() {
    var cv = $('c-concept'), g = fit(cv), ctx = g.ctx, w = g.w, pad = 12, f = CA.f;
    var xs = function (x) { return pad + (x + 0.5) / 8 * (w - 2 * pad); };
    function lane(top, title, pts, color, grid) {
      var yc = top + 64, A = 24, yb = top + 102, yd = top + 134, r = Math.min(12, (w - 2 * pad) / 8 * 0.3), i, x;
      text(ctx, title, pad, top + 16, '640 15px ' + SANS, C.ink);
      var note = '', nc = C.faint, fa = f - Math.round(f);
      if (grid) {
        if (Math.abs(f - 1) < 0.035) { note = 'every token gets identical phase'; nc = C.ray; }
        else if (f > 0.5) note = 'aliases to ' + Math.abs(fa).toFixed(2) + ' rot./patch';
      } else if (Math.abs(f - 1) < 0.035) { note = 'sub-patch offsets stay distinct'; nc = C.world; }
      if (note && w > 500) text(ctx, note, w - pad, top + 16, '550 12.5px ' + MONO, nc, 'right');
      else if (note) text(ctx, note, pad, top + 34, '550 12px ' + MONO, nc);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, yc); ctx.lineTo(w - pad, yc); ctx.stroke();
      for (i = 0; i < 8; i++) {
        ctx.fillStyle = C.track; ctx.beginPath();
        ctx.rect(xs(i - 0.5) + 2, yb, xs(i + 0.5) - xs(i - 0.5) - 4, 7); ctx.fill();
      }
      ctx.strokeStyle = C.raySoft; ctx.lineWidth = 1.7; ctx.beginPath();
      for (x = -0.5; x <= 7.5001; x += 0.01) { var y = yc - A * Math.cos(2 * Math.PI * f * x); if (x === -0.5) ctx.moveTo(xs(x), y); else ctx.lineTo(xs(x), y); }
      ctx.stroke();
      if (grid && f > 0.5) {
        ctx.strokeStyle = C.faint; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath();
        for (x = -0.5; x <= 7.5001; x += 0.02) { var ya = yc - A * Math.cos(2 * Math.PI * fa * x); if (x === -0.5) ctx.moveTo(xs(x), ya); else ctx.lineTo(xs(x), ya); }
        ctx.stroke(); ctx.setLineDash([]);
      }
      pts.forEach(function (p) {
        var th = 2 * Math.PI * f * p, px = xs(p), py = yc - A * Math.cos(th);
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, yb + 7); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 4.2, 0, 7); ctx.fill();
        ctx.fillRect(px - 1, yb - 2, 2, 11);
        ctx.strokeStyle = C.faint; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, yd, r, 0, 7); ctx.stroke();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, yd);
        ctx.lineTo(px + r * Math.sin(th), yd - r * Math.cos(th)); ctx.stroke(); ctx.lineCap = 'butt';
      });
    }
    lane(0, 'Within one image: tokens at integer patch centers', [0, 1, 2, 3, 4, 5, 6, 7], C.ray, true);
    lane(174, 'Across views: reprojected points land anywhere', OFFS.map(function (d, i) { return i + d; }), C.ink, false);
    var lab = Math.abs(f - 0.16) < 0.012 ? ' · 2D RoPE top' : Math.abs(f - 0.5) < 0.012 ? ' · Nyquist limit' : Math.abs(f - 1) < 0.035 ? ' · 1 per patch' : '';
    $('o-concept').textContent = f.toFixed(2) + ' rot./patch' + lab;
    $('r-concept').value = f;
  }

  /* ---------- 02: default bands against head size ---------- */
  var RA = { ds: [48, 96, 144, 192], idx: 0, prev: 0, t: 1, hold: 0 };
  function setRule(i, user) {
    if (i === RA.idx) return;
    RA.prev = RA.idx; RA.idx = i; RA.t = reduce ? 1 : 0; RA.hold = 0;
    each($('seg-rule').children, function (b, j) { b.setAttribute('aria-pressed', j === i); });
    if (user) setPlaying('rule', false);
    anims.rule.dirty = true;
  }
  function drawRule() {
    var cv = $('c-rule'), g = fit(cv), ctx = g.ctx, w = g.w, h = g.h, padL = 12, padR = 12, rowH = 73, axisY = 4 * rowH + 6;
    var xs = function (f) { return padL + (Math.log(f) / Math.LN10 + 3) / 8 * (w - padL - padR); };
    var colors = { ray: C.ray, uro: C.uro, world: C.world }, t = ease(RA.t);
    var bx0 = xs(D.claims.good[0]), bx1 = xs(D.claims.good[1]);
    ctx.fillStyle = C.bandSoft; ctx.fillRect(bx0, 0, bx1 - bx0, axisY);
    ctx.strokeStyle = C.bandBorder; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(bx0, 0); ctx.lineTo(bx0, axisY); ctx.moveTo(bx1, 0); ctx.lineTo(bx1, axisY); ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, '0.3–3', (bx0 + bx1) / 2, axisY - 6, '650 12px ' + MONO, C.bandInk, 'center');
    D.bands.forEach(function (row, r) {
      var y = r * rowH, col = colors[row.color], cur = row.grids[RA.ds[RA.idx]], old = row.grids[RA.ds[RA.prev]], yl = y + 54;
      var top = cur[cur.length - 1], ratio = top / cur[0], k = Math.round(Math.log(ratio) / Math.log(3));
      var range = (k > 5 && Math.abs(Math.pow(3, k) / ratio - 1) < 0.01) ? '3' + sup(k) : Math.round(ratio) + '×';
      text(ctx, row.label, padL, y + 17, '650 15px ' + SANS, col);
      text(ctx, cur.length + ' frequencies · top ' + (top >= 1000 ? Math.round(top).toLocaleString('en-US') : freq(top)) + ' · range ' + range,
        padL, y + 36, '500 12.5px ' + MONO, C.muted);
      function ticks(grid, alpha, lw) {
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xs(grid[0]), yl); ctx.lineTo(xs(grid[grid.length - 1]), yl); ctx.stroke();
        ctx.lineWidth = lw; ctx.beginPath();
        grid.forEach(function (f) { ctx.moveTo(xs(f), yl - 8); ctx.lineTo(xs(f), yl + 8); });
        ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xs(grid[grid.length - 1]), yl, 4, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      var lw = cur.length > 16 ? 1 : 1.8;
      if (t < 1) ticks(old, 1 - t, old.length > 16 ? 1 : 1.8);
      ticks(cur, t < 1 ? t : 1, lw);
    });
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, axisY); ctx.lineTo(w - padR, axisY); ctx.stroke();
    for (var e = -3; e <= 5; e++) {
      var x = xs(Math.pow(10, e));
      ctx.beginPath(); ctx.moveTo(x, axisY); ctx.lineTo(x, axisY + 5); ctx.stroke();
      if (w > 520 || e % 2 !== 0) text(ctx, e < 3 ? String(Math.pow(10, e)) : '10' + sup(e), x, axisY + 20, '12px ' + MONO, C.faint, e === -3 ? 'left' : e === 5 ? 'right' : 'center');
    }
    text(ctx, 'frequency (rotations per patch)', w - padR, h - 6, '12px ' + MONO, C.faint, 'right');
  }

  /* ---------- 03: head-size sweep ---------- */
  function drawRank() {
    var svg = $('c-rank'), w = svg.clientWidth || 600, narrow = w < 600, H = narrow ? 320 : 356;
    var padL = 62, padR = narrow ? 14 : 246, top = 16, bot = 72, y0 = 25.4, y1 = 27.0, inset = 44;
    var X = function (i) { return padL + inset + i / 2 * (w - padL - padR - 2 * inset); };
    var Y = function (v) { return top + (y1 - v) / (y1 - y0) * (H - top - bot); };
    var colors = { ray: C.ray, uro: C.uro, world: C.world }, s = '';
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + H); svg.style.height = H + 'px';
    [25.5, 26, 26.5, 27].forEach(function (v) {
      s += '<line x1="' + padL + '" x2="' + (w - padR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + C.line + '"/>';
      s += '<text x="' + (padL - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v.toFixed(1) + '</text>';
    });
    s += '<text transform="translate(13,' + (top + (H - top - bot) / 2) + ') rotate(-90)" text-anchor="middle">test PSNR (dB)</text>';
    D.sweep.d.forEach(function (d, i) {
      s += '<text x="' + X(i) + '" y="' + (H - bot + 20) + '" text-anchor="middle" style="fill:' + C.ink + ';font-weight:650">' + d + '</text>';
      s += '<text x="' + X(i) + '" y="' + (H - bot + 36) + '" text-anchor="middle">' + [16, 8, 4][i] + ' heads</text>';
    });
    s += '<text x="' + (w - padR) + '" y="' + (H - 4) + '" text-anchor="end">head dimension d, 25M model</text>';
    var ends = [];
    D.sweep.series.forEach(function (se, j) {
      var col = colors[se.color], pts = se.y.map(function (v, i) { return X(i) + ',' + Y(v); }).join(' ');
      if (se.dash) s += '<polyline class="pop d2" fill="none" stroke="' + col + '" stroke-width="2" stroke-dasharray="5 5" points="' + pts + '"/>';
      else s += '<polyline class="draw" pathLength="1" fill="none" stroke="' + col + '" stroke-width="2.3" stroke-linejoin="round" points="' + pts + '"/>';
      se.y.forEach(function (v, i) {
        s += '<circle class="pop' + (se.dash ? ' d2' : '') + '" cx="' + X(i) + '" cy="' + Y(v) + '" r="4.3" fill="' + (se.dash ? '#fff' : col) + '" stroke="' + col + '" stroke-width="2"/>';
      });
      ends.push({ y: Y(se.y[2]), label: se.label, col: col, dash: se.dash, j: j });
    });
    var a = D.sweep.series[0].y[0], b = D.sweep.series[2].y[0], gx = X(0) - 16;
    s += '<g class="pop"><line x1="' + gx + '" x2="' + gx + '" y1="' + (Y(a) + 2) + '" y2="' + (Y(b) - 2) + '" stroke="' + C.ink + '"/>' +
      '<line x1="' + (gx - 4) + '" x2="' + (gx + 4) + '" y1="' + (Y(a) + 2) + '" y2="' + (Y(a) + 2) + '" stroke="' + C.ink + '"/>' +
      '<line x1="' + (gx - 4) + '" x2="' + (gx + 4) + '" y1="' + (Y(b) - 2) + '" y2="' + (Y(b) - 2) + '" stroke="' + C.ink + '"/>' +
      '<text transform="translate(' + (gx - 8) + ',' + ((Y(a) + Y(b)) / 2) + ') rotate(-90)" text-anchor="middle" style="fill:' + C.ink + ';font-weight:650">' + (a - b).toFixed(1) + ' dB</text></g>';
    if (!narrow) {
      ends.sort(function (p, q) { return p.y - q.y; });
      for (var i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 20) ends[i].y = ends[i - 1].y + 20;
      ends.forEach(function (e) {
        s += '<text class="lbl pop' + (e.dash ? ' d2' : '') + '" x="' + (X(2) + 12) + '" y="' + (e.y + 5) + '" style="fill:' + e.col + '">' + e.label + '</text>';
      });
    }
    svg.innerHTML = s;
    var leg = $('b-rank').querySelector('.legend');
    if (narrow && !leg) {
      leg = document.createElement('p'); leg.className = 'legend hint'; leg.style.margin = '6px 0 4px';
      leg.innerHTML = D.sweep.series.map(function (se) {
        return '<span style="color:' + colors[se.color] + ';font-weight:600;white-space:nowrap">' + (se.dash ? '- - ' : '— ') + se.label + '</span>';
      }).join(' &nbsp; ');
      $('b-rank').appendChild(leg);
    } else if (!narrow && leg) leg.parentNode.removeChild(leg);
  }

  /* ---------- 05: forward output against gradient ---------- */
  var WA = { logN: 0, mode: 'box', t: 0, mt: 0 };
  var SIG = 1 / Math.sqrt(3);
  function whyAt(t) {
    var up = 13, hold = 1.4, total = 2 * (up + hold); t = t % total;
    if (t < hold) return -1;
    if (t < hold + up) return -1 + 3.6 * ease((t - hold) / up);
    if (t < 2 * hold + up) return 2.6;
    return 2.6 - 3.6 * ease((t - 2 * hold - up) / up);
  }
  function outOf(N) { return WA.mode === 'box' ? Math.abs(Math.sin(Math.PI * N)) / (Math.PI * N) : Math.exp(-Math.pow(Math.PI * N * SIG, 2) / 2); }
  function gradOf(N) { return WA.mode === 'box' ? Math.abs(Math.sin(Math.PI * N)) : Math.PI * N * Math.exp(-Math.pow(Math.PI * N * SIG, 2) / 2); }
  function rangeOf(fn, n1, n2) {
    if (WA.mode !== 'box') { var a = fn(n1), b = fn(n2), m = fn((n1 + n2) / 2); return [Math.min(a, b, m), Math.max(a, b, m)]; }
    var wgt = fn === outOf ? 1 / (Math.PI * (n1 + n2) / 2) : 1, lo, hi;
    if (n2 - n1 >= 1) { lo = 0; hi = 1; }
    else {
      var s1 = Math.abs(Math.sin(Math.PI * n1)), s2 = Math.abs(Math.sin(Math.PI * n2));
      lo = Math.floor(n2) > Math.floor(n1) ? 0 : Math.min(s1, s2);
      hi = Math.floor(n2 + 0.5) > Math.floor(n1 + 0.5) ? 1 : Math.max(s1, s2);
    }
    return [Math.min(1.05, lo * wgt), Math.min(1.05, hi * wgt)];
  }
  function drawWhy() {
    var cv = $('c-why'), g = fit(cv), ctx = g.ctx, w = g.w, pad = 12, N = Math.pow(10, WA.logN), box = WA.mode === 'box';
    var Nd = Math.min(N, 24), mu = 0.2 * Math.sin(2 * Math.PI * WA.mt / 5.5);
    var yc = 90, A = 38, xs = function (u) { return pad + (u + 1.7) / 3.4 * (w - 2 * pad); };
    text(ctx, box ? 'Average over the interval [μ − Δ, μ + Δ]' : 'Average under a Gaussian window', pad, 17, '640 15px ' + SANS, C.ink);
    var nTxt = (N >= 10 ? N.toFixed(0) : N >= 1 ? N.toFixed(1) : N.toFixed(2)) + ' rotations inside' + (N > 24 ? ' (drawn as 24)' : '');
    if (w > 500) text(ctx, nTxt, w - pad, 17, '550 13px ' + MONO, C.muted, 'right');
    else text(ctx, nTxt, pad, 34, '550 12.5px ' + MONO, C.muted);
    var wgt = function (u) { return box ? (Math.abs(u - mu) <= 1 ? 1 : 0) : Math.exp(-Math.pow(u - mu, 2) / (2 * SIG * SIG)); };
    var wave = function (u) { return Math.cos(Math.PI * Nd * u); };
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, yc); ctx.lineTo(w - pad, yc); ctx.stroke();
    var px, u, v, x0 = Math.round(xs(-1.7)), x1 = Math.round(xs(1.7));
    for (px = x0; px <= x1; px++) {
      u = (px - pad) / (w - 2 * pad) * 3.4 - 1.7; v = wgt(u) * wave(u);
      if (Math.abs(v) < 0.004) continue;
      ctx.fillStyle = v > 0 ? 'rgba(191,44,35,0.28)' : 'rgba(29,78,216,0.24)';
      ctx.fillRect(px, v > 0 ? yc - A * v : yc, 1, Math.abs(A * v));
    }
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath();
    for (u = -1.7; u <= 1.7001; u += 0.002) { var y = yc - A * wave(u); if (u === -1.7) ctx.moveTo(xs(u), y); else ctx.lineTo(xs(u), y); }
    ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]); ctx.beginPath();
    if (box) ctx.rect(xs(mu - 1), yc - A - 6, xs(mu + 1) - xs(mu - 1), 2 * A + 12);
    else for (u = -1.7; u <= 1.7001; u += 0.01) { var yb = yc - (A + 6) * wgt(u); if (u === -1.7) ctx.moveTo(xs(u), yb); else ctx.lineTo(xs(u), yb); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.ink; ctx.fillRect(xs(mu) - 0.75, yc + A + 6, 1.5, 8);
    text(ctx, 'μ', xs(mu), yc + A + 27, '550 13px ' + MONO, C.ink, 'center');
    if (box) [-1, 1].forEach(function (sg) {
      var ue = mu + sg, ye = yc - A * wave(ue);
      ctx.fillStyle = C.ray; ctx.beginPath(); ctx.arc(xs(ue), ye, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(xs(ue), ye, 5, 0, 7); ctx.stroke();
      text(ctx, sg < 0 ? 'μ − Δ' : 'μ + Δ', xs(ue), yc + A + 27, '550 13px ' + MONO, C.ray, 'center');
    });

    // Two live magnitude meters
    var env = box && N > 2, o = env ? Math.min(1, 1 / (Math.PI * N)) : outOf(N), gr = env ? 1 : gradOf(N);
    function meter(my, label, val, color, note) {
      text(ctx, label, pad, my, '600 14px ' + SANS, C.ink);
      text(ctx, note + (val >= 0.995 ? val.toFixed(2) : val < 0.01 ? val.toFixed(3) : val.toFixed(2)), w - pad, my, '650 13.5px ' + MONO, color, 'right');
      ctx.fillStyle = C.track; ctx.fillRect(pad, my + 8, w - 2 * pad, 10);
      ctx.fillStyle = color; ctx.fillRect(pad, my + 8, (w - 2 * pad) * Math.min(1, val / 1.05), 10);
    }
    meter(184, 'Output  |Φ|', o, C.ink, env ? 'at most ' : '');
    meter(222, 'Gradient  Δ·|∂Φ/∂μ|', gr, C.ray, env ? 'up to ' : '');

    // Envelope plot against rotations inside the interval (markers cleanly above the top axis)
    var pt = 282, pb = 382, pl = pad + 28, pr = w - pad;
    var lx = function (n) { return pl + (Math.log(n) / Math.LN10 + 1) / 3.6 * (pr - pl); };
    var py = function (val) { return pb - val / 1.1 * (pb - pt); };
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach(function (val) {
      ctx.beginPath(); ctx.moveTo(pl, py(val)); ctx.lineTo(pr, py(val)); ctx.stroke();
      text(ctx, String(val), pl - 6, py(val) + 4, '12px ' + MONO, C.faint, 'right');
    });

    // Paper reference guides (243x and 3^11 from Fig. 2(c)) placed cleanly above the top axis
    [[0.43, '243×'], [312, '3' + sup(11)]].forEach(function (m) {
      var mx = lx(m[0]);
      ctx.strokeStyle = 'rgba(191,44,35,0.28)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(mx, pt); ctx.lineTo(mx, pb); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.ray;
      ctx.beginPath(); ctx.moveTo(mx, pt + 1); ctx.lineTo(mx - 3.5, pt - 5); ctx.lineTo(mx + 3.5, pt - 5); ctx.fill();
      text(ctx, m[1], mx, pt - 9, '650 12px ' + MONO, C.ray, 'center');
    });

    [['gradient', gradOf, C.ray, 'rgba(191,44,35,0.20)'], ['output', outOf, C.ink, 'rgba(21,23,28,0.16)']].forEach(function (cfg) {
      var topPts = [], col;
      for (col = Math.ceil(pl); col <= pr; col++) {
        var n1 = Math.pow(10, (col - 0.5 - pl) / (pr - pl) * 3.6 - 1), n2 = Math.pow(10, (col + 0.5 - pl) / (pr - pl) * 3.6 - 1), rg = rangeOf(cfg[1], n1, n2);
        if (rg[1] - rg[0] > 0.02) { ctx.fillStyle = cfg[3]; ctx.fillRect(col - 0.5, py(rg[1]), 1, py(rg[0]) - py(rg[1])); }
        topPts.push([col, py(rg[1])]);
      }
      ctx.strokeStyle = cfg[2]; ctx.lineWidth = 1.8; ctx.beginPath();
      topPts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.stroke();
    });
    text(ctx, 'gradient', lx(18), py(1) - 6, '640 13px ' + SANS, C.ray, 'center');
    text(ctx, 'output', lx(0.1) + 6, py(0.76), '640 13px ' + SANS, C.ink);

    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(lx(N), pt); ctx.lineTo(lx(N), pb); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(lx(N), py(o), 4, 0, 7); ctx.fill();
    ctx.fillStyle = C.ray; ctx.beginPath(); ctx.arc(lx(N), py(gr), 4, 0, 7); ctx.fill();

    ctx.strokeStyle = C.faint; ctx.beginPath(); ctx.moveTo(pl, pb); ctx.lineTo(pr, pb); ctx.stroke();
    [0.1, 1, 10, 100].forEach(function (n) {
      ctx.beginPath(); ctx.moveTo(lx(n), pb); ctx.lineTo(lx(n), pb + 4); ctx.stroke();
      text(ctx, String(n), lx(n), pb + 18, '12px ' + MONO, C.faint, 'center');
    });
    text(ctx, w > 500 ? 'rotations inside the interval (red guides: Fig. 2(c) example)' : 'rotations inside the interval', pr, pb + 38, '12px ' + MONO, C.faint, 'right');
    $('r-why').value = WA.logN;
  }
  function setWhyMode(m) {
    WA.mode = m;
    each($('seg-why').children, function (b) { b.setAttribute('aria-pressed', b.dataset.m === m); });
    var lhsOut = '<span class="eq-lhs">|&Phi;|</span>';
    var lhsGrad = '<span class="eq-lhs"><span class="mabs-tall"><span class="mfrac"><span class="mnum">&part;&Phi;</span><span class="mden">&part;<i>&mu;</i></span></span></span></span>';
    var rhsOut = m === 'box'
      ? '<span class="mfrac"><span class="mnum">|<span class="mop">sin</span>(<i>&omega;</i>&Delta;)|</span><span class="mden"><i>&omega;</i>&Delta;</span></span>'
      : '<i>e</i><sup>&minus;<i>&omega;</i>&sup2;<i>&sigma;</i>&sup2;/2</sup>';
    var rhsGrad = m === 'box'
      ? '<span class="mfrac"><span class="mnum">|<span class="mop">sin</span>(<i>&omega;</i>&Delta;)|</span><span class="mden">&Delta;</span></span>'
      : '<i>&omega;</i>&thinsp;<i>e</i><sup>&minus;<i>&omega;</i>&sup2;<i>&sigma;</i>&sup2;/2</sup>';
    $('eq-why').innerHTML =
      '<div class="eq-row"><span class="eq-tag">Output</span><span class="eq-expr">' + lhsOut + '<span class="meq">=</span><span class="eq-rhs">' + rhsOut + '</span></span></div>' +
      '<div class="eq-row r"><span class="eq-tag">Gradient</span><span class="eq-expr">' + lhsGrad + '<span class="meq">=</span><span class="eq-rhs">' + rhsGrad + '</span></span></div>';
    if (anims.why) anims.why.dirty = true;
  }

  /* ---------- 06: causal recovery bars ---------- */
  function buildBars() {
    $('bars').innerHTML = D.recovery.map(function (r, i) {
      var p = Math.round(100 * r.share);
      var cls = i === 0 ? ' primary' : (i === 1 ? ' sub-bar' : '');
      return '<div class="bar' + cls + '"><div class="bl"><span>' + r.label + '</span><b>' + p + '%</b></div>' +
        '<div class="bt"><div class="bf" data-w="' + clamp(100 * r.share, 0, 100) + '"></div>' +
        (r.seed2 !== null ? '<span class="dot" style="left:' + clamp(100 * r.seed2, 0, 100) + '%" title="second seed: ' + Math.round(100 * r.seed2) + '%"></span>' : '') +
        '</div></div>';
    }).join('');
  }
  function watchSeen() {
    var show = function (box) {
      box.classList.add('seen');
      each(box.querySelectorAll('.bf'), function (b) { b.style.width = b.dataset.w + '%'; });
    };
    var boxes = document.querySelectorAll('.chartbox');
    if (!('IntersectionObserver' in window) || reduce) { each(boxes, show); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.25 });
    each(boxes, function (b) { io.observe(b); });
  }

  /* ---------- 07: supplementary figure tabs & lightbox ---------- */
  function initFigures() {
    var tabsBox = $('fig-tabs'), allBtn = $('fig-all'), deck = $('fig-deck');
    if (!tabsBox || !deck) return;
    var tabs = tabsBox.querySelectorAll('button[data-fig]');
    var panels = deck.querySelectorAll('[data-fig-panel]');
    var activeIdx = 0, showAll = false;
    each(tabs, function (btn, idx) {
      if (btn.getAttribute('aria-selected') === 'true') activeIdx = idx;
    });

    function syncFigs() {
      allBtn.setAttribute('aria-pressed', showAll);
      allBtn.textContent = showAll ? 'Tabbed view' : 'Show all 5';
      each(tabs, function (btn, idx) {
        btn.setAttribute('aria-selected', !showAll && idx === activeIdx);
      });
      each(panels, function (p, idx) {
        p.hidden = !showAll && idx !== activeIdx;
      });
    }
    each(tabs, function (btn, idx) {
      btn.addEventListener('click', function () {
        activeIdx = idx; showAll = false; syncFigs();
      });
    });
    tabsBox.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      showAll = false;
      activeIdx = (activeIdx + (e.key === 'ArrowRight' ? 1 : panels.length - 1)) % panels.length;
      syncFigs();
      tabs[activeIdx].focus();
    });
    allBtn.addEventListener('click', function () {
      showAll = !showAll; syncFigs();
    });

    var dlg = $('lightbox'), lbImg = $('lb-img'), lbCap = $('lb-cap'), lbRaw = $('lb-raw'), lbClose = $('lb-close');
    if (dlg && typeof dlg.showModal === 'function') {
      each(deck.querySelectorAll('a[data-zoom]'), function (a) {
        a.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          var img = a.querySelector('img'), cap = a.parentNode.querySelector('figcaption');
          var titleEl = cap ? cap.querySelector('b') : null;
          var tagEl = cap ? cap.querySelector('.fig-tag') : null;
          lbImg.src = a.getAttribute('href');
          lbImg.alt = img ? img.alt : '';
          lbRaw.href = a.getAttribute('href');
          lbCap.textContent = (tagEl ? tagEl.textContent + ' · ' : '') + (titleEl ? titleEl.textContent : '');
          dlg.showModal();
        });
      });
      lbClose.addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }
  }

  /* ---------- renders: scenes, explorer, videos ---------- */
  var state = { scene: 0, view: D.scenes[0].view, band: 2 };
  var GROUPS = [['paper', 'Paper figures'], ['random', 'Random test scenes'], ['large', 'Large differences']];
  var VIDEO_BAND = ['b01', 'b05', 'b11', 'b11s'];
  var still = function (key, t) { return 'media/still/' + D.scenes[state.scene].id + '/' + key + '_t' + t + '.webp'; };
  function buildScenes() {
    each(document.querySelectorAll('[data-scenes]'), function (bar) {
      GROUPS.forEach(function (g) {
        var box = document.createElement('div'); box.className = 'group';
        box.innerHTML = '<p class="gl">' + g[1] + '</p>';
        var row = document.createElement('div'); row.className = 'thumbs';
        D.scenes.forEach(function (s, i) {
          if (s.group !== g[0]) return;
          var b = document.createElement('button');
          b.type = 'button'; b.dataset.i = i; b.title = s.note || g[1];
          b.setAttribute('aria-label', 'Scene ' + s.id + (s.note ? ', ' + s.note : ''));
          b.innerHTML = '<img loading="lazy" alt="" width="54" height="54" src="media/still/' + s.id + '/gt_t' + s.view + '.webp">';
          b.addEventListener('click', function () { state.scene = i; state.view = s.view; update(true); });
          row.appendChild(b);
        });
        box.appendChild(row); bar.appendChild(box);
      });
    });
  }
  var W = 318, H = 214, L = 50, R = 10, TP = 10, B = 36, X0 = Math.log(0.006) / Math.LN10, X1 = Math.log(1200) / Math.LN10, Y0 = 25.0, Y1 = 27.0;
  var px = function (f) { return L + (Math.log(f) / Math.LN10 - X0) / (X1 - X0) * (W - L - R); };
  var py = function (v) { return TP + (Y1 - v) / (Y1 - Y0) * (H - TP - B); };
  function buildChart() {
    var s = '';
    s += '<rect x="' + px(0.3) + '" y="' + TP + '" width="' + (px(3) - px(0.3)) + '" height="' + (H - TP - B) + '" fill="' + C.bandSoft + '"/>';
    [25, 25.5, 26, 26.5, 27].forEach(function (v) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + py(v) + '" y2="' + py(v) + '" stroke="' + C.line + '"/>';
      s += '<text x="' + (L - 6) + '" y="' + (py(v) + 4) + '" text-anchor="end">' + v.toFixed(1) + '</text>';
    });
    [0.01, 0.1, 1, 10, 100, 1000].forEach(function (f) {
      s += '<line x1="' + px(f) + '" x2="' + px(f) + '" y1="' + (H - B) + '" y2="' + (H - B + 4) + '" stroke="' + C.faint + '"/>';
      s += '<text x="' + px(f) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + f + '</text>';
    });
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="' + C.faint + '"/>';
    s += '<text x="' + (L + (W - L - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">top frequency (rotations per patch)</text>';
    s += '<text transform="translate(12,' + (TP + (H - TP - B) / 2) + ') rotate(-90)" text-anchor="middle">test PSNR (dB)</text>';
    s += '<polyline fill="none" stroke="' + C.ray + '" stroke-width="1.8" points="' + stops.map(function (b) { return px(b.top) + ',' + py(b.psnr); }).join(' ') + '"/>';
    s += '<line x1="' + px(stopB.top) + '" x2="' + px(stopB.top) + '" y1="' + (py(stops[5].psnr) - 6) + '" y2="' + (py(stopB.psnr) + 7) + '" stroke="' + C.ray + '" stroke-dasharray="3 3"/>';
    D.band.forEach(function (b, i) {
      s += '<g class="pt" data-i="' + i + '"><circle cx="' + px(b.top) + '" cy="' + py(b.psnr) + '" r="11" fill="transparent"/>' +
        '<circle cx="' + px(b.top) + '" cy="' + py(b.psnr) + '" r="4.2" stroke="' + C.ray + '" stroke-width="1.7" fill="' + (b.stop ? '#fff' : C.ray) + '"/></g>';
    });
    s += '<circle id="sel" r="8.5" fill="none" stroke="' + C.ink + '" stroke-width="1.8"/>';
    $('chart').innerHTML = s;
    each($('chart').querySelectorAll('.pt'), function (g) { g.addEventListener('click', function () { state.band = +g.dataset.i; update(false); }); });
  }
  function buildStops() {
    D.band.forEach(function (b, i) {
      var el = document.createElement('button');
      el.type = 'button'; el.innerHTML = b.label; if (b.stop) el.className = 'wide';
      el.addEventListener('click', function () { state.band = i; update(false); });
      $('stops').appendChild(el);
    });
    $('stops').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      state.band = clamp(state.band + (e.key === 'ArrowRight' ? 1 : -1), 0, D.band.length - 1);
      update(false); $('stops').children[state.band].focus(); e.preventDefault();
    });
    [0, 1, 2].forEach(function (t) {
      var el = document.createElement('button');
      el.type = 'button'; el.textContent = t + 1;
      el.addEventListener('click', function () { state.view = t; update(false); });
      $('views').appendChild(el);
    });
  }
  function buildVideos() {
    $('cols-band').innerHTML = VIDEO_BAND.map(function (k) {
      var b = bandOf(k); return '<div>' + b.label + '<span class="s">' + f2(b.psnr) + ' dB on test set</span></div>';
    }).join('');
    $('cols-head').innerHTML = D.head.map(function (h) { return '<div>' + h.label + '<span class="s">' + f2(h.psnr) + ' dB · ' + h.sub + '</span></div>'; }).join('');
    $('head-table').innerHTML = '<tr><th>25M model, 48-channel heads</th><th>PSNR</th><th>SSIM</th><th>LPIPS</th></tr>' + D.head.map(function (h) {
      return '<tr><td>' + h.label + ' <span>(' + h.sub + ')</span></td><td>' + f2(h.psnr) + '</td><td>' + h.ssim.toFixed(3) + '</td><td>' + h.lpips.toFixed(3) + '</td></tr>';
    }).join('');
    each(document.querySelectorAll('.seg[data-video]'), function (seg) {
      var v = $(seg.dataset.video);
      if (!v) return;
      var rates = seg.dataset.video === 'v-overview' ? [0.75, 1, 1.25, 1.5] : [0.25, 0.5, 1];
      rates.forEach(function (r) {
        var el = document.createElement('button');
        el.type = 'button'; el.textContent = r + '×'; el.setAttribute('aria-pressed', r === 1);
        el.addEventListener('click', function () {
          v.playbackRate = r; v.dataset.rate = r;
          each(seg.children, function (c) { c.setAttribute('aria-pressed', c === el); });
        });
        seg.appendChild(el);
      });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !reduce) { var p = e.target.play(); if (p && p.catch) p.catch(function () {}); }
          else e.target.pause();
        });
      }, { threshold: 0.25 });
      io.observe($('v-band')); io.observe($('v-head'));
      if (S.public) io.observe($('v-show'));
    }
  }
  function setVideo(v, base) {
    if (v.dataset.base === base) return;
    v.dataset.base = base;
    v.pause(); v.removeAttribute('src');
    v.setAttribute('poster', base + '.webp');
    v.innerHTML = '<source src="' + base + '.mp4" type="video/mp4">' +
      (S.webm ? '<source src="' + base + '.webm" type="video/webm">' : '');
    var note = v.parentNode.parentNode.querySelector('.vnote[data-for="' + v.id + '"]');
    if (note) note.hidden = true;
    v.lastElementChild.addEventListener('error', function () {
      if (!note) {
        note = document.createElement('p'); note.className = 'vnote hint'; note.dataset.for = v.id;
        note.textContent = S.webm
          ? 'This viewer cannot play the video (H.264 or VP9). Open the page in Chrome, Firefox, Edge or Safari.'
          : 'This viewer cannot play the H.264 video. Open the page in Chrome, Firefox, Edge or Safari.';
        v.parentNode.parentNode.insertBefore(note, v.parentNode.nextSibling);
      }
      note.hidden = false;
    });
    v.load();
    v.addEventListener('loadedmetadata', function once() {
      v.removeEventListener('loadedmetadata', once); v.playbackRate = +(v.dataset.rate || 1);
      var r = v.getBoundingClientRect();
      if (!reduce && r.bottom > 0 && r.top < window.innerHeight) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }
  var held = false;
  function showRender() {
    var b = D.band[state.band], s = D.scenes[state.scene], badge = $('gt-badge');
    $('ex-render').src = held ? still('gt', state.view) : still(b.key, state.view);
    $('ex-cap').innerHTML = held ? 'Ground truth <span class="k">(release to return)</span>'
      : '<b>' + b.label + '</b> <span class="k num">&middot; ' + f2(s.psnr[b.key][state.view]) + ' dB on this view</span>';
    if (badge) {
      badge.textContent = held ? 'Showing Ground Truth' : 'Hold image to blink GT';
      badge.classList.toggle('active', held);
    }
  }
  function update(sceneChanged) {
    var s = D.scenes[state.scene], b = D.band[state.band];
    each(document.querySelectorAll('[data-scenes] button'), function (el) { el.setAttribute('aria-pressed', +el.dataset.i === state.scene); });
    each($('stops').children, function (el, i) { el.setAttribute('aria-pressed', i === state.band); });
    each($('views').children, function (el, i) { el.setAttribute('aria-pressed', i === state.view); });
    $('sel').setAttribute('cx', px(b.top)); $('sel').setAttribute('cy', py(b.psnr));
    $('kv-top').textContent = freq(b.top) + ' rot./patch';
    $('kv-psnr').textContent = f2(b.psnr) + ' dB';
    $('kv-sl').textContent = b.ssim.toFixed(3) + ' / ' + b.lpips.toFixed(3);
    showRender();
    $('ex-gt').src = still('gt', state.view);
    D.band.forEach(function (x) { new Image().src = still(x.key, state.view); });
    $('in0').src = 'media/still/' + s.id + '/in0.webp'; $('in1').src = 'media/still/' + s.id + '/in1.webp';
    var sign = function (v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1); };
    $('sceneline').innerHTML = 'Scene <span class="num">' + s.id + '</span>' + (s.note ? ' (' + s.note + ')' : '') +
      ' &middot; 243&times; vs. 3&times;: <span class="num">' + sign(s.gain_narrow) + ' dB (P' + Math.floor(s.pct_narrow) +
      ')</span> &middot; vs. 3<sup>11</sup>: <span class="num">' + sign(s.gain_wide) + ' dB (P' + Math.floor(s.pct_wide) + ')</span>';
    $('nframes').textContent = s.frames;
    $('head-stills').innerHTML = [['gt', 'Ground truth', '']].concat(D.head.map(function (h) { return [h.key, h.label, h.key]; })).map(function (x) {
      return '<div class="still"><img alt="' + x[1].replace(/&times;/g, 'x') + '" width="256" height="256" src="' + still(x[0], state.view) +
        '"><div class="c">' + x[1] + (x[2] ? ' <span class="k num">&middot; ' + f2(s.psnr[x[2]][state.view]) + ' dB</span>' : '') + '</div></div>';
    }).join('');
    if (sceneChanged) {
      setVideo($('v-band'), 'media/video/band47_' + s.id);
      setVideo($('v-head'), 'media/video/head25_' + s.id);
    }
  }

  /* ---------- start ---------- */
  buildHeader(); buildTeaser(); buildBars(); drawRank(); watchSeen();
  initFigures(); buildScenes(); buildChart(); buildStops(); buildVideos();

  addAnim('concept', $('p-concept'), { step: function (dt) { CA.t += dt; CA.f = conceptAt(CA.t); }, draw: drawConcept });
  $('r-concept').addEventListener('input', function () { CA.f = +this.value; setPlaying('concept', false); anims.concept.dirty = true; });

  RA.ds.forEach(function (d, i) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = d; b.setAttribute('aria-pressed', i === RA.idx);
    b.addEventListener('click', function () { setRule(i, true); });
    $('seg-rule').appendChild(b);
  });
  addAnim('rule', $('p-rule'), {
    step: function (dt) {
      if (RA.t < 1) RA.t = Math.min(1, RA.t + dt / 0.6);
      else { RA.hold += dt; if (RA.hold > 2.1) setRule((RA.idx + 1) % RA.ds.length, false); }
    }, draw: drawRule
  });

  [['box', 'Uniform interval'], ['gauss', 'Gaussian window']].forEach(function (m) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = m[1]; b.dataset.m = m[0];
    b.addEventListener('click', function () { setWhyMode(m[0]); });
    $('seg-why').appendChild(b);
  });
  setWhyMode('box');
  addAnim('why', $('p-why'), { step: function (dt) { WA.t += dt; WA.mt += dt; WA.logN = whyAt(WA.t); }, draw: drawWhy });
  $('r-why').addEventListener('input', function () { WA.logN = +this.value; setPlaying('why', false); anims.why.dirty = true; });

  each(document.querySelectorAll('.play[data-anim]'), function (b) {
    b.setAttribute('aria-pressed', !reduce);
    b.addEventListener('click', function () { setPlaying(b.dataset.anim, !anims[b.dataset.anim].playing); });
  });
  var redrawAll = function () { Object.keys(anims).forEach(function (k) { anims[k].dirty = true; }); drawRank(); };
  window.addEventListener('resize', redrawAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawAll);

  var r = $('ex-render');
  var down = function (e) { held = true; showRender(); e.preventDefault(); };
  var up = function () { if (held) { held = false; showRender(); } };
  r.addEventListener('mousedown', down); r.addEventListener('touchstart', down, { passive: false });
  window.addEventListener('mouseup', up); window.addEventListener('touchend', up); window.addEventListener('touchcancel', up);
  r.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  update(true);
  if (S.public) {
    $('cols-show').innerHTML = $('cols-band').innerHTML;
    setVideo($('v-show'), 'media/video/band47_' + D.scenes[0].id);
  }
  initNavSpy();
  window.requestAnimationFrame(tick);
})();
