(() => {
  'use strict';

  const DATA_URL = 'data/keyboard_collection.json';
  const TBD = 'TBD';

  const els = {
    count: document.getElementById('count'),
    countHint: document.getElementById('count-hint'),
    grid: document.getElementById('grid'),
    lightbox: document.getElementById('lightbox'),
    lightboxTitle: document.getElementById('lightbox-title'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxNav: document.getElementById('lightbox-nav'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxCounter: document.getElementById('lightbox-counter'),
  };

  let builds = [];
  let targetId = null;

  const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';
  const display = (v) => (isBlank(v) ? TBD : String(v));
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fold = (s) => s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .toLowerCase();

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const child of [].concat(children)) {
      if (child) node.append(child);
    }
    return node;
  }

  function valueNode(v, transform) {
    if (isBlank(v)) return el('span', { class: 'tbd', text: TBD });
    return document.createTextNode(transform ? transform(String(v)) : String(v));
  }

  function caseLabel(c) {
    const parts = [c.color_or_finish, c.material].filter((v) => !isBlank(v)).map((v) => String(v).trim());
    // Skip a value the other already contains (e.g. "Aluminum top case" inside the material).
    const unique = parts.filter((v, i) => !parts.some((o, j) => j !== i && fold(o).includes(fold(v)) && (o.length > v.length || j < i)));
    return unique.join(', ') || null;
  }

  function switchLabel(sw) {
    return isBlank(sw.model) ? sw.description : sw.model;
  }

  const FILLER = new Set(['switch', 'switches', 'variant']);
  const TYPE_WORDS = new Set(['silent', 'linear', 'tactile', 'clicky', 'magnetic']);
  const words = (s) => s.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];

  // Combine type and description without repeating the switch name or the type.
  function switchTypeLabel(sw) {
    if (isBlank(sw.description) || isBlank(sw.model)) return sw.type;
    const known = new Set([...words(sw.model), ...FILLER]);
    const segments = sw.description.split(',').map((seg, i) => {
      if (words(seg).every((w) => known.has(w))) return '';
      if (i > 0) return seg.trim();
      return seg.split(/\s+/).filter((t) => {
        const ws = words(t);
        return !ws.length || ws.some((w) => TYPE_WORDS.has(w) || !known.has(w));
      }).join(' ');
    }).filter((seg) => seg.trim());
    if (!segments.length) return sw.type;
    let label = segments.join(', ');
    if (!isBlank(sw.type) && !new RegExp(`\\b${sw.type}\\b`, 'i').test(label)) label = `${sw.type}, ${label}`;
    return label;
  }

  function normalize(raw) {
    return {
      id: raw.id,
      brand: raw.brand ?? null,
      model: raw.model ?? null,
      case: { color_or_finish: null, material: null, ...raw.case },
      plate: raw.plate ?? null,
      switches: { model: null, description: null, type: null, ...raw.switches },
      keycaps: { set: null, profile: null, ...raw.keycaps },
      photo: raw.photo ?? null,
      additional_photos: Array.isArray(raw.additional_photos)
        ? raw.additional_photos.filter((p) => !isBlank(p))
        : [],
      status: raw.status ?? null,
      notes: raw.notes ?? null,
    };
  }

  const PLACEHOLDER_SVG =
    '<svg viewBox="0 0 64 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">' +
    '<rect x="1" y="1" width="62" height="30" rx="4"/>' +
    '<path d="M8 9h4M16 9h4M24 9h4M32 9h4M40 9h4M48 9h8M8 16h8M20 16h4M28 16h4M36 16h4M44 16h12M8 23h6M18 23h28M50 23h6" stroke-linecap="round"/>' +
    '</svg>';

  // Chain-link icon, after Feather Icons (MIT).
  const LINK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' +
    '</svg>';

  // Expand icon, after Feather Icons "maximize-2" (MIT).
  const EXPAND_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>' +
    '</svg>';

  function media(b) {
    const wrap = el('div', { class: 'card__media' });
    if (!isBlank(b.photo)) {
      const alt = [b.brand, b.model].filter((v) => !isBlank(v)).join(' ') +
        (isBlank(b.keycaps.set) ? ' keyboard'
          // Don't double up when the set name already says "keycaps" or "keycap set".
          : /\bkeycaps?\b/i.test(b.keycaps.set) ? ` keyboard with ${b.keycaps.set.trim()}`
          : ` keyboard with ${b.keycaps.set} keycaps`);
      const thumb = /^images\//.test(b.photo) ? b.photo.replace(/^images\//, 'images/thumbs/') : b.photo;
      // Blurred copy of the photo fills the frame behind the uncropped photo.
      const backdrop = el('img', { class: 'card__backdrop', src: thumb, alt: '', loading: 'lazy', decoding: 'async' });
      const img = el('img', { class: 'card__photo', src: thumb, alt: '', loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', () => {
        if (img.getAttribute('src') !== b.photo) {
          // No thumbnail yet; use the full photo.
          img.src = b.photo;
          backdrop.src = b.photo;
        } else {
          wrap.replaceChildren(placeholder());
        }
      });
      const name = [b.brand, b.model].filter((v) => !isBlank(v)).join(' ') || 'Keyboard';
      const icon = el('span', { class: 'card__expand', 'aria-hidden': 'true' });
      icon.innerHTML = EXPAND_SVG;
      const photos = [b.photo, ...b.additional_photos];
      const parts = [backdrop, img, icon];
      if (photos.length > 1) {
        parts.push(el('span', { class: 'card__count', 'aria-hidden': 'true' }, [`${photos.length} photos`]));
      }
      const button = el('button', {
        type: 'button',
        class: 'card__zoom',
        'aria-haspopup': 'dialog',
        'aria-label': photos.length > 1
          ? `View ${photos.length} photos: ${alt.trim()}`
          : `View larger photo: ${alt.trim()}`,
      }, parts);
      button.addEventListener('click', () => openLightbox(photos, alt.trim(), name, button));
      wrap.append(button);
    } else {
      wrap.append(placeholder());
    }
    return wrap;
  }

  let lightboxOpener = null;
  const lightboxState = { photos: [], index: 0, alt: '' };

  function showLightboxPhoto(index) {
    const { photos, alt } = lightboxState;
    const n = photos.length;
    lightboxState.index = (index + n) % n;
    const i = lightboxState.index;
    els.lightboxImg.src = photos[i];
    els.lightboxImg.alt = n > 1 ? `${alt}, photo ${i + 1} of ${n}` : alt;
    els.lightboxCounter.textContent = `Photo ${i + 1} of ${n}`;
    // Warm the cache so the next photo appears without a gap.
    if (n > 1) new Image().src = photos[(i + 1) % n];
  }

  function openLightbox(photos, alt, title, opener) {
    lightboxOpener = opener;
    lightboxState.photos = photos;
    lightboxState.alt = alt;
    els.lightboxTitle.textContent = title;
    els.lightboxNav.hidden = photos.length < 2;
    els.lightbox.classList.toggle('lightbox--multi', photos.length > 1);
    showLightboxPhoto(0);
    els.lightbox.showModal();
    els.lightboxClose.focus();
  }

  function setupLightbox() {
    const dlg = els.lightbox;
    els.lightboxClose.addEventListener('click', () => dlg.close());
    els.lightboxPrev.addEventListener('click', () => showLightboxPhoto(lightboxState.index - 1));
    els.lightboxNext.addEventListener('click', () => showLightboxPhoto(lightboxState.index + 1));
    // The panel fills the dialog's content box, so a click whose target is the
    // dialog itself landed on the backdrop (for browsers without closedby).
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        // Keep focus cycling through the dialog's visible buttons.
        const controls = [...dlg.querySelectorAll('button')].filter((b) => !b.closest('[hidden]'));
        const at = controls.indexOf(document.activeElement);
        const next = at === -1 ? 0 : (at + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
        e.preventDefault();
        controls[next].focus();
      } else if (lightboxState.photos.length > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        showLightboxPhoto(lightboxState.index + (e.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    dlg.addEventListener('close', () => {
      els.lightboxImg.removeAttribute('src');
      lightboxState.photos = [];
      if (lightboxOpener && lightboxOpener.isConnected) lightboxOpener.focus();
      lightboxOpener = null;
    });
  }

  function placeholder() {
    const p = el('div', { class: 'placeholder', 'aria-hidden': 'true' });
    p.innerHTML = PLACEHOLDER_SVG;
    return p;
  }

  function spec(dl, term, value, transform) {
    dl.append(el('dt', { text: term }), el('dd', {}, valueNode(value, transform)));
  }

  function card(b) {
    const cardId = `kb-${b.id}`;
    const headingId = `${cardId}-title`;
    const title = el('h3', { id: headingId }, [
      el('span', { class: 'card__brand' }, valueNode(b.brand)),
      valueNode(b.model),
    ]);

    // Brand, model, switches, and keycaps, so every link has a unique name.
    const linkName = [
      [b.brand, b.model].filter((v) => !isBlank(v)).join(' '), b.switches.model, b.keycaps.set,
    ].filter((v) => !isBlank(v)).join(', ');
    const label = `Link to ${linkName}`;
    const permalink = el('a', { class: 'permalink', href: `#${cardId}`, 'aria-label': label });
    permalink.innerHTML = LINK_SVG;

    const header = el('div', { class: 'card__header' }, title);
    if (b.status === 'work_in_progress') {
      header.append(el('span', { class: 'badge', text: 'Work in progress' }));
    }
    header.append(permalink);

    const dl = el('dl', { class: 'specs' });
    spec(dl, 'Case', caseLabel(b.case));
    spec(dl, 'Plate', b.plate);
    spec(dl, 'Switches', switchLabel(b.switches));
    spec(dl, 'Type', switchTypeLabel(b.switches), capitalize);
    spec(dl, 'Keycaps', b.keycaps.set);
    spec(dl, 'Profile', b.keycaps.profile);

    const body = el('div', { class: 'card__body' }, [header, dl]);
    if (!isBlank(b.notes)) {
      body.append(el('div', { class: 'card__notes' }, [
        el('h4', { class: 'card__notes-label', text: 'Build Notes' }),
        el('p', { text: b.notes }),
      ]));
    }

    const cls = cardId === targetId ? 'card is-target' : 'card';
    return el('li', {}, el('article', {
      id: cardId, class: cls, tabindex: '-1', 'aria-labelledby': headingId,
    }, [media(b), body]));
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  // Blank values sort last so "TBD" entries don't lead the list.
  function compareText(a, b) {
    if (isBlank(a) && isBlank(b)) return 0;
    if (isBlank(a)) return 1;
    if (isBlank(b)) return -1;
    return collator.compare(String(a), String(b));
  }

  const byBrand = (a, b) => compareText(a.brand, b.brand) || compareText(a.model, b.model) || a.id - b.id;

  function render() {
    els.grid.replaceChildren(...builds.map(card));
    const noun = builds.length === 1 ? 'keyboard' : 'keyboards';
    els.count.textContent = `Showing all ${builds.length} ${noun}.`;
    els.countHint.hidden = !builds.some((b) => !isBlank(b.photo));
  }

  // Shared links point at #kb-<id>. Highlight the card and move focus to it.
  function showTarget() {
    const hash = location.hash.slice(1);
    targetId = builds.some((b) => `kb-${b.id}` === hash) ? hash : null;
    render();
    focusTarget();
  }

  function focusTarget() {
    const target = targetId && document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
    }
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      builds = (data.builds || []).map(normalize).sort(byBrand);
    } catch (err) {
      console.error(err);
      els.count.textContent = 'Sorry, the keyboard collection could not be loaded.';
      return;
    }

    window.addEventListener('hashchange', showTarget);
    setupLightbox();

    render();
    if (location.hash) showTarget();
  }

  init();
})();
