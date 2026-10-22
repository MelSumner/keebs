"""Add a keyboard to data/keyboard_collection.json from a "New keyboard" issue form.

Reads the issue body from ISSUE_BODY. Writes the new entry, downloads an attached
photo into images/, and writes pr_body.md plus step outputs for the workflow.
"""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "keyboard_collection.json"
IMAGES = ROOT / "images"
EMPTY = {"", "_no response_", "not sure", "none", "n/a", "tbd"}
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_PHOTO_BYTES = 15 * 1024 * 1024


def parse_form(body):
    """Split an issue-form body into {label: value}."""
    fields = {}
    for block in re.split(r"^### ", body.replace("\r\n", "\n"), flags=re.M)[1:]:
        label, _, value = block.partition("\n")
        fields[label.strip()] = value.strip()
    return fields


def clean(value):
    if value is None:
        return None
    value = value.strip()
    return None if value.lower() in EMPTY else value


def slugify(*parts):
    text = "-".join(p for p in parts if p)
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "keyboard"


def find_image_url(text):
    if not text:
        return None
    match = re.search(r"!\[[^\]]*\]\((https://[^)\s]+)\)", text) or re.search(
        r"<img[^>]+src=\"(https://[^\"]+)\"", text
    )
    return match.group(1) if match else None


def download_photo(url, stem):
    """Save the photo to images/ and return its site-relative path."""
    req = urllib.request.Request(url, headers={"User-Agent": "keebs-add-keyboard"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        # Unredirected so the token isn't forwarded to the storage host GitHub redirects to.
        req.add_unredirected_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as res:
        ctype = res.headers.get_content_type()
        if ctype not in IMAGE_TYPES:
            raise ValueError(f"unsupported image type {ctype}")
        data = res.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise ValueError("photo is larger than 15 MB")
    IMAGES.mkdir(exist_ok=True)
    path = IMAGES / f"{stem}.{IMAGE_TYPES[ctype]}"
    path.write_bytes(data)
    return path.relative_to(ROOT).as_posix()


def set_output(**values):
    out = os.environ.get("GITHUB_OUTPUT")
    if not out:
        return
    with open(out, "a", encoding="utf-8") as fh:
        for key, value in values.items():
            fh.write(f"{key}={value}\n")


def main():
    form = parse_form(os.environ.get("ISSUE_BODY", ""))
    brand, model = clean(form.get("Brand")), clean(form.get("Model"))
    if not brand or not model:
        sys.exit("Brand and Model are required.")

    collection = json.loads(DATA.read_text(encoding="utf-8"))
    builds = collection["builds"]
    # IDs are permanent link targets (#kb-<id>), so never reuse one, even after a delete.
    new_id = max(collection.get("next_id", 1), max((b["id"] for b in builds), default=0) + 1)

    status = "work_in_progress" if (form.get("Status") or "").strip().lower() == "work in progress" else "documented"
    switch_type = clean(form.get("Switch type"))
    switch_model, keycap_set = clean(form.get("Switches")), clean(form.get("Keycaps"))
    entry = {
        "id": new_id,
        "brand": brand,
        "model": model,
        "case": {
            "color_or_finish": clean(form.get("Case color or finish")),
            "material": clean(form.get("Case material")),
        },
        "switches": {
            "model": switch_model,
            "description": clean(form.get("Switch details")),
            "type": switch_type.lower() if switch_type else None,
        },
        "keycaps": {
            "set": keycap_set,
            "profile": clean(form.get("Keycap profile")),
        },
        "photo": None,
        "status": status,
        "notes": clean(form.get("Build notes")),
    }

    photo_note = "No photo attached."
    url = find_image_url(form.get("Photo"))
    if url:
        try:
            entry["photo"] = download_photo(url, f"{new_id:02d}-{slugify(brand, model)[:60]}")
            photo_note = f"Photo saved to `{entry['photo']}`."
        except Exception as err:  # keep the entry; the photo can be added later
            photo_note = f"Couldn't download the photo ({err}). Add it to `images/` and set `photo` by hand."

    builds.append(entry)
    if "total_builds" in collection:
        collection["total_builds"] = len(builds)
    collection["next_id"] = new_id + 1
    DATA.write_text(json.dumps(collection, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    issue = os.environ.get("ISSUE_NUMBER", "")
    rows = [
        ("Brand", brand), ("Model", model), ("Link", f"#kb-{new_id}"),
        ("Case", entry["case"]["color_or_finish"]), ("Material", entry["case"]["material"]),
        ("Switches", entry["switches"]["model"]), ("Switch type", entry["switches"]["type"]),
        ("Switch details", entry["switches"]["description"]),
        ("Keycaps", entry["keycaps"]["set"]), ("Profile", entry["keycaps"]["profile"]),
        ("Status", status), ("Notes", entry["notes"]),
    ]
    table = "\n".join(f"| {k} | {(v or 'TBD').replace('|', '&#124;').replace(chr(10), ' ')} |" for k, v in rows)
    Path(os.environ.get("PR_BODY_FILE", ROOT / "pr_body.md")).write_text(
        f"Adds keyboard #{new_id} from the issue form.\n\n| Field | Value |\n|---|---|\n{table}\n\n"
        f"{photo_note}\n\nMerge to publish it on the site.{f' Closes #{issue}.' if issue else ''}\n",
        encoding="utf-8",
    )
    set_output(id=new_id, title=f"{brand} {model}".replace("\n", " "))
    print(f"Added #{new_id}: {brand} {model}. {photo_note}")


if __name__ == "__main__":
    main()
