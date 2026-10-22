# Keyboard Collection

A static site that shows my mechanical keyboard collection. It's plain HTML, CSS, and JavaScript with no build step, and it's built to be served by GitHub Pages.

## Local development

The page loads `data/keyboard_collection.json` with `fetch()`, and browsers block that when you open `index.html` straight from the filesystem (`file://`). Run a local server instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Adding a keyboard

Open a new issue on GitHub and choose **New keyboard**. Fill in what you know, and drag a photo into the Photo box if you have one. When you submit it, a GitHub Action adds the entry and opens a pull request. Merging the pull request publishes the keyboard and closes the issue.

- Only issues you open as the repository owner trigger it.
- Blank fields become `null` and show as **TBD**.
- The link name (`slug`) is made from brand, model, switches, and keycap set. If it's taken, `-2`, `-3`, and so on is added.
- If the photo can't be downloaded, the pull request says so, and you can add it by hand (see Photos below).
- The pieces are `.github/ISSUE_TEMPLATE/new-keyboard.yml`, `.github/workflows/add-keyboard.yml` and `.github/scripts/add_keyboard.py`.
- It needs **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests** turned on.

## Editing the collection

All content comes from `data/keyboard_collection.json`. Edit the `builds` array, and the filters and counts update on their own.

- Fields set to `null` show as **TBD**.
- When `switches.model` is `null`, the card shows `switches.description` instead.
- A `status` of `"work_in_progress"` shows a "Work in progress" badge.
- `slug` is the build's link name, made from brand, model, switches, and keycap set: `#drop-cstm80-haimu-whisper-silent-tactile-cannoncaps-cxa-iara`. It's stored rather than computed, so swapping switches or keycaps later doesn't break shared links. Keep slugs unique, and don't change one after it's published.

### Photos

Every card shows a placeholder until its `photo` field is set. To add a photo:

1. Put the image in `images/`, for example `images/01-monsgeek-m1.jpg`.
2. Set `"photo": "images/01-monsgeek-m1.jpg"` on that build. Use a relative path with no leading `/` so it works under the GitHub Pages subpath. A full `https://` URL also works.

The site writes the image's alt text from the brand, model, and keycap set.

## Features

- A card grid that searches across every field (brand, model, case, switches, keycaps, notes).
- Filters for switch type and keycap profile.
- Filter state lives in the URL, so a filtered view can be bookmarked or shared, e.g. `?switch=tactile&profile=SA`.
- Every card has a permalink (`#slug`) whose visible text names the brand, model, switches, and keycaps, so no two links share a name. Opening one clears any filter that would hide the card, then scrolls to it, highlights it, and moves focus to it.
- A dark, minimal theme set in MonoLisa Text, with `system-ui` as the fallback. Every color pair meets WCAG 2.2 AA contrast, and the ratios are listed at the top of `css/styles.css`.
- Keyboard accessible, with a skip link, labeled controls, visible focus rings, and a live region that announces the result count.

