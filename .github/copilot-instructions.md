# Copilot instructions

## Committing

Melanie often edits files herself and leaves them uncommitted on the same branch. Before committing, check `git status`.

- Never leave her uncommitted changes out of the commit history.
- Either include them in the same commit, or commit her changes first and then commit yours.

## Link previews

Link-preview crawlers don't run JavaScript and never see the part of a URL after `#`. A `#kb-<id>` link would therefore only show the site-wide preview, so each keyboard has its own preview page.

- `k/<id>/index.html` holds that keyboard's Open Graph and `twitter:card` tags: its name, a summary of its switches, keycaps, and case, and its preview image. It then redirects to `../../#kb-<id>` with `location.replace`. Without JavaScript, the page shows a link instead.
- `images/og/<card photo file name>` is the preview image: the whole card photo fitted into 1200×630 over a blurred, darkened copy of itself. Keyboards without a `photo` use `images/og-preview.jpg`.
- Each card's link icon in `js/app.js` has `href="k/<id>/"`, so copied links get the keyboard's preview. A plain left click is intercepted and sets `location.hash` instead, so the page doesn't reload.
- `tools/build_previews.py` generates `k/` and `images/og/`. It also deletes pages and images for removed keyboards and photos. Never edit those files by hand.
- The **Build link previews** workflow (`.github/workflows/build-previews.yml`) reruns the script on pushes to `main` that touch `data/`, `images/`, or the script, and commits any changes as `github-actions[bot]`. After pushing such a change, `git pull` before the next commit so local stays aligned with the remote.
- Whenever you change `data/keyboard_collection.json` or a photo, run the script locally and include its output in the same commit. That keeps the bot from needing to commit. The script needs Pillow, which the system Python doesn't have, so use a virtual environment: `python3 -m venv /tmp/ogvenv && /tmp/ogvenv/bin/pip install pillow`, then `/tmp/ogvenv/bin/python tools/build_previews.py`.
- The script only creates preview images that don't exist yet, and names them after the source photo. If a photo is replaced but keeps its file name, run the script with `--force`.
- Don't make IDs change meaning: `k/<id>/` URLs are shared links.
