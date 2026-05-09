# PawDesk Landing Page

Static marketing site for [PawDesk](https://pawdesk-landing.pages.dev) — scheduling, invoicing, and client notes for independent groomers and dog walkers.

## Pages

| File | URL | Purpose |
|------|-----|---------|
| `index.html` | `/` | Hero + features + testimonials + pricing teaser + waitlist form |
| `demo.html` | `/demo` | How it works — step-by-step walkthrough + CTA to live demo |
| `privacy.html` | `/privacy` | GDPR/CASL-compliant privacy policy |

## Tech stack

- Pure HTML + hand-rolled CSS (no framework, no build step)
- Vanilla JS for form submission
- Cloudflare Pages for hosting
- CF Pages Function for the waitlist endpoint (`/api/waitlist`)

## Local development

```bash
npm install
npm run dev      # wrangler pages dev on port 5173
```

Open `http://localhost:5173`.

## Deploy to Cloudflare Pages

### First deploy

```bash
npm run deploy
```

Or connect the GitHub repo in the CF Pages dashboard (no build command, output dir `.`).

### Environment variables to set in CF Pages

Go to **Pages > pawdesk-landing > Settings > Environment variables** and add:

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (Resend path) | Your Resend API key from resend.com |
| `RESEND_AUDIENCE_ID` | Yes (Resend path) | Audience ID from Resend dashboard |

If you don't have Resend set up, bind a KV namespace instead:

1. Create the namespace: `npx wrangler kv namespace create WAITLIST`
2. Uncomment the `[[kv_namespaces]]` block in `wrangler.toml` and paste the returned ID.
3. Bind it in CF Pages dashboard under **Functions > KV namespace bindings** with the name `WAITLIST`.

### Demo CTA link

The hero "Try the live demo →" button and all demo CTAs link to `https://demo.pawdesk.app`.
To update this URL, search for `demo.pawdesk.app` and replace with the actual deployed demo URL.

## Waitlist storage logic

`functions/api/waitlist.js` (CF Pages Function):

1. If `RESEND_AUDIENCE_ID` env var is set → adds contact to Resend Audience via API
2. Otherwise, if `WAITLIST` KV binding is present → stores JSON record in KV
3. If neither is configured → logs a warning, returns success (safe for preview deploys)

To view collected emails from KV:
```bash
npx wrangler kv key list --namespace-id YOUR_NAMESPACE_ID
npx wrangler kv key get "contact:email@example.com" --namespace-id YOUR_NAMESPACE_ID
```

## File structure

```
pawdesk-landing/
  index.html          Main landing page
  demo.html           How it works / demo walkthrough
  privacy.html        Privacy policy (GDPR + CASL)
  functions/
    api/
      waitlist.js     CF Pages Function — POST /api/waitlist
  css/
    style.css         Hand-rolled CSS (warm white, indigo-600, amber-500)
  js/
    waitlist.js       Client-side form handler
  public/
    favicon.svg       Paw print SVG icon
  wrangler.toml       CF Pages config
  package.json        Dev scripts (wrangler dev)
  manifest.json       Web app manifest
  README.md           This file
```
