(() => {
  'use strict';

  const DATA_URL = 'data/keyboard_collection.json';
  const TBD = 'TBD';
  const TBD_VALUE = '__tbd';

  const els = {
    form: document.getElementById('filters'),
    q: document.getElementById('q'),
    switchType: document.getElementById('switch'),
    profile: document.getElementById('profile'),
    count: document.getElementById('count'),
    grid: document.getElementById('grid'),
    empty: document.getElementById('empty'),
    emptyClear: document.getElementById('empty-clear'),
    results: document.getElementById('results'),
  };

  let builds = [];

  const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';
  const display = (v) => (isBlank(v) ? TBD : String(v));
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const filterValue = (v) => (isBlank(v) ? TBD_VALUE : String(v));
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

  function switchLabel(sw) {
    return isBlank(sw.model) ? sw.description : sw.model;
  }

  function searchText(b) {
    const text = [
      b.brand, b.model, b.case.color_or_finish, b.case.material,
      b.switches.model, b.switches.description, b.switches.type, b.switches.mount,
      b.keycaps.set, b.keycaps.profile, b.notes,
      b.status === 'work_in_progress' ? 'work in progress' : null,
    ].filter((v) => !isBlank(v)).join(' ');
    return fold(text);
  }

  function normalize(raw) {
    return {
      id: raw.id,
      brand: raw.brand ?? null,
      model: raw.model ?? null,
      case: { color_or_finish: null, material: null, ...raw.case },
      switches: { model: null, description: null, type: null, mount: null, ...raw.switches },
      keycaps: { set: null, profile: null, ...raw.keycaps },
      photo: raw.photo ?? null,
      status: raw.status ?? null,
      notes: raw.notes ?? null,
    };
  }

  const PLACEHOLDER_SVG =
    '<svg viewBox="0 0 64 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">' +
    '<rect x="1" y="1" width="62" height="30" rx="4"/>' +
    '<path d="M8 9h4M16 9h4M24 9h4M32 9h4M40 9h4M48 9h8M8 16h8M20 16h4M28 16h4M36 16h4M44 16h12M8 23h6M18 23h28M50 23h6" stroke-linecap="round"/>' +
    '</svg>';

  function media(b) {
    const wrap = el('div', { class: 'card__media' });
    if (!isBlank(b.photo)) {
      const alt = [b.brand, b.model].filter((v) => !isBlank(v)).join(' ') +
        (isBlank(b.keycaps.set) ? ' keyboard' : ` keyboard with ${b.keycaps.set} keycaps`);
      const img = el('img', { src: b.photo, alt: alt.trim(), loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', () => {
        wrap.replaceChildren(placeholder());
      }, { once: true });
      wrap.append(img);
    } else {
      wrap.append(placeholder());
    }
    return wrap;
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
    const headingId = `kb-${b.id}`;
    const h2 = el('h2', { id: headingId }, [
      el('span', { class: 'card__brand' }, valueNode(b.brand)),
      valueNode(b.model),
    ]);

    const header = el('div', { class: 'card__header' }, h2);
    if (b.status === 'work_in_progress') {
      header.append(el('span', { class: 'badge', text: 'Work in progress' }));
    }

    const dl = el('dl', { class: 'specs' });
    spec(dl, 'Case', b.case.color_or_finish);
    spec(dl, 'Material', b.case.material);
    spec(dl, 'Switches', switchLabel(b.switches));
    spec(dl, 'Type', b.switches.type, capitalize);
    spec(dl, 'Keycaps', b.keycaps.set);
    spec(dl, 'Profile', b.keycaps.profile);

    const body = el('div', { class: 'card__body' }, [header, dl]);
    if (!isBlank(b.notes)) {
      body.append(el('div', { class: 'card__notes' }, [
        el('h3', { class: 'card__notes-label', text: 'Build Notes' }),
        el('p', { text: b.notes }),
      ]));
    }

    return el('li', {}, el('article', { class: 'card', 'aria-labelledby': headingId }, [media(b), body]));
  }

  function populateSelect(select, values, transform) {
    const counts = new Map();
    for (const v of values) counts.set(filterValue(v), (counts.get(filterValue(v)) || 0) + 1);
    const keys = [...counts.keys()]
      .filter((k) => k !== TBD_VALUE)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (counts.has(TBD_VALUE)) keys.push(TBD_VALUE);
    for (const k of keys) {
      const label = k === TBD_VALUE ? TBD : transform ? transform(k) : k;
      select.append(el('option', { value: k, text: `${label} (${counts.get(k)})` }));
    }
  }

  function currentFilters() {
    return {
      q: fold(els.q.value.trim()),
      switchType: els.switchType.value,
      profile: els.profile.value,
    };
  }

  function matches(b, f) {
    if (f.switchType && filterValue(b.switches.type) !== f.switchType) return false;
    if (f.profile && filterValue(b.keycaps.profile) !== f.profile) return false;
    if (f.q) {
      const hay = b._search;
      return f.q.split(/\s+/).every((term) => hay.includes(term));
    }
    return true;
  }

  function syncUrl(f) {
    const params = new URLSearchParams();
    if (els.q.value.trim()) params.set('q', els.q.value.trim());
    if (f.switchType) params.set('switch', f.switchType);
    if (f.profile) params.set('profile', f.profile);
    const qs = params.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
    history.replaceState(null, '', url);
  }

  function setSelect(select, value) {
    if (value && [...select.options].some((o) => o.value === value)) select.value = value;
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    els.q.value = params.get('q') || '';
    setSelect(els.switchType, params.get('switch'));
    setSelect(els.profile, params.get('profile'));
  }

  function render() {
    const f = currentFilters();
    const visible = builds.filter((b) => matches(b, f));
    els.grid.replaceChildren(...visible.map(card));
    els.empty.hidden = visible.length !== 0;
    const noun = builds.length === 1 ? 'keyboard' : 'keyboards';
    els.count.textContent = visible.length === builds.length
      ? `Showing all ${builds.length} ${noun}`
      : `Showing ${visible.length} of ${builds.length} ${noun}`;
    syncUrl(f);
  }

  function clearFilters() {
    els.form.reset();
    render();
    els.q.focus();
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      builds = (data.builds || []).map(normalize).map((b) => ({ ...b, _search: searchText(b) }));
    } catch (err) {
      console.error(err);
      els.count.textContent = 'Sorry, the keyboard collection could not be loaded.';
      return;
    }

    populateSelect(els.switchType, builds.map((b) => b.switches.type), capitalize);
    populateSelect(els.profile, builds.map((b) => b.keycaps.profile));
    readUrl();

    let timer;
    els.q.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(render, 150);
    });
    els.switchType.addEventListener('change', render);
    els.profile.addEventListener('change', render);
    els.form.addEventListener('submit', (e) => e.preventDefault());
    els.form.addEventListener('reset', () => setTimeout(render, 0));
    els.emptyClear.addEventListener('click', clearFilters);

    render();
  }

  init();
})();
