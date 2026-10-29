// A small shared search window on the tracker and every registered HTML deck.
(() => {
  const script = document.currentScript;
  const base = new URL('.', script.src);
  const indexUrl = new URL(script.dataset.index, document.baseURI);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const searchIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  const root = document.createElement('div'); root.className = 'ae-study-search';
  root.innerHTML = `<button type="button" class="ae-search-launcher" data-deck-search-open aria-haspopup="dialog" aria-controls="aeDeckSearchDialog">${searchIcon}<span>Search decks</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd></button>
    <dialog id="aeDeckSearchDialog" class="ae-search-window" aria-labelledby="aeSearchTitle">
      <div class="ae-search-head"><div><h2 id="aeSearchTitle">Search your decks</h2><p id="aeSearchScope">Explanations, examples and study notes</p></div><button type="button" class="ae-search-close" aria-label="Close deck search">✕</button></div>
      <div class="ae-search-body"><p class="ae-search-status" role="status" aria-live="polite"></p><div class="ae-search-results"></div></div>
      <form class="ae-search-form" role="search"><label for="aeSearchInput">Find a concept or ask a question</label><div><input id="aeSearchInput" type="search" maxlength="240" placeholder="e.g. CTE vs subquery" autocomplete="off"><button type="submit" aria-label="Search decks">${searchIcon}</button></div><p>Searches passages from your study materials.</p></form>
    </dialog>`;
  document.body.append(root);
  const dialog = root.querySelector('dialog'), input = root.querySelector('input'), status = root.querySelector('.ae-search-status'), results = root.querySelector('.ae-search-results');
  let index, loading, request = 0, timer, opener;
  const safeUrl = relative => {
    const url = new URL(relative, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname + 'decks/')) throw Error('Invalid study link.');
    return url.href;
  };
  const highlight = (text, terms) => {
    const words = [...new Set(terms)].filter(t => t.length >= 2).sort((a, b) => b.length - a.length);
    if (!words.length) return esc(text);
    const re = new RegExp(words.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
    let out = '', from = 0;
    for (const match of String(text).matchAll(re)) { out += esc(text.slice(from, match.index)) + '<mark>' + esc(match[0]) + '</mark>'; from = match.index + match[0].length; }
    return out + esc(text.slice(from));
  };
  function welcome() {
    status.textContent = '';
    status.removeAttribute('aria-busy');
    results.innerHTML = `<div class="ae-search-welcome"><strong>Find the explanation you remember.</strong><p>Search a term, SQL function or question. Matches include the source passage and a link to the material.</p><div>${['CTE vs subquery', 'ROWS vs RANGE', 'SCD2', 'incremental models', 'Parquet', 'pytest fixtures'].map(q => `<button type="button" data-search-example="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
  }
  async function load() {
    if (index) return index;
    if (!loading) loading = fetch(indexUrl).then(response => {
      if (!response.ok) throw Error('Study files unavailable.');
      return response.json();
    }).then(data => {
      index = AEDeckSearch.createIndex(data);
      root.querySelector('#aeSearchScope').textContent = `${index.sourceCount} decks & guides · search their content`;
      return index;
    }).catch(error => { loading = null; throw error; });
    return loading;
  }
  async function run() {
    const current = ++request, query = input.value.trim();
    if (query.length < 2) { welcome(); return; }
    status.textContent = index ? 'Searching…' : 'Loading study files…'; status.setAttribute('aria-busy', 'true');
    results.replaceChildren();
    try {
      const loaded = await load();
      if (current !== request || !dialog.open) return;
      const found = loaded.search(query);
      status.textContent = found.results.length ? `${found.results.length} matching passages${found.total > found.results.length ? ` · ${found.total} found, refine your search for more` : ''}` : 'No matching passages. Try a shorter term or another spelling.';
      results.innerHTML = found.results.map(hit => {
        const url = safeUrl(hit.source.url + (hit.anchor ? '#' + hit.anchor : ''));
        const snippet = AEDeckSearch.excerpt(hit.text, found.terms);
        return `<article class="ae-search-result"><p class="ae-search-source">${esc(hit.source.title)}</p><h3><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${highlight(hit.heading, found.terms)} ↗</a></h3><p class="ae-search-excerpt">${highlight(snippet, found.terms)}</p><details><summary>Read passage</summary><pre>${highlight(hit.text, found.terms)}</pre></details><div class="ae-search-links"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${hit.anchor ? 'Open slide' : hit.source.url.endsWith('.md') ? 'Open guide' : 'Open deck'} ↗</a>${hit.source.mdUrl && hit.source.mdUrl !== hit.source.url ? `<a href="${esc(safeUrl(hit.source.mdUrl))}" target="_blank" rel="noopener noreferrer">Markdown ↗</a>` : ''}</div></article>`;
      }).join('');
      root.querySelector('.ae-search-body').scrollTop = 0;
    } catch {
      if (current !== request || !dialog.open) return;
      status.textContent = 'Couldn’t load the study files. Check your connection and retry.';
      results.innerHTML = '<button type="button" class="ae-search-retry">Retry search</button>';
    } finally { if (current === request) status.removeAttribute('aria-busy'); }
  }
  function open(trigger) {
    opener = trigger || document.activeElement;
    if (!dialog.open) dialog.showModal();
    input.focus(); input.select();
    if (input.value.trim()) run();
    else { welcome(); load().catch(() => { if (dialog.open && !input.value.trim()) { status.textContent = 'Study files will load when you search. Check your connection if unavailable.'; } }); }
  }
  const close = () => { ++request; clearTimeout(timer); status.removeAttribute('aria-busy'); dialog.close(); (opener?.isConnected ? opener : root.querySelector('.ae-search-launcher')).focus({ preventScroll: true }); };
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-deck-search-open]'); if (trigger) open(trigger);
  });
  root.querySelector('.ae-search-close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); }
    const example = event.target.closest('[data-search-example]');
    if (example) { input.value = example.dataset.searchExample; input.focus(); run(); }
    if (event.target.closest('.ae-search-retry')) run();
  });
  root.querySelector('form').addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); run(); });
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 140); });
  // Capture shortcuts so the deck's slide navigation and an underlying note editor stay untouched.
  document.addEventListener('keydown', event => {
    if (dialog.open) {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      return;
    }
    if (event.defaultPrevented || event.isComposing || event.altKey || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
    if (event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
    event.preventDefault(); event.stopPropagation(); open();
  }, true);
})();
