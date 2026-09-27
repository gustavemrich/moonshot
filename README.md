# 🌙 MOONSHOT — free launchpad

A purple, heavily animated single-page launchpad. Upload an image, give it a
name, a ticker and your links, hit launch — the coin lands on the board.

## Run it

It's plain static HTML/CSS/JS, no build step:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Files

| File | What's in it |
| --- | --- |
| `index.html` | Public site: hero, ticker marquee, launch form + live preview, board, steps |
| `admin.html` | Admin panel — the launch queue |
| `styles.css` | Purple theme tokens and every animation, for both pages |
| `store.js` | Shared coin store: load/save, migration, URL and HTML escaping |
| `app.js` | Public site: starfield, reveals, counters, tilt, form, confetti |
| `admin.js` | Admin panel: filters, search, status toggles, export/import |
| `discord.js` | Discord webhook relay, shared by both pages |
| `api/launch.mjs` | Serverless function that posts to Discord from the server |

## Admin panel

`admin.html` (linked from the site footer) is the launch queue — every coin
submitted on the site, so you can launch them manually:

- **Totals** — submitted, awaiting launch, launched.
- **Search** by name or ticker (press `/` to focus), **filter** by status.
- **Copy details** puts name, ticker, description and links on the clipboard as
  plain text, ready to paste into whatever you launch with.
- **Image** downloads the uploaded artwork as a file.
- **Live link** records where the coin actually launched; it then shows up as a
  📈 Live link on the coin's card on the public site.
- **Mark launched / Mark pending** flips the status. This is what the site's
  "Coins launched" counter counts.
- **Export** to JSON (full, including images) or CSV (no images), **import**
  a JSON backup (skips coins that are already there), and **clear all**.

Coins submitted on the site start as `PENDING`. They only count as launched —
and only show a Live link — once you mark them so here.

> ⚠️ This panel has **no authentication**. It reads the same browser
> `localStorage` as the site, so it's a local workflow tool, not a protected
> admin area. Anything served publicly would need a real backend and auth.

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for Vercel. In short: import the repo, set a
`DISCORD_WEBHOOK_URL` environment variable, redeploy. Note that the coin board
stays per-visitor until the project gets a real database — DEPLOY.md spells out
what that means.

## Discord webhook

The admin panel can post coins into a Discord channel — name, ticker, image and
links, as a purple embed.

1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**, pick
   a channel, then **Copy Webhook URL**.
2. Paste it into the Discord card in the admin panel and hit **Save**.
   **Send test** confirms it works.
3. Post a coin with the **💬 Discord** button on its row, or tick
   **Auto-post every new submission** to fire on every launch from the site.

**Deployed on Vercel, this works differently and better.** If `/api/launch` is
present, the pages route through it instead, and the webhook comes from the
server's `DISCORD_WEBHOOK_URL` — so every visitor's submission is posted and the
URL is never exposed to browsers. The admin card then reads *"handled by the
server"* and hides the URL box. Running locally without the function, it falls
back to the browser-stored webhook described above.

The image is uploaded as a real file attachment (Discord can't render the
`data:` URLs coins are stored as). Posts use `allowed_mentions: {parse: []}`, so
text in a submission can never trigger an `@everyone` ping. Only genuine
`discord.com` webhook URLs are accepted, so a typo can't ship submissions to
someone else's server.

> ⚠️ The webhook URL is saved in `localStorage` (key `moonshot.webhook.v1`) and
> is never committed — but anything in the browser is readable by anyone with
> access to that machine, and a leaked webhook URL lets anyone post to your
> channel. Delete it in Discord if that happens. For a public deployment, a
> webhook belongs on a server, not in page JavaScript.

## Animations

Canvas starfield · drifting aurora blobs · scrolling perspective grid floor ·
orbiting moon with satellites and a flying rocket · masked line-rise headline ·
animated gradient text · scroll-triggered reveals · counting stats · ticker
marquee (pauses on hover) · pointer-tracked 3D card tilt · button shine and
pulse · animated sparklines · launch confetti burst · slide-in toast.

Every animation is disabled under `prefers-reduced-motion: reduce`.

## Notes

- Coins are saved to `localStorage` under `moonshot.coins.v1` — this is a
  front-end demo, there's no backend and no chain. The site and the admin panel
  share that one key, and each reflects the other's changes live (same tab via a
  custom event, across tabs via the `storage` event).
- Records are normalized on read, so coins saved by an earlier version still
  load instead of rendering as `undefined`.
- Uploaded images are downscaled to 256px and stored as WebP data URLs to keep
  within the localStorage quota; if the quota is hit you get a toast telling you
  to remove a coin.
- Link fields accept bare hosts (`x.com/you`) and get `https://` prepended;
  only `http(s)` URLs are rendered, and all user text is escaped before it's
  put in the DOM.
