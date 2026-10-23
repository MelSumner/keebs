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
- The new keyboard gets the ID in `next_id`, and `next_id` goes up by one, so IDs are never reused.
- Only photos dragged into the issue (uploaded to GitHub) are downloaded. Links to other sites are skipped, so the workflow's token never goes to an outside server.
- If the photo can't be downloaded, the pull request says so, and you can add it by hand (see Photos below).
- The pieces are `.github/ISSUE_TEMPLATE/new-keyboard.yml`, `.github/workflows/add-keyboard.yml` and `.github/scripts/add_keyboard.py`.
- It needs **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests** turned on.

## Editing the collection

All content comes from `data/keyboard_collection.json`. Edit the `builds` array, and the filters and counts update on their own.

- Fields set to `null` show as **TBD**.
- When `switches.model` is `null`, the card shows `switches.description` instead.
- A `status` of `"work_in_progress"` shows a "Work in progress" badge.
- `id` is permanent: it's the card's link, `#kb-12`. Never change or reuse an ID. To retire a board, keep its record (or delete it, but don't give its ID to another board). When adding a build by hand, use `next_id` as its `id` and then increase `next_id` by one.

### Photos

Every card shows a placeholder until its `photo` field is set. To add a photo:

1. Put the image in `images/`, named with `kb-` and the build's two-digit ID, for example `images/kb-01-IMG_1485.jpg`. Photos added by the issue form are named `kb-NN-brand-model.jpg`.
2. Set `"photo": "images/kb-01-IMG_1485.jpg"` on that build. Use a relative path with no leading `/` so it works under the GitHub Pages subpath. A full `https://` URL also works.

The site writes the image's alt text from the brand, model, and keycap set.

Before committing a photo, resize it so its longest side is 1600px and compress it. On macOS:

```sh
sips -Z 1600 -s formatOptions 55 images/kb-NN-IMG_1234.jpg
```

That keeps most photos under 300 KB. If the file comes out larger than it went in, the original was already heavily compressed, so keep the original instead.

Then make the card thumbnail, a 900px copy in `images/thumbs/` with the same file name:

```sh
sips -Z 900 -s formatOptions 60 images/kb-NN-IMG_1234.jpg --out images/thumbs/kb-NN-IMG_1234.jpg
```

To show more than one photo, list the extras in `additional_photos`, in order. Give each one a thumbnail too. Name them `kb-NN-01-…`, `kb-NN-02-…`, and so on, with `-01` as the card photo:

```json
"photo": "images/kb-09-01-IMG_1419.jpg",
"additional_photos": ["images/kb-09-02-IMG_1421.jpg", "images/kb-09-03-IMG_1478.jpg"],
```

Cards load the thumbnail and the photo dialog loads the full photo. If a thumbnail is missing (for example, for a photo added by the issue-form Action), the card falls back to the full photo.

### Link preview and icons

- `images/og-preview.jpg` is the 1200×630 image shown when the site is shared (Open Graph and `twitter:card` tags in `index.html`). Its source is `tools/og-image.html`. To change it, edit that file, serve the repo, open `http://localhost:8000/tools/og-image.html` at a 1200×630 viewport, screenshot it, and save it as a JPEG. Every `#kb-<id>` link shares this one preview, because link-preview crawlers ignore the part after `#`.
- `favicon.svg` is the browser icon. `favicon-32.png` (32×32) and `apple-touch-icon.png` (180×180) are PNG copies of it for browsers and devices that need them.

## Features

- A card grid that searches across every field (brand, model, case, plate, switches, keycaps, notes).
- Filters for switch type and keycap profile.
- Filter state lives in the URL, so a filtered view can be bookmarked or shared, e.g. `?switch=tactile&profile=SA`.
- Every card has a link icon in its top-right corner that links to the card (`#kb-<id>`). Its accessible name ("Link to …" with the brand, model, switches, and keycaps) is unique per card. Opening one clears any filter that would hide the card, then scrolls to it, highlights it, and moves focus to it.
- Card photos show the whole keyboard, uncropped, over a blurred copy of the photo, with an expand icon. Selecting one opens the full-size photo in a modal dialog. A build with more than one photo shows a "3 photos" label on its card, and the dialog has previous and next buttons (or the Left and Right arrow keys) and a "Photo 1 of 3" counter. Focus stays in the dialog until you close it with the close button, Esc, or a click outside the photo, and then returns to the card.
- A dark, minimal theme set in MonoLisa Text, with `system-ui` as the fallback. Every color pair meets WCAG 2.2 AA contrast, and the ratios are listed at the top of `css/styles.css`.
- Keyboard accessible, with a skip link, labeled controls, visible focus rings, and a live region that announces the result count.

