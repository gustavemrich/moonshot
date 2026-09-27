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
