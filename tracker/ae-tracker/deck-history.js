// Small shared bridge: standalone decks queue opens; the tracker saves them with progress.
// No account credentials, analytics requests or study content are stored here.
(() => {
  const PREFIX = 'ae-deck-opens-v1:', ACCOUNT = PREFIX + 'account';
  const validId = id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(id) && !['constructor', 'prototype'].includes(id);
  const validTime = at => Number.isSafeInteger(at) && at > 0 && at <= 8640000000000000;
  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, at]) => validId(id) && validTime(at))
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b)).slice(0, 100));
  }
  function create({ storage, now = Date.now, notify = () => {} } = {}) {
    if (storage === undefined) { try { storage = globalThis.localStorage; } catch { /* Browser storage may be unavailable. */ } }
    const memory = new Map();
    const get = key => { try { return storage?.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } };
    const put = (key, value) => { memory.set(key, value); try { storage?.setItem(key, value); } catch { /* Keep this tab usable when storage is full. */ } };
    const scope = () => get(ACCOUNT) || 'local';
    function setAccount(uid) { put(ACCOUNT, uid ? 'user:' + uid : 'local'); }
    function read(account = scope()) {
      try { return normalize(JSON.parse(get(PREFIX + account))); } catch { return {}; }
    }
    function merge(visits, account = scope()) {
      const previous = read(account), next = { ...previous };
      for (const [id, at] of Object.entries(normalize(visits))) next[id] = Math.max(next[id] || 0, at);
      const clean = normalize(next);
      if (JSON.stringify(clean) !== JSON.stringify(previous)) put(PREFIX + account, JSON.stringify(clean));
      return clean;
    }
    function record(id, account = scope()) {
      if (!validId(id)) return;
      const at = now();
      if (!validTime(at)) return;
      merge({ [id]: at }, account);
      notify(account);
    }
    function acknowledge(visits, account = scope()) {
      const pending = read(account);
      for (const [id, at] of Object.entries(normalize(visits))) if (pending[id] <= at) delete pending[id];
      put(PREFIX + account, JSON.stringify(pending));
    }
    const clear = (account = scope()) => put(PREFIX + account, '{}');
    return { scope, setAccount, read, record, acknowledge, clear, isStorageKey: key => key?.startsWith(PREFIX) && key !== ACCOUNT };
  }
  function catalog(decks, deckBase, baseUrl) {
    const entries = Object.entries(decks).filter(([id]) => validId(id)).map(([id, d]) => ({ id, title: d.title, guide: !!d.guide,
      url: new URL(deckBase + d.file, baseUrl).href, mdUrl: d.md ? new URL(deckBase + d.md, baseUrl).href : null }));
    const canonical = value => { const url = new URL(value, baseUrl); return url.origin + url.pathname; };
    const links = new Map(entries.flatMap(d => [d.url, d.mdUrl].filter(Boolean).map(url => [canonical(url), d.id])));
    function match(href) { try { return links.get(canonical(href)) || null; } catch { return null; } }
    function recent(visits, limit = 4) {
      const clean = normalize(visits);
      return entries.filter(d => clean[d.id]).map(d => ({ ...d, openedAt: clean[d.id] }))
        .sort((a, b) => b.openedAt - a.openedAt || a.id.localeCompare(b.id)).slice(0, limit);
    }
    return { match, recent };
  }
  const store = create({ notify: scope => globalThis.dispatchEvent?.(new CustomEvent('ae-deck-open', { detail: { scope } })) });
  globalThis.AEDeckHistory = Object.freeze({ create, catalog, store, normalize });
  const id = globalThis.document?.currentScript?.dataset.deck;
  if (id) {
    store.record(id);
    // Back/forward cache restores do not re-execute scripts.
    globalThis.addEventListener('pageshow', event => { if (event.persisted) store.record(id); });
  }
})();
