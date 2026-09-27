/* ── MOONSHOT · launchpad script ───────────────────────────── */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { load, esc, safeHref } = MoonStore;

  /* a coin shows PENDING for this long after it is submitted,
     then goes live on its own — no admin step needed */
  const PENDING_MS = 60 * 1000;
  const isLive = (coin) => Date.now() - Number(coin.at || 0) >= PENDING_MS;

  /* ── 1. starfield ──────────────────────────────────────── */
  const sky = $('#stars'), sctx = sky.getContext('2d');
  let stars = [], W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);

  function sizeSky() {
    W = sky.width = innerWidth * dpr;
    H = sky.height = innerHeight * dpr;
    const n = Math.round((innerWidth * innerHeight) / 7000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: (Math.random() * 1.4 + .25) * dpr,
      a: Math.random(), tw: Math.random() * .03 + .005,
      v: (Math.random() * .16 + .03) * dpr
    }));
  }
  function drawSky() {
    sctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.a += s.tw; if (s.a > 1 || s.a < .15) s.tw *= -1;
      s.y -= s.v; if (s.y < 0) { s.y = H; s.x = Math.random() * W; }
      sctx.beginPath();
      sctx.arc(s.x, s.y, s.r, 0, 6.283);
      sctx.fillStyle = `rgba(${220 + s.a * 35 | 0},${190 + s.a * 50 | 0},255,${s.a})`;
      sctx.fill();
    }
    requestAnimationFrame(drawSky);
  }
  function drawStatic() {
    sctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      sctx.beginPath();
      sctx.arc(s.x, s.y, s.r, 0, 6.283);
      sctx.fillStyle = `rgba(230,210,255,${s.a})`;
      sctx.fill();
    }
  }
  sizeSky();
  addEventListener('resize', () => { sizeSky(); if (reduce) drawStatic(); });
  if (reduce) drawStatic(); else drawSky();

  /* ── 2. reveal on scroll ───────────────────────────────── */
  const io = new IntersectionObserver((es) => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .14 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ── 3. counting stats ─────────────────────────────────── */
  const statLaunched = $('#stat-launched');
  const seedStat = () => {
    if (!statLaunched) return;
    const n = load().filter(isLive).length;
    statLaunched.dataset.to = n;
    if (statLaunched.dataset.done) statLaunched.textContent = n.toLocaleString();
  };
  seedStat();

  const cio = new IntersectionObserver((es) => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, to = +el.dataset.to, pre = el.dataset.prefix || '';
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = pre + Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString();
        if (p < 1) requestAnimationFrame(tick); else el.dataset.done = '1';
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .5 });
  $$('.count').forEach(el => cio.observe(el));

  /* ── 4. parallax + 3D tilt ─────────────────────────────── */
  if (!reduce) {
    addEventListener('scroll', () => {
      const y = scrollY;
      const orbit = $('.orbit');
      if (orbit) orbit.style.transform = `translateY(${y * -0.08}px) rotate(${y * .01}deg)`;
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
      $$('.tilt').forEach(card => {
        const b = card.getBoundingClientRect();
        if (b.bottom < 0 || b.top > innerHeight) return;
        const dx = (e.clientX - (b.left + b.width / 2)) / b.width;
        const dy = (e.clientY - (b.top + b.height / 2)) / b.height;
        card.style.transform = `perspective(700px) rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg)`;
      });
    });
  }

  /* ── 5. sparkline stagger ──────────────────────────────── */
  const stagger = (root = document) =>
    $$('.spark i', root).forEach((b, i) => b.style.setProperty('--i', i % 12));
  stagger();

  /* ── 6. launch form ────────────────────────────────────── */
  const form = $('#launch-form'), drop = $('#drop'), file = $('#image'), preview = $('#preview');
  const nameI = $('#name'), tickI = $('#ticker'), descI = $('#desc');
  const pv = { img: $('#pv-img'), name: $('#pv-name'), tick: $('#pv-ticker'), desc: $('#pv-desc') };
  let imageData = '';

  /* image → downscaled data URL (keeps localStorage small) */
  const MAX = 256;
  function readImage(f) {
    if (!f || !f.type.startsWith('image/')) return toast('That file is not an image 😅');
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { imageData = c.toDataURL('image/webp', .85); }
        catch { imageData = fr.result; }
        showImage(imageData);
      };
      img.onerror = () => { imageData = fr.result; showImage(imageData); };
      img.src = fr.result;
    };
    fr.readAsDataURL(f);
  }
  function showImage(src) {
    preview.src = src; preview.hidden = false;
    drop.classList.add('has-img');
    $('.drop-empty', drop).style.display = 'none';
    pv.img.innerHTML = `<img src="${src}" alt="" />`;
  }

  drop.addEventListener('click', () => file.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  file.addEventListener('change', () => readImage(file.files[0]));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => readImage(e.dataTransfer.files[0]));

  /* live preview */
  const linkFields = [['#link-site', '🌐', 'Website'], ['#link-x', '𝕏', 'X'], ['#link-tg', '✈️', 'Telegram']];

  function currentLinks() {
    return linkFields.map(([sel, icon, label]) => {
      const href = safeHref($(sel).value);
      return href ? { href, icon, label } : null;
    }).filter(Boolean);
  }
  function syncPreview() {
    pv.name.textContent = nameI.value.trim() || 'Your Coin';
    pv.tick.textContent = '$' + (tickI.value.trim().toUpperCase() || 'TICKER');
    pv.desc.textContent = descI.value.trim() || 'Your description shows up right here.';
    $('#desc-count').textContent = descI.value.length;
  }
  form.addEventListener('input', syncPreview);
  tickI.addEventListener('input', () => { tickI.value = tickI.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); });
  syncPreview();

  /* ── 7. storage + board ────────────────────────────────── */
  const save = (list) => {
    const ok = MoonStore.save(list);
    if (!ok) toast('Storage full — remove a coin first');
    return ok;
  };

  const grid = $('#coin-grid'), emptyState = $('#empty-state');

  function coinNode(coin) {
    const el = document.createElement('article');
    el.className = 'coin';
    el.innerHTML = `
      <button class="del" type="button" title="Remove" aria-label="Remove ${esc(coin.name)}">×</button>
      <div class="coin-top">
        <div class="coin-img">${coin.image ? `<img src="${esc(coin.image)}" alt="" />` : '<span>🌙</span>'}</div>
        <div><h3>${esc(coin.name)}</h3><p class="tick">$${esc(coin.ticker)}</p></div>
        <span class="badge"></span>
      </div>
      ${coin.desc ? `<p class="coin-desc">${esc(coin.desc)}</p>` : ''}
      <div class="spark" aria-hidden="true">${'<i></i>'.repeat(12)}</div>`;
    el.dataset.at = coin.at;
    paintBadge(el);
    stagger(el);
    $('.del', el).addEventListener('click', () => {
      const list = load().filter(c => c.id !== coin.id);
      if (save(list)) { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = 0; el.style.transform = 'scale(.9)'; setTimeout(render, 280); }
    });
    return el;
  }
  /* PENDING 0:42 → LIVE, ticked once a second */
  function paintBadge(el) {
    const badge = $('.badge', el);
    if (!badge) return false;
    const left = PENDING_MS - (Date.now() - Number(el.dataset.at || 0));

    if (left <= 0) {
      if (!badge.classList.contains('is-live')) {
        badge.className = 'badge is-live just-live';
        badge.textContent = 'LIVE';
        el.classList.remove('is-waiting');
        seedStat();
        setTimeout(() => badge.classList.remove('just-live'), 900);
      }
      return false;
    }
    const secs = Math.ceil(left / 1000);
    badge.className = 'badge is-pending';
    badge.textContent = `PENDING ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    el.classList.add('is-waiting');
    return true;
  }

  setInterval(() => { $$('#coin-grid .coin').forEach(paintBadge); }, 1000);

  function render() {
    const list = load();
    grid.innerHTML = '';
    list.forEach((c, i) => {
      const n = coinNode(c);
      n.style.animationDelay = `${Math.min(i, 8) * 60}ms`;
      grid.appendChild(n);
    });
    emptyState.hidden = list.length > 0;
  }
  render();
  MoonStore.onChange(() => { render(); seedStat(); });

  /* ── 8. submit ─────────────────────────────────────────── */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameI.value.trim(), ticker = tickI.value.trim().toUpperCase();
    let ok = true;
    const fail = (input, msg) => { ok = false; $(`.hint[data-for="${input.id}"]`).textContent = msg; shake(input); };
    $$('.hint').forEach(h => h.textContent = '');
    if (name.length < 2) fail(nameI, 'Give it a name (2+ characters).');
    if (ticker.length < 2) fail(tickI, 'Tickers need 2+ characters.');
    if (!ok) return;

    const btn = $('.btn-launch');
    btn.classList.add('loading'); btn.disabled = true;

    setTimeout(() => {
      const list = load();
      list.unshift({
        id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
        name, ticker, desc: descI.value.trim(), image: imageData,
        links: currentLinks().map(({ href, icon, label }) => ({ href, icon, label })),
        at: Date.now(), status: 'pending', launchUrl: '', launchedAt: 0
      });
      const stored = save(list);
      btn.classList.remove('loading'); btn.disabled = false;
      if (!stored) return;

      seedStat();
      liftOff();

      /* fire-and-forget: a webhook problem must never block a launch */
      if (window.MoonDiscord) {
        MoonDiscord.autoSend(load()[0]).catch(() => toast('Coin saved, but Discord post failed'));
      }
      toast(`🚀 $${ticker} launched — free, as promised!`);
      form.reset(); imageData = '';
      preview.hidden = true; drop.classList.remove('has-img');
      $('.drop-empty', drop).style.display = '';
      pv.img.innerHTML = '<span>🌙</span>';
      syncPreview();
      $('#board').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }, reduce ? 0 : 900);
  });

  function shake(el) {
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }],
      { duration: 260, iterations: 2 }
    );
  }

  /* ── 8b. contract address ──────────────────────────────── */
  const caBtn = $('#ca-copy'), caBar = $('.ca-bar');
  if (caBtn && caBar) {
    const copyCA = async () => {
      const addr = caBtn.dataset.ca || '';
      if (!addr) return;
      try {
        await navigator.clipboard.writeText(addr);
        caBar.classList.add('copied');
        toast('Contract address copied');
        setTimeout(() => caBar.classList.remove('copied'), 1600);
      } catch {
        /* clipboard can be blocked; select the text so it can be copied by hand */
        const r = document.createRange();
        r.selectNodeContents($('#ca-text'));
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        toast('Copy blocked — the address is selected, press Ctrl+C');
      }
    };
    caBtn.addEventListener('click', copyCA);
    $('#ca-text').addEventListener('click', copyCA);
  }

  /* ── 9. toast ──────────────────────────────────────────── */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 3600);
  }

  /* ── 10. confetti liftoff ──────────────────────────────── */
  const cvs = $('#confetti'), cctx = cvs.getContext('2d');
  let bits = [], raf = 0;
  const COLORS = ['#c084fc', '#f0abfc', '#8b5cf6', '#e9d5ff', '#7dffc3', '#a5b4fc'];

  function liftOff() {
    if (reduce) return;
    cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr;
    bits = Array.from({ length: 160 }, () => ({
      x: (innerWidth / 2 + (Math.random() - .5) * 220) * dpr,
      y: innerHeight * dpr,
      vx: (Math.random() - .5) * 11 * dpr,
      vy: -(Math.random() * 17 + 9) * dpr,
      s: (Math.random() * 6 + 3) * dpr,
      rot: Math.random() * 6.283, vr: (Math.random() - .5) * .3,
      c: COLORS[Math.random() * COLORS.length | 0], life: 1
    }));
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(burst);
  }
  function burst() {
    cctx.clearRect(0, 0, cvs.width, cvs.height);
    let alive = false;
    for (const b of bits) {
      b.vy += .32 * dpr; b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.life -= .008;
      if (b.life <= 0) continue;
      alive = true;
      cctx.save();
      cctx.translate(b.x, b.y); cctx.rotate(b.rot);
      cctx.globalAlpha = Math.max(0, b.life);
      cctx.fillStyle = b.c;
      cctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 1.6);
      cctx.restore();
    }
    if (alive) raf = requestAnimationFrame(burst);
    else cctx.clearRect(0, 0, cvs.width, cvs.height);
  }
})();
