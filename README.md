# Wedding invite (single-page) — GitHub Pages

A static, mobile-first wedding invite website with:
- Venues + maps
- RSVP form (client-side demo)

## 1) Edit content
Update these placeholders:
- `index.html`: couple/date + dress code + FAQ text + deadline/contact
- `app.js`: `state.venues[]` and optional `coords` for embedded maps

## 2) Deploy to GitHub Pages
In your GitHub repo (example: `wedding-invite`):
1. Commit/push `index.html`, `styles.css`, and `app.js` to the repo root.
2. GitHub → Settings → Pages → Source:
   - deploy from `main` branch
   - `/` (root)

Then set your domain `wedding.metcarob.com` to point at GitHub Pages.

## 3) RSVP delivery options
Right now, RSVPs are saved to the guest’s browser (localStorage).

To deliver RSVPs to you automatically, tell me which you prefer:
- Formspree
- Google Forms
- Cloudflare/Netlify forms (serverless endpoint)
- A simple `mailto:` flow

…and I’ll wire the “Submit RSVP” button accordingly.
