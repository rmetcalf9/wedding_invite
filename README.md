# Wedding invitation website

A responsive, single-page wedding invitation site built with plain HTML, CSS and JavaScript. It is suitable for GitHub Pages and requires no build step.

## Preview locally

Open `index.html` in a browser, or run a local static server from this folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Personalise it

Edit `index.html` and replace the sample content:

- `Alex & Jamie` — names and page title
- `12 June 2027` — wedding date and RSVP deadline
- Ceremony and reception names, addresses, times and map links
- Story text, travel information and accommodation
- Image URLs — replace the Unsplash images with your own photographs if available
- `data-email="hello@example.com"` — set this to the email address that should receive RSVP messages

The design uses Google Fonts and remote Unsplash images, so those assets require an internet connection. You can download and host your own images in the repository if you prefer.

## RSVP form note

GitHub Pages only hosts static files; it cannot receive or store form submissions by itself. The included form currently opens the visitor's email application with a pre-filled RSVP message. Change `data-email` to the correct address.

For a proper online form (without requiring guests to have an email application configured), create a form with a service such as Formspree, then connect its endpoint in `script.js` using `fetch` or set the form's `action` and `method` as instructed by that service. Do not publish private guest data in the repository.

## Publish with GitHub Pages

1. Put `index.html`, `styles.css`, `script.js` and this README in the root of your GitHub Pages repository (or the configured Pages folder).
2. Commit and push the files.
3. In GitHub, open **Settings → Pages** and ensure the correct branch and folder are selected.
4. Visit the Pages URL shown by GitHub.

No npm install, framework or compilation is needed.
