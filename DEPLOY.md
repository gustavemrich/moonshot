# Deploying to Vercel

The site is plain HTML/CSS/JS with one serverless function. No build step.

## 1. Deploy

1. Go to **vercel.com** → sign in with GitHub → **Add New… → Project**
2. Import **gustavemrich/moonshot**
3. Under **Branch**, pick `claude/beautiful-hypatia-czpv73`
4. Leave every build setting empty — Vercel serves the files as-is and turns
   `api/launch.mjs` into a function at `/api/launch`
5. **Deploy**

## 2. Add the Discord webhook as a secret

In your new project: **Settings → Environment Variables**

| Name | Value |
| --- | --- |
| `DISCORD_WEBHOOK_URL` | the webhook URL you copied from Discord |

Add it for **Production**, **Preview** and **Development**, then go to
**Deployments → ⋯ → Redeploy** so the function picks it up.

Environment variables are only read on the server, so the webhook URL never
reaches a visitor's browser.

## 3. Check it

Open your `.vercel.app` URL and launch a coin. It should appear in your Discord
channel within a second or two.

In `/admin.html` the Discord card will read **"handled by the server"** and the
URL box disappears — that's how you know the deployed site is using the
function rather than a webhook stored in your browser.

### If nothing arrives

- `/api/launch` returning **503** means `DISCORD_WEBHOOK_URL` is missing or
  malformed on the server — check the variable, then redeploy.
- **400** means the submission was rejected (bad ticker, oversized image).
- **502** means Discord refused the post — usually a deleted webhook.

Check **Vercel → your project → Logs** to see which.

## What still does NOT work on a public site

Coins are saved in each visitor's own browser (`localStorage`). So on the
deployed site:

- the **board is per-visitor** — visitors do not see each other's coins
- your **admin panel only shows coins launched in your own browser**

Discord is the only shared record: every visitor's submission is posted to your
channel by the function above. That is enough if you treat the channel as the
queue.

To make the board and admin panel genuinely shared, the coins need a database
(Vercel Postgres, Vercel KV or similar) and the images need blob storage rather
than being inlined into each record. That is a larger change than this repo
currently makes.
