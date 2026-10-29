// Read-only reference map. Its filters and dialogs never write learning progress.
globalThis.AELandscape = (() => {
  const normalize = value => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function index(data) {
    const entries = new Map(data.entries.map(e => [e.id, e]));
    const groups = new Map(data.groups.map(g => [g.id, g]));
    const text = new Map(data.entries.map(e => [e.id, normalize([e.name, ...e.aliases, e.summary, e.what, e.why, e.difference, e.good, groups.get(e.group).name].join(' '))]));
    const neighbors = id => new Set([id, ...(entries.get(id)?.related.map(r => r.to) || []), ...data.entries.filter(e => e.related.some(r => r.to === id)).map(e => e.id)]);
    function search({ query = '', kind = 'all', group = '', focus = '' } = {}) {
      const words = normalize(query).split(' ').filter(Boolean), nearby = focus ? neighbors(focus) : null;
      return data.entries.filter(e => (kind === 'all' || e.kind === kind) && (!group || e.group === group)
        && (!nearby || nearby.has(e.id)) && words.every(word => text.get(e.id).includes(word)));
    }
    return { entries, groups, neighbors, search };
  }

  function create({ data, plan, onLesson }) {
    const { esc, icon } = globalThis.AEUtils;
    const model = index(data), f = { query: '', kind: 'all', group: '', focus: '' };
    const kinds = { tool: 'Tool / platform', format: 'Format / codec', concept: 'Concept' };
    let stackId = data.stacks[0].id, selected = null, trail = [], opener = null, openerId = null;
    const dialog = document.getElementById('landscapeDialog');
    const termButton = (id, cls = '', extra = '') => `<button type="button" class="${cls}" data-map-term="${esc(id)}" ${extra}>${esc(model.entries.get(id).name)}</button>`;
    const routeIsMap = () => location.hash === '#data-map' || location.hash.startsWith('#data-map/');
    function setAddress(value = '') {
      if (routeIsMap()) history.replaceState(null, '', '#data-map' + (value ? '/' + value : ''));
    }
    function stackView() {
      const s = data.stacks.find(x => x.id === stackId);
      return `<section class="landscape-stack" aria-label="Example connections"><div class="landscape-stack-head"><div><span class="eyebrow">See the pieces together</span><h3>Different layers, working together</h3></div><div class="landscape-switch" role="group" aria-label="Example stack">${data.stacks.map(s => `<button type="button" data-map-stack="${s.id}" aria-pressed="${s.id === stackId}">${esc(s.name)}</button>`).join('')}</div></div>
        <div class="landscape-chain">${s.steps.map((id, i) => {
          const e = model.entries.get(id);
          return `${i ? `<span class="landscape-chain-link"><span>${esc(s.links[i - 1])}</span><span aria-hidden="true">→</span></span>` : ''}<button type="button" class="landscape-chain-node" data-map-term="${id}"><span>${esc(e.name)}</span><small>${esc(e.summary)}</small></button>`;
        }).join('')}</div><p class="landscape-stack-note">${esc(s.note)}</p><div class="landscape-alongside"><span>${esc(s.alongsideLabel)}</span>${s.alongside.map(id => termButton(id, 'landscape-inline')).join('')}</div></section>`;
    }
    function relationText(id) {
      if (!f.focus || id === f.focus) return '';
      const root = model.entries.get(f.focus), out = root.related.find(r => r.to === id);
      if (out) return `${root.name} → ${out.label.toLowerCase()} → ${model.entries.get(id).name}`;
      const incoming = model.entries.get(id).related.find(r => r.to === f.focus);
      return incoming ? `${model.entries.get(id).name} → ${incoming.label.toLowerCase()} → ${root.name}` : '';
    }
    function results() {
      const matches = model.search(f);
      const groups = data.groups.filter(g => matches.some(e => e.group === g.id));
      return { matches, groups, html: `${f.focus ? `<div class="landscape-focus"><span>${icon('map')} Connections around <b>${esc(model.entries.get(f.focus).name)}</b> · includes links in both directions</span><button type="button" class="text-btn" data-map-unfocus>Show the full map</button></div>` : ''}
        ${groups.length ? `<div class="landscape-groups">${groups.map(g => `<section class="landscape-group" aria-labelledby="map-group-${g.id}"><div class="landscape-group-head"><div><span class="landscape-question">${esc(g.question)}</span><h3 id="map-group-${g.id}"><button type="button" data-map-group="${g.id}" title="Focus on ${esc(g.name)}">${esc(g.name)}</button><span>${matches.filter(e => e.group === g.id).length}</span></h3></div>${icon(g.id === 'formats' ? 'doc' : g.id === 'compute' ? 'code' : g.id === 'architecture' ? 'map' : 'box')}</div><p class="landscape-group-note">${esc(g.note)}</p>
          <div class="landscape-nodes">${matches.filter(e => e.group === g.id).map(e => `<button type="button" class="landscape-node ${f.focus === e.id ? 'is-root' : ''}" data-map-term="${e.id}" aria-label="${esc(e.name)}: ${esc(e.summary)}"><span><b>${esc(e.name)}</b><i class="landscape-kind-dot ${e.kind}" title="${kinds[e.kind]}" aria-hidden="true"></i></span><small>${esc(e.summary)}</small>${f.focus ? `<em>${e.id === f.focus ? 'You are here' : esc(relationText(e.id))}</em>` : ''}</button>`).join('')}</div></section>`).join('')}</div>` : `<div class="landscape-empty"><h3>No terms match</h3><p>Try a shorter name, an abbreviation, or clear the filters.</p><button type="button" class="btn" data-map-clear>Clear filters</button></div>`}` };
    }
    function render() {
      const r = results();
      return `<div class="landscape-page"><div class="page-head"><div><div class="eyebrow">A reference, whenever you need it</div><h2>Data map</h2><p class="muted">Tools, formats and concepts—grouped by the job they do. Choose any term to see why it exists and what it connects to.</p></div><span class="landscape-total">${data.entries.length} terms<span>${data.groups.length} purposes</span></span></div>
        <details class="landscape-examples" ${matchMedia('(max-width: 700px)').matches ? '' : 'open'}><summary>See example connections <span>A lake query · Your flights v1 · Events to analytics</span></summary><div id="landscapeStack">${stackView()}</div></details>
        <div class="landscape-mixups"><span>Easy to mix up</span>${data.comparisons.map(c => `<button type="button" data-map-compare="${c.id}">${esc(c.name)}</button>`).join('')}</div>
        <div class="landscape-toolbar"><label class="landscape-search">${icon('search')}<span class="sr-only">Search the data map</span><input id="landscapeSearch" type="search" placeholder="Find Hive, Parquet, CDC, a purpose…" value="${esc(f.query)}" autocomplete="off"></label><div class="landscape-kinds" role="group" aria-label="Filter entry type">${[['all','All'],['tool','Tools'],['format','Formats'],['concept','Concepts']].map(([id,label]) => `<button type="button" data-map-kind="${id}" aria-pressed="${f.kind === id}">${label}</button>`).join('')}</div></div>
        <div class="landscape-result-info"><span id="landscapeCount" role="status">${r.matches.length} terms · ${r.groups.length} purpose groups</span><div id="landscapeActiveFilters">${activeFilters()}</div></div>
        <div id="landscapeResults">${r.html}</div>
        <details class="landscape-research"><summary>About this reference & sources <span>Reviewed ${esc(data.reviewed)}</span></summary><p>${Object.keys(data.sources).length} primary sources: project documentation, format specifications and original architecture writing. Every term links to its sources in its panel. Examples and practical cautions are synthesized guidance.</p><p>This is a map of roles, rather than an exhaustive vendor list or a compatibility certification. Products overlap; verify exact versions, connector operations and access paths before implementation.</p><div class="landscape-source-list">${Object.values(data.sources).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>`).join('')}</div></details></div>`;
    }
    function activeFilters() {
      return `${f.group ? `<button type="button" class="text-btn" data-map-ungroup>${esc(model.groups.get(f.group).name)} ${icon('close')}</button>` : ''}${f.query || f.kind !== 'all' || f.group || f.focus ? '<button type="button" class="text-btn" data-map-clear>Reset</button>' : '<span class="small muted">Select a group title to focus it</span>'}`;
    }
    function updateResults() {
      const host = document.getElementById('landscapeResults'); if (!host) return;
      const r = results(); host.innerHTML = r.html;
      document.getElementById('landscapeCount').textContent = `${r.matches.length} terms · ${r.groups.length} purpose groups`;
      document.getElementById('landscapeActiveFilters').innerHTML = activeFilters();
      document.querySelectorAll('[data-map-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mapKind === f.kind)));
    }
    const backAndClose = () => `<div class="landscape-dialog-controls">${trail.length ? '<button type="button" class="text-btn" data-map-back>← Previous term</button>' : '<span></span>'}<button type="button" class="icon" data-map-close aria-label="Close reference panel">${icon('close')}</button></div>`;
    function learning(e) {
      const group = model.groups.get(e.group), lessons = e.lessons.map(id => plan.items[id]).filter(Boolean);
      const deckIds = e.id === 'hive' || e.id === 'presto' || e.id === 'trino' ? ['architecture-evolution'] : group.decks;
      return `<section class="landscape-detail-section"><h3>Keep learning</h3><div class="landscape-learning">${lessons.map(l => `<button type="button" data-map-lesson="${esc(l.id)}">${icon('book')}${esc(l.name)} ${icon('arrow')}</button>`).join('')}${deckIds.map(id => plan.decks[id] ? `<a href="${esc(plan.deckBase + plan.decks[id].file)}" target="_blank" rel="noopener">${icon('slides')}${esc(plan.decks[id].title)} ↗</a>` : '').join('')}</div></section>`;
    }
    function detail(e) {
      const incoming = data.entries.filter(x => x.id !== e.id && x.related.some(r => r.to === e.id) && !e.related.some(r => r.to === x.id));
      return `${backAndClose()}<div class="landscape-dialog-title"><span class="eyebrow">${esc(model.groups.get(e.group).name)} · ${kinds[e.kind]}</span><h2 id="landscapeTitle" tabindex="-1">${esc(e.name)}</h2><p>${esc(e.summary)}</p></div><div class="landscape-dialog-body"><dl class="landscape-definition"><div><dt>What it is</dt><dd>${esc(e.what)}</dd></div><div><dt>Why use it</dt><dd>${esc(e.why)}</dd></div><div><dt>What sets it apart</dt><dd>${esc(e.difference)}</dd></div><div class="landscape-good"><dt>Good to know</dt><dd>${esc(e.good)}</dd></div></dl>
        <section class="landscape-detail-section"><div class="landscape-detail-heading"><h3>How it connects</h3><button type="button" class="text-btn" data-map-focus="${e.id}">Show on map ${icon('arrow')}</button></div><div class="landscape-relations"><div class="landscape-origin">${esc(e.name)}</div>${e.related.map(r => `<button type="button" data-map-term="${r.to}"><span aria-hidden="true">↳</span><small>${esc(r.label)}</small><b>${esc(model.entries.get(r.to).name)}</b>${icon('arrow')}</button>`).join('')}</div>${incoming.length ? `<details class="landscape-incoming"><summary>Also connected from ${incoming.length} other ${incoming.length === 1 ? 'term' : 'terms'}</summary><div>${incoming.map(x => termButton(x.id, 'landscape-inline')).join('')}</div></details>` : ''}</section>
        ${learning(e)}<section class="landscape-detail-section"><h3>Primary sources</h3><div class="landscape-source-links">${e.sources.map(id => `<a href="${esc(data.sources[id].url)}" target="_blank" rel="noopener">${esc(data.sources[id].title)} ↗</a>`).join('')}</div><p class="small muted">Reviewed ${esc(data.reviewed)} · exact feature support can change.</p></section></div><div class="landscape-dialog-foot"><button type="button" class="btn" data-map-copy>Copy link to this term</button><span id="landscapeCopyStatus" class="small muted" role="status"></span></div>`;
    }
    function comparison(c) {
      return `${backAndClose()}<div class="landscape-dialog-title"><span class="eyebrow">Different roles, clearer choices</span><h2 id="landscapeTitle" tabindex="-1">${esc(c.name)}</h2></div><div class="landscape-dialog-body"><p class="landscape-compare-answer">${esc(c.answer)}</p><div class="landscape-compare-cards">${c.ids.map(id => { const e = model.entries.get(id); return `<section><span class="eyebrow">${kinds[e.kind]}</span><h3>${esc(e.name)}</h3><p>${esc(e.what)}</p><p class="landscape-compare-diff">${esc(e.difference)}</p><button type="button" class="text-btn" data-map-term="${id}">Explore connections ${icon('arrow')}</button></section>`; }).join('')}</div><p class="small muted">Open a term for its caveats, related lessons and original sources.</p></div>`;
    }
    function open(value, { fromAddress = false, back = false } = {}) {
      const isCompare = value.startsWith('compare/'), id = isCompare ? value.slice(8) : value;
      const item = isCompare ? data.comparisons.find(c => c.id === id) : model.entries.get(id);
      if (!item) return;
      if (!dialog.open) { opener = document.activeElement; openerId = opener?.dataset.mapTerm || null; trail = []; }
      else if (!back && selected && selected !== value) trail.push(selected);
      if (trail.length > 12) trail.shift();
      selected = value;
      dialog.innerHTML = `<div class="landscape-dialog-shell">${isCompare ? comparison(item) : detail(item)}</div>`;
      if (!dialog.open) dialog.showModal();
      if (!fromAddress) setAddress(value);
      dialog.querySelector('.landscape-dialog-body').scrollTop = 0;
      dialog.querySelector('#landscapeTitle').focus({ preventScroll: true });
    }
    function closed() {
      if (dialog.open) return;
      selected = null; trail = []; setAddress(); dialog.innerHTML = '';
      const button = opener?.isConnected ? opener : [...document.querySelectorAll('#view [data-map-term]')].find(b => b.dataset.mapTerm === openerId);
      button?.focus({ preventScroll: true }); opener = null; openerId = null;
    }
    function close() { if (dialog.open) dialog.close(); closed(); }
    dialog.addEventListener('close', closed);
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
    async function copy() {
      const status = document.getElementById('landscapeCopyStatus');
      try { await navigator.clipboard.writeText(location.href); if (status?.isConnected) status.textContent = 'Link copied'; }
      catch { if (status?.isConnected) { status.innerHTML = '<label>Copy this address<input class="landscape-copy-link" readonly aria-label="Term link"></label>'; const input = status.querySelector('input'); input.value = location.href; input.focus(); input.select(); } }
    }
    document.addEventListener('input', e => { if (e.target.id === 'landscapeSearch') { f.query = e.target.value; updateResults(); } });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-map-term],[data-map-compare],[data-map-kind],[data-map-stack],[data-map-group],[data-map-ungroup],[data-map-clear],[data-map-close],[data-map-back],[data-map-copy],[data-map-focus],[data-map-unfocus],[data-map-lesson]');
      if (!b) return;
      if (b.dataset.mapTerm) return open(b.dataset.mapTerm);
      if (b.dataset.mapCompare) return open('compare/' + b.dataset.mapCompare);
      if (b.hasAttribute('data-map-close')) return close();
      if (b.hasAttribute('data-map-back')) { const previous = trail.pop(); if (previous) open(previous, { back: true }); return; }
      if (b.hasAttribute('data-map-copy')) return void copy();
      if (b.dataset.mapLesson) { close(); onLesson(b.dataset.mapLesson); return; }
      if (b.dataset.mapStack) { stackId = b.dataset.mapStack; document.getElementById('landscapeStack').innerHTML = stackView(); document.querySelector(`[data-map-stack="${stackId}"]`).focus({ preventScroll: true }); return; }
      if (b.dataset.mapFocus) { Object.assign(f, { focus: b.dataset.mapFocus, query: '', kind: 'all', group: '' }); close(); document.getElementById('landscapeSearch').value = ''; updateResults(); document.getElementById('landscapeResults').scrollIntoView({ block: 'start' }); return; }
      if (b.dataset.mapKind) f.kind = b.dataset.mapKind;
      if (b.dataset.mapGroup) f.group = f.group === b.dataset.mapGroup ? '' : b.dataset.mapGroup;
      if (b.hasAttribute('data-map-ungroup')) f.group = '';
      if (b.hasAttribute('data-map-unfocus')) f.focus = '';
      if (b.hasAttribute('data-map-clear')) { Object.assign(f, { query: '', kind: 'all', group: '', focus: '' }); document.getElementById('landscapeSearch').value = ''; }
      updateResults();
      if (!b.isConnected) document.getElementById('landscapeSearch').focus({ preventScroll: true });
    });
    function afterRender() {
      if (!routeIsMap()) { close(); return; }
      const address = location.hash.slice('#data-map/'.length);
      if (location.hash.startsWith('#data-map/') && address) {
        if (model.entries.has(address) || data.comparisons.some(c => 'compare/' + c.id === address)) open(address, { fromAddress: true });
        else { close(); setAddress(); }
      }
      else if (dialog.open) close();
    }
    return { render, afterRender, model };
  }
  return Object.freeze({ index, create });
})();
