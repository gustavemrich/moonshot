/* ── Vercel serverless function: POST /api/launch ──────────────
   Relays a submission to Discord from the server, so the webhook
   URL stays in an env var instead of in public page source.      */

const WEBHOOK_RE = /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d{10,}\/[\w-]{20,}$/;
const IMAGE_RE = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const clip = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

const httpUrl = (v) => {
  try { const u = new URL(String(v)); return /^https?:$/.test(u.protocol) ? u.href : ''; }
  catch { return ''; }
};

/* Vercel parses JSON bodies, but read the stream too so this stays
   runnable under a plain Node server (and in tests). */
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

function validate(body) {
  if (!body || typeof body !== 'object') return { error: 'Expected a JSON body' };

  const name = String(body.name ?? '').trim();
  const ticker = String(body.ticker ?? '').trim().toUpperCase();
  if (name.length < 2 || name.length > 32) return { error: 'Name must be 2–32 characters' };
  if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return { error: 'Ticker must be 2–10 letters or digits' };

  const desc = clip(String(body.desc ?? '').trim(), 240);

  const links = (Array.isArray(body.links) ? body.links : [])
    .slice(0, 5)
    .map(l => ({ label: clip(String(l?.label ?? 'Link'), 40), href: httpUrl(l?.href) }))
    .filter(l => l.href);

  let image = null;
  if (body.image) {
    const m = IMAGE_RE.exec(String(body.image));
    if (!m) return { error: 'Image must be a base64 data URL (png, jpeg, webp, gif or svg)' };
    const buf = Buffer.from(m[2], 'base64');
    if (buf.byteLength > MAX_IMAGE_BYTES) return { error: 'Image is larger than 2MB' };
    const ext = m[1] === 'svg+xml' ? 'svg' : (m[1] === 'jpeg' ? 'jpg' : m[1]);
    image = { buf, mime: `image/${m[1]}`, name: `${ticker.toLowerCase()}.${ext}` };
  }

  return { coin: { name, ticker, desc, links, image } };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    /* a 405 (rather than 404) is how the page detects the relay exists */
    return res.status(405).json({ error: 'Use POST' });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook || !WEBHOOK_RE.test(webhook.trim())) {
    return res.status(503).json({
      error: 'Server is missing a valid DISCORD_WEBHOOK_URL environment variable'
    });
  }

  const { error, coin } = validate(await readBody(req));
  if (error) return res.status(400).json({ error });

  const linkLine = coin.links.map(l => `[${l.label}](${l.href})`).join(' · ');
  const payload = {
    username: 'Moonshot',
    content: `🌙 New submission: **$${coin.ticker}**`,
    embeds: [{
      title: clip(`${coin.name} ($${coin.ticker})`, 256),
      url: coin.links[0]?.href || undefined,
      description: coin.desc || undefined,
      color: 0xC084FC,
      fields: linkLine ? [{ name: 'Links', value: clip(linkLine, 1024) }] : [],
      image: coin.image ? { url: `attachment://${coin.image.name}` } : undefined,
      footer: { text: 'Moonshot launchpad' },
      timestamp: new Date().toISOString()
    }],
    allowed_mentions: { parse: [] }   // submitted text can never ping the server
  };

  let out;
  try {
    if (coin.image) {
      const fd = new FormData();
      fd.append('payload_json', JSON.stringify(payload));
      fd.append('files[0]', new Blob([coin.image.buf], { type: coin.image.mime }), coin.image.name);
      out = await fetch(webhook.trim(), { method: 'POST', body: fd });
    } else {
      out = await fetch(webhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  } catch {
    return res.status(502).json({ error: 'Could not reach Discord' });
  }

  if (out.status === 429) {
    let retry;
    try { retry = (await out.json()).retry_after; } catch {}
    res.setHeader('Retry-After', String(Math.ceil(retry || 1)));
    return res.status(429).json({ error: 'Discord rate limited this webhook', retry_after: retry });
  }
  if (!out.ok) {
    /* never echo Discord's body back — it can contain the webhook token */
    return res.status(502).json({ error: `Discord rejected the post (${out.status})` });
  }
  return res.status(200).json({ ok: true });
}
