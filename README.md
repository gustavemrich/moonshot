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
| `index.html` | Markup: hero, ticker marquee, launch form + live preview, board, steps |
| `styles.css` | Purple theme tokens and every animation |
| `app.js` | Starfield, scroll reveals, counters, tilt, form, storage, confetti |

## Animations

Canvas starfield · drifting aurora blobs · scrolling perspective grid floor ·
orbiting moon with satellites and a flying rocket · masked line-rise headline ·
animated gradient text · scroll-triggered reveals · counting stats · ticker
marquee (pauses on hover) · pointer-tracked 3D card tilt · button shine and
pulse · animated sparklines · launch confetti burst · slide-in toast.

Every animation is disabled under `prefers-reduced-motion: reduce`.

## Notes

- Coins are saved to `localStorage` under `moonshot.coins.v1` — this is a
  front-end demo, there's no backend and no chain.
- Uploaded images are downscaled to 256px and stored as WebP data URLs to keep
  within the localStorage quota; if the quota is hit you get a toast telling you
  to remove a coin.
- Link fields accept bare hosts (`x.com/you`) and get `https://` prepended;
  only `http(s)` URLs are rendered, and all user text is escaped before it's
  put in the DOM.
