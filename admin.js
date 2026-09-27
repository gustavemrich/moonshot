/* ── MOONSHOT · admin panel ────────────────────────────────── */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { load, update, remove, counts, esc, safeHref, fmtDate } = MoonStore;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── starfield (same as the site, calmer) ──────────────── */
  const sky = $('#stars'), sctx = sky.getContext('2d');
  let stars = [], W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  function sizeSky() {
    W = sky.width = innerWidth * dpr; H = sky.height = innerHeight * dpr;
    stars = Array.from({ length: Math.round(innerWidth * innerHeight / 11000) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.2 + .25) * dpr,
      a: Math.random(), tw: Math.random() * .02 + .004
    }));
  }
  function drawSky() {
    sctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      if (!reduce) { s.a += s.tw; if (s.a > 1 || s.a < .15) s.tw *= -1; }
      sctx.beginPath(); sctx.arc(s.x, s.y, s.r, 0, 6.283);
      sctx.fillStyle = `rgba(225,205,255,${s.a})`; sctx.fill();
    }
    if (!reduce) requestAnimationFrame(drawSky);
  }
  sizeSky(); drawSky();
  addEventListener('resize', () => { sizeSky(); if (reduce) drawSky(); });

  $$('.reveal').forEach((el, i) => setTimeout(() => el.classList.add('in'), 60 * i));

  /* ── toast ─────────────────────────────────────────────── */
  let tT;
  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(tT); tT = setTimeout(() => t.classList.remove('show'), 3200);
  };

  /* ── state ─────────────────────────────────────────────── */
  let filter = 'all', query = '';

  const visible = () => load().filter(c => {
    const okF = filter === 'all' || (filter === 'launched' ? c.status === 'launched' : c.status !== 'launched');
    const q = query.trim().toLowerCase();
    return okF && (!q || c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q));
  });

  /* ── one row ───────────────────────────────────────────── */
  function row(c) {
    const live = c.status === 'launched';
    const el = document.createElement('article');
    el.className = 'card acoin' + (live ? ' is-live' : '');
    el.innerHTML = `
      <div class="acoin-main">
        <div class="acoin-img">${c.image ? `<img src="${esc(c.image)}" alt="" />` : '<span>🌙</span>'}</div>
        <div class="acoin-id">
          <h3>${esc(c.name)} <span class="tick">$${esc(c.ticker)}</span></h3>
          <p class="meta">Submitted ${esc(fmtDate(c.at))}${live && c.launchedAt ? ` · launched ${esc(fmtDate(c.launchedAt))}` : ''}</p>
          ${c.desc ? `<p class="acoin-desc">${esc(c.desc)}</p>` : '<p class="acoin-desc dim">No description</p>'}
          <div class="acoin-links">${c.links.length
            ? c.links.map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.icon)} ${esc(l.label)}</a>`).join('')
            : '<span class="dim">No links</span>'}</div>
        </div>
        <span class="badge ${live ? 'is-live' : 'is-pending'}">${live ? 'LIVE' : 'PENDING'}</span>
      </div>

      <div class="acoin-actions">
        <button class="btn btn-ghost sm" data-act="copy" type="button">📋 Copy details</button>
        <button class="btn btn-ghost sm" data-act="img" type="button" ${c.image ? '' : 'disabled'}>🖼️ Image</button>
        <button class="btn btn-ghost sm" data-act="discord" type="button">💬 Discord</button>
        <label class="launch-url">
          <span>Live link</span>
          <input type="url" data-act="url" value="${esc(c.launchUrl)}" placeholder="https://dex…/${esc(c.ticker)}" />
        </label>
        <button class="btn ${live ? 'btn-ghost' : 'btn-primary'} sm" data-act="toggle" type="button">
          ${live ? '↩ Mark pending' : '🚀 Mark launched'}
        </button>
        <button class="btn btn-ghost sm danger" data-act="del" type="button" aria-label="Delete ${esc(c.name)}">🗑</button>
      </div>`;

    const act = (name) => $(`[data-act="${name}"]`, el);

    act('copy').addEventListener('click', async () => {
      const text = [
        `Name: ${c.name}`, `Ticker: $${c.ticker}`,
        c.desc ? `Description: ${c.desc}` : null,
        ...c.links.map(l => `${l.label}: ${l.href}`),
        `Submitted: ${fmtDate(c.at)}`
      ].filter(Boolean).join('\n');
      try { await navigator.clipboard.writeText(text); toast(`Copied $${c.ticker} details`); }
      catch { toast('Clipboard blocked — select the text manually'); }
    });

    if (c.image) act('img').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = c.image;
      a.download = `${c.ticker.toLowerCase() || 'coin'}.${(c.image.match(/^data:image\/(\w+)/) || [, 'png'])[1]}`;
      a.click();
      toast('Image downloaded');
    });

    const urlInput = act('url');
    const commitUrl = () => {
      const v = urlInput.value.trim();
      const href = v ? safeHref(v) : '';
      if (v && !href) return toast('That link needs to be a http(s) URL');
      if (href !== c.launchUrl) { update(c.id, { launchUrl: href }); toast('Live link saved'); }
    };
    urlInput.addEventListener('blur', commitUrl);
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); urlInput.blur(); } });

    act('toggle').addEventListener('click', () => {
      const next = live ? 'pending' : 'launched';
      update(c.id, { status: next, launchedAt: next === 'launched' ? Date.now() : 0 });
      toast(next === 'launched' ? `🚀 $${c.ticker} marked live` : `$${c.ticker} back in the queue`);
    });

    const dBtn = act('discord');
    dBtn.addEventListener('click', async () => {
      if (!MoonDiscord.configured()) return toast('Add a Discord webhook URL above first');
      dBtn.disabled = true; dBtn.textContent = '💬 Sending…';
      try { await MoonDiscord.send(c); toast(`Posted $${c.ticker} to Discord`); }
      catch (err) { toast(err.message || 'Could not reach Discord'); }
      finally { dBtn.disabled = false; dBtn.textContent = '💬 Discord'; }
    });

    act('del').addEventListener('click', () => {
      if (!confirm(`Delete ${c.name} ($${c.ticker})? This cannot be undone.`)) return;
      remove(c.id); toast(`Deleted $${c.ticker}`);
    });

    return el;
  }

  /* ── render ────────────────────────────────────────────── */
  const list = $('#list');
  function render() {
    const { total, pending, launched } = counts();
    $('#s-total').textContent = total;
    $('#s-pending').textContent = pending;
    $('#s-launched').textContent = launched;

    const rows = visible();
    list.innerHTML = '';
    rows.forEach((c, i) => {
      const n = row(c);
      n.style.animationDelay = `${Math.min(i, 10) * 45}ms`;
      list.appendChild(n);
    });
    const none = rows.length === 0;
    $('#admin-empty').hidden = !none;
    $('#admin-empty').innerHTML = total === 0
      ? 'Nothing here yet — <a href="index.html#launch">launch a coin on the site</a>.'
      : 'No coins match this filter.';
  }
  render();
  MoonStore.onChange(render);

  /* ── filters + search ──────────────────────────────────── */
  $$('.chip').forEach(b => b.addEventListener('click', () => {
    $$('.chip').forEach(x => x.classList.remove('is-on'));
    b.classList.add('is-on'); filter = b.dataset.filter; render();
  }));
  const q = $('#q');
  q.addEventListener('input', () => { query = q.value; render(); });
  addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
  });

  /* ── export / import / clear ───────────────────────────── */
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);

  $('#export-json').addEventListener('click', () => {
    const l = load();
    if (!l.length) return toast('Nothing to export');
    download(`moonshot-${stamp()}.json`, JSON.stringify(l, null, 2), 'application/json');
    toast(`Exported ${l.length} coin${l.length > 1 ? 's' : ''}`);
  });

  $('#export-csv').addEventListener('click', () => {
    const l = load();
    if (!l.length) return toast('Nothing to export');
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      ['name', 'ticker', 'description', 'links', 'status', 'live_url', 'submitted'].join(','),
      ...l.map(c => [c.name, c.ticker, c.desc, c.links.map(x => x.href).join(' | '),
        c.status, c.launchUrl, new Date(c.at).toISOString()].map(cell).join(','))
    ].join('\n');
    download(`moonshot-${stamp()}.csv`, csv, 'text/csv');
    toast('CSV exported (images not included)');
  });

  const fileIn = $('#import-file');
  $('#import').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => {
    const f = fileIn.files[0]; if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      let incoming;
      try { incoming = JSON.parse(fr.result); }
      catch { return toast("That file isn't valid JSON"); }
      if (!Array.isArray(incoming)) return toast('Expected a JSON array of coins');

      const current = load();
      const seen = new Set(current.map(c => c.id));
      const added = incoming.map(MoonStore.migrate).filter(c => !seen.has(c.id));
      if (!added.length) return toast('No new coins in that file');
      if (!MoonStore.save([...added, ...current].sort((a, b) => b.at - a.at)))
        return toast('Storage full — clear some coins first');
      toast(`Imported ${added.length} coin${added.length > 1 ? 's' : ''}`);
    };
    fr.readAsText(f);
    fileIn.value = '';
  });

  /* ── discord webhook settings ──────────────────────────── */
  const hookUrl = $('#hook-url'), hookAuto = $('#hook-auto'), hookState = $('#hook-state');

  function paintHook() {
    const { url, auto } = MoonDiscord.loadCfg();
    hookUrl.value = url;
    hookAuto.checked = auto;
    const ok = MoonDiscord.isValid(url);
    hookState.textContent = ok ? (auto ? 'connected · auto-posting' : 'connected') : 'not set';
    hookState.className = 'hook-state' + (ok ? ' is-on' : '');
  }
  paintHook();

  $('#hook-save').addEventListener('click', () => {
    const url = hookUrl.value.trim();
    if (url && !MoonDiscord.isValid(url))
      return toast("That doesn't look like a Discord webhook URL");
    MoonDiscord.saveCfg({ url, auto: hookAuto.checked });
    paintHook();
    toast(url ? 'Webhook saved' : 'Webhook cleared');
  });

  $('#hook-show').addEventListener('click', () => {
    hookUrl.type = hookUrl.type === 'password' ? 'text' : 'password';
  });

  hookAuto.addEventListener('change', () => {
    const cfg = MoonDiscord.loadCfg();
    MoonDiscord.saveCfg({ ...cfg, auto: hookAuto.checked });
    paintHook();
    toast(hookAuto.checked ? 'Auto-posting on' : 'Auto-posting off');
  });

  $('#hook-clear').addEventListener('click', () => {
    MoonDiscord.saveCfg({ url: '', auto: false });
    paintHook();
    toast('Webhook forgotten');
  });

  $('#hook-test').addEventListener('click', async (e) => {
    if (!MoonDiscord.configured()) return toast('Save a valid webhook URL first');
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await MoonDiscord.send({
        name: 'Test Coin', ticker: 'TEST', desc: 'If you can read this, the webhook works. 🌙',
        links: [{ href: 'https://example.com', icon: '🌐', label: 'Website' }],
        image: '', at: Date.now(), status: 'pending', launchUrl: ''
      });
      toast('Test posted — check your channel');
    } catch (err) { toast(err.message || 'Could not reach Discord'); }
    finally { btn.disabled = false; }
  });

  $('#clear').addEventListener('click', () => {
    const n = counts().total;
    if (!n) return toast('Already empty');
    if (!confirm(`Delete all ${n} coins? Export first if you want a backup.`)) return;
    MoonStore.save([]); toast('Cleared');
  });
})();
