# Keyboard Collection

A static site that shows my mechanical keyboard collection. It's plain HTML, CSS, and JavaScript with no build step, and it's built to be served by GitHub Pages.

## Local development

The page loads `data/keyboard_collection.json` with `fetch()`, and browsers block that when you open `index.html` straight from the filesystem (`file://`). Run a local server instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Editing the collection

All content comes from `data/keyboard_collection.json`. Edit the `builds` array, and the filters and counts update on their own.

- Fields set to `null` show as **TBD**.
- When `switches.model` is `null`, the card shows `switches.description` instead.
- A `status` of `"work_in_progress"` shows a "Work in progress" badge.

### Photos

Every card shows a placeholder until its `photo` field is set. To add a photo:

1. Put the image in `images/`, for example `images/01-monsgeek-m1.jpg`.
2. Set `"photo": "images/01-monsgeek-m1.jpg"` on that build. Use a relative path with no leading `/` so it works under the GitHub Pages subpath. A full `https://` URL also works.

The site writes the image's alt text from the brand, model, and keycap set.

## Features

- A card grid that searches across every field (brand, model, case, switches, keycaps, notes).
- Filters for switch type and keycap profile.
- Filter state lives in the URL, so a filtered view can be bookmarked or shared, e.g. `?switch=tactile&profile=SA`.
- A dark, minimal theme set in MonoLisa Text, with `system-ui` as the fallback. Every color pair meets WCAG 2.2 AA contrast, and the ratios are listed at the top of `css/styles.css`.
- Keyboard accessible, with a skip link, labeled controls, visible focus rings, and a live region that announces the result count.

