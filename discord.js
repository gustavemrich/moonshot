/* ── MOONSHOT · Discord webhook relay ──────────────────────── */
window.MoonDiscord = (() => {
  'use strict';
  const KEY = 'moonshot.webhook.v1';

  /* only real Discord webhook endpoints — stops a typo'd or hostile
     URL quietly shipping submissions to somebody else's server */
  const RE = /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d{10,}\/[\w-]{20,}$/;
  const isValid = (u) => RE.test(String(u ?? '').trim());

  const loadCfg = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY)) || {};
      return { url: typeof c.url === 'string' ? c.url : '', auto: c.auto === true };
    } catch { return { url: '', auto: false }; }
  };
  const saveCfg = (cfg) => {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); return true; } catch { return false; }
  };
  const configured = () => isValid(loadCfg().url);

  const clip = (s, n) => {
    s = String(s ?? '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  /* data URL → Blob, so the stored image can ride along as a real file */
  function dataUrlToBlob(dataUrl) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl || '');
    if (!m) return null;
    const [, mime, b64, body] = m;
    try {
      if (b64) {
        const bin = atob(body);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime });
      }
      return new Blob([decodeURIComponent(body)], { type: mime });
    } catch { return null; }
  }

  const extFor = (mime) => ({
    'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg',
    'image/gif': 'gif', 'image/svg+xml': 'svg'
  }[mime] || 'png');

  function buildEmbed(coin, filename) {
    const live = coin.status === 'launched';
    const linkLine = (coin.links || [])
      .map(l => `[${clip(l.label, 40)}](${l.href})`).join(' · ');

    const fields = [];
    if (linkLine) fields.push({ name: 'Links', value: clip(linkLine, 1024) });
    if (coin.launchUrl) fields.push({ name: 'Live at', value: clip(coin.launchUrl, 1024) });
    fields.push({ name: 'Status', value: live ? '🟢 Launched' : '🟡 Awaiting launch', inline: true });

    return {
      title: clip(`${coin.name} ($${coin.ticker})`, 256),
      url: coin.launchUrl || (coin.links?.[0]?.href) || undefined,
      description: coin.desc ? clip(coin.desc, 4096) : undefined,
      color: live ? 0x7DFFC3 : 0xC084FC,
      fields,
      image: filename ? { url: `attachment://${filename}` } : undefined,
      footer: { text: 'Moonshot launchpad' },
      timestamp: new Date(coin.at || Date.now()).toISOString()
    };
  }

  /* posts one coin; image (if any) goes as a multipart attachment,
     since Discord can't render a data: URL */
  async function send(coin) {
    const { url } = loadCfg();
    if (!isValid(url)) throw new Error('Set a valid Discord webhook URL first');

    const blob = coin.image ? dataUrlToBlob(coin.image) : null;
    const filename = blob
      ? `${(coin.ticker || 'coin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'coin'}.${extFor(blob.type)}`
      : '';

    const payload = {
      username: 'Moonshot',
      content: coin.status === 'launched'
        ? `🚀 **$${coin.ticker}** is live!`
        : `🌙 New submission: **$${coin.ticker}**`,
      embeds: [buildEmbed(coin, filename)],
      allowed_mentions: { parse: [] }   // never ping @everyone from user text
    };

    let res;
    try {
      if (blob) {
        const fd = new FormData();
        fd.append('payload_json', JSON.stringify(payload));
        fd.append('files[0]', blob, filename);
        res = await fetch(url, { method: 'POST', body: fd });
      } else {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch {
      /* fetch only rejects on network-level failure, never on an HTTP error */
      throw new Error("Couldn't reach Discord — check your connection, or whether the webhook was deleted");
    }

    if (res.status === 429) {
      let wait = '';
      try { wait = ` Retry in ${(await res.clone().json()).retry_after}s.`; } catch {}
      throw new Error('Discord rate limited the webhook.' + wait);
    }
    if (!res.ok) {
      let detail = '';
      try { detail = ' — ' + clip((await res.text()) || '', 160); } catch {}
      throw new Error(`Discord returned ${res.status}${detail}`);
    }
    return true;
  }

  return { KEY, loadCfg, saveCfg, isValid, configured, send, buildEmbed, dataUrlToBlob };
})();
