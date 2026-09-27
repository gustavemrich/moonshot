/* ── MOONSHOT · shared coin store ──────────────────────────── */
window.MoonStore = (() => {
  'use strict';
  const KEY = 'moonshot.coins.v1';
  const EVT = 'moonshot:change';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const normalize = (v) => {
    v = String(v ?? '').trim();
    return !v ? '' : (/^https?:\/\//i.test(v) ? v : 'https://' + v.replace(/^\/+/, ''));
  };
  const safeHref = (v) => {
    const u = normalize(v);
    try { const p = new URL(u); return /^https?:$/.test(p.protocol) ? p.href : ''; }
    catch { return ''; }
  };

  /* every coin read from storage passes through here, so older
     records (pre-status) stay valid instead of rendering as undefined */
  const migrate = (c = {}) => ({
    id: c.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    name: String(c.name ?? 'Untitled'),
    ticker: String(c.ticker ?? '???').toUpperCase(),
    desc: String(c.desc ?? ''),
    image: typeof c.image === 'string' ? c.image : '',
    links: Array.isArray(c.links)
      ? c.links.filter(l => l && safeHref(l.href)).map(l => ({
          href: safeHref(l.href), icon: String(l.icon ?? '🔗'), label: String(l.label ?? 'Link')
        }))
      : [],
    at: Number(c.at) || Date.now(),
    status: c.status === 'launched' ? 'launched' : 'pending',
    launchUrl: safeHref(c.launchUrl || ''),
    launchedAt: Number(c.launchedAt) || 0
  });

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(raw) ? raw.map(migrate) : [];
    } catch { return []; }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      dispatchEvent(new CustomEvent(EVT, { detail: { list } }));
      return true;
    } catch { return false; }
  }

  const update = (id, patch) =>
    save(load().map(c => (c.id === id ? migrate({ ...c, ...patch }) : c)));

  const remove = (id) => save(load().filter(c => c.id !== id));

  const counts = () => {
    const l = load();
    return {
      total: l.length,
      launched: l.filter(c => c.status === 'launched').length,
      pending: l.filter(c => c.status !== 'launched').length
    };
  };

  /* fires for same-tab writes (CustomEvent) and other tabs (storage) */
  function onChange(fn) {
    addEventListener(EVT, fn);
    addEventListener('storage', e => { if (e.key === KEY) fn(e); });
  }

  const fmtDate = (ts) => new Date(ts).toLocaleString(undefined,
    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return { KEY, load, save, update, remove, counts, onChange, esc, safeHref, normalize, fmtDate, migrate };
})();
