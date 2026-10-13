(() => {
  const P = window.PLAN, KEY = "ae-prep-tracker-v2";
  const { $, esc, icon, md, pct, dl, today: dayKey } = globalThis.AEUtils;
  const { NOTE_FORMAT, MOD, formatNote, formatLink, formatList, continueList, indentList, inl, mdBlock, formatToolbar } = globalThis.AEEditor;

  // ---------- state ----------
  const Store = window.AEStore, Cloud = window.AECloud, GEN = Store.GENERAL;
  let activeKey = KEY, accountUid = null;
  const { blank, migrate, hasData, trackOf, trackLabel, trackName } = globalThis.AEState.create(P, Store);
  function load() {
    try { return migrate(JSON.parse(localStorage.getItem(KEY))); } catch { return blank(); }
  }
  let S = load();
  const persistLocal = () => { try { localStorage.setItem(activeKey, JSON.stringify(S)); } catch (e) { toast("Couldn't save in the browser: " + e.message, true); } };
  function save() {
    S.savedAt = Date.now(); persistLocal();
    if (Cloud?.info().user) Cloud.schedule(S); else Store.schedule(S, trackLabel);
  }
  // count a meaningful action for the activity history (future heatmap)
  const touch = () => { const d = Store.today(); S.act[d] = (S.act[d] || 0) + 1; };
  const roadmap = globalThis.AEProgress.create(P, () => S);
  const { order, where, allSteps, it, role, ratings, score, isDone, status, statusLabel, required, progress, currentStep, visible } = roadmap;
  const { resolve, LIB, TIME, KINDS, libDone, libLater, setLibDone } = globalThis.AEResources.create(P, roadmap, () => S);
  const { tag, bar, card, chip, roadmap: vRoadmap, skills: vSkills } = globalThis.AEPlanViews.create({ plan: P, roadmap, getState: () => S });

  // ---------- dashboard ----------
  function weekStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function streak() {
    const days = new Set(S.log.map(e => e.d));
    const d = new Date(); let n = 0;
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function weeklyChart() {
    const W = 12, ws = weekStart(new Date()), weeks = [];
    for (let i = W - 1; i >= 0; i--) { const s = new Date(ws); s.setDate(s.getDate() - 7 * i); weeks.push({ s, days: new Set() }); }
    const today = Store.today();
    S.log.forEach(e => {
      if (e.d > today) return;
      const k = weekStart(new Date(e.d + "T12:00:00")).getTime();
      const w = weeks.find(x => x.s.getTime() === k);
      if (w) w.days.add(e.d);
    });
    const cw = 640, ch = 190, pad = 26, bw = (cw - pad) / W - 8;
    const y = v => ch - 20 - (v / 7) * (ch - 34);
    let svg = `<svg viewBox="0 0 ${cw} ${ch}" class="chart" role="img" aria-label="Days with progress entries per week">`;
    [0, 7].forEach(v => { svg += `<text x="${pad - 8}" y="${y(v)}" text-anchor="end" class="axis">${v}</text>`; });
    weeks.forEach((w, i) => {
      const x = pad + i * (bw + 8), v = w.days.size;
      if (v) svg += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" fill="var(--accent)" rx="2"><title>Week of ${dayKey(w.s)}: ${v} ${v === 1 ? "day" : "days"} logged</title></rect>`;
      svg += `<text x="${x + bw / 2}" y="${ch - 5}" text-anchor="middle" class="axis">${w.s.getMonth() + 1}/${w.s.getDate()}</text>`;
    });
    return svg + `</svg>`;
  }

  function vDashboard() {
    const all = progress(required), cur = currentStep();
    const ws = dayKey(weekStart(new Date())), today = Store.today();
    const weekDays = new Set(S.log.filter(e => e.d >= ws && e.d <= today).map(e => e.d)).size;
    const loggedDays = new Set(S.log.map(e => e.d)).size;
    const recent = sortedLog().slice(0, 3);
    const ratedChecks = required.reduce((a, id) => a + ratings(id).filter(v => v >= 2).length, 0);
    const allChecks = required.reduce((a, id) => a + it(id).dod.length, 0);
    const next = cur ? cur.items.filter(id => !isDone(id) && visible(id)) : [];
    return `<div class="page-head"><div><div class="eyebrow">Your progress</div><h2>Dashboard</h2><p class="muted">See how your skills and daily practice are growing.</p></div></div><div class="kpis">
        <div class="kpi"><b>${pct(all.pct)}</b><span>overall (hours-weighted)</span></div>
        <div class="kpi"><b>${required.filter(isDone).length}/${required.length}</b><span>topics done</span></div>
        <div class="kpi"><b>${ratedChecks}/${allChecks}</b><span>checks Solid+</span></div>
        <div class="kpi"><b>${weekDays}d</b><span>logged this week</span></div>
        <div class="kpi"><b>${loggedDays}d</b><span>days logged total</span></div>
        <div class="kpi"><b>${streak()}d</b><span>streak</span></div>
        <div class="kpi"><b>${S.notes.length}</b><span><a href="#notes">notes</a> · ${LIB.filter(x => libDone(x.key)).length} library items done</span></div>
      </div>
      <div class="grid2">
        <div class="panel"><h3>Up next ${cur ? `<span class="muted small">Step ${cur.id} · ${esc(cur.title)}</span>` : ""}</h3>
          ${next.length ? `<div class="cards">${next.map(card).join("")}</div>` : `<p class="muted">Everything done 🎉</p>`}</div>
        <div class="panel"><h3>Days logged per week</h3>${weeklyChart()}<p class="small muted">Each day counts once, however many entries you write.</p></div>
        <div class="panel"><h3>Recent progress</h3>
          ${recent.map(e => `<div class="progress-preview"><a href="#log">${esc(e.d)}</a><div class="nt-body">${mdBlock(e.text)}</div></div>`).join("") || `<p class="muted">Your daily entries will appear here.</p>`}
          <p><a href="#log">Open daily log →</a> · <a href="#todo">To do (${S.todo.filter(e => !e.done).length}) →</a></p></div>
        <div class="panel"><h3>Stages</h3>
          ${P.stages.map(st => { const p = progress(st.steps.flatMap(s => s.items).filter(id => !it(id).opt)); return `<div class="lane-row"><span>${st.n} · ${esc(st.name)}</span>${bar(p.pct)}<span class="small">${pct(p.pct)}</span></div>`; }).join("")}</div>
        <div class="panel wide"><h3>Skill tracks</h3><div class="tracks-grid">
          ${P.tracks.map(t => { const p = progress(order.filter(id => it(id).track === t.id && !it(id).opt)); return `<div class="lane-row"><span>${esc(t.name)}${t.star ? " ⭐" : ""}</span>${bar(p.pct)}<span class="small">${pct(p.pct)}</span></div>`; }).join("")}</div></div>
      </div>`;
  }

  // ---------- resources ----------
  function vResources() {
    const lib = S.ui.res === "lib";
    const tabs = `<div class="tabs"><button class="${lib ? "" : "on"}" data-rtab="topic">By topic</button><button class="${lib ? "on" : ""}" data-rtab="lib">📚 Library <span class="small">${LIB.length}</span></button></div>`;
    return lib ? vLibrary(tabs) : vByTopic(tabs);
  }
  function vByTopic(tabs) {
    const kinds = [...new Set(Object.values(P.L).map(r => r[2]))].sort();
    let h = `<div class="panel">${tabs}<h2>Resources by topic</h2><p class="muted">Every topic with what to learn from, in roadmap order. Tick resources as you finish them — the same ticks appear in each topic's panel and in the Library.</p>
      <div class="filters"><input id="rsearch" type="search" placeholder="Search topics, resources…"> <select id="rkind"><option value="">All kinds</option>${kinds.map(k => `<option>${k}</option>`).join("")}</select></div></div>`;
    P.tracks.forEach(t => {
      const ids = order.filter(id => it(id).track === t.id && visible(id));
      if (!ids.length) return;
      h += `<section class="panel rgroup"><h3>${esc(t.name)}${t.star ? " ⭐" : ""}</h3>`;
      ids.forEach(id => {
        const x = it(id);
        h += `<div class="rtopic"><button class="link-btn" data-open="${id}"><b>${id}</b> · ${esc(x.name)} <span class="muted small">Step ${where[id].step}</span></button><ul class="rlist">`;
        x.learn.map(resolve).forEach(r => {
          h += `<li class="ritem" data-kind="${esc(r.kind)}" data-text="${esc((id + " " + x.name + " " + r.title + " " + r.kind + " " + t.name).toLowerCase())}">${resRow(id, r)}</li>`;
        });
        h += `</ul></div>`;
      });
      h += `</section>`;
    });
    return h;
  }
  function resRow(id, r) {
    const ck = (S.rc[id] || {})[r.key] || S.lib[r.key] === "done";
    const title = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : `<span>${esc(r.title)}</span>`;
    return `<label class="res"><input type="checkbox" data-rc="${id}|${esc(r.key)}" ${ck ? "checked" : ""}><span class="kind k-${esc(r.kind)}">${esc(r.kind)}</span>${title}${r.note ? ` <span class="muted small">— ${esc(r.note)}</span>` : ""}</label>`;
  }
  function filterResources() {
    const q = ($("#rsearch")?.value || "").toLowerCase().trim(), k = $("#rkind")?.value || "";
    document.querySelectorAll(".ritem").forEach(li => { li.hidden = !((!q || li.dataset.text.includes(q)) && (!k || li.dataset.kind === k)); });
    document.querySelectorAll(".rtopic").forEach(tp => { tp.hidden = !tp.querySelector(".ritem:not([hidden])"); });
    document.querySelectorAll(".rgroup").forEach(g => { g.hidden = !g.querySelector(".rtopic:not([hidden])"); });
  }

  // library: pick something to watch / read / listen to
  const libF = { q: "", area: "", kind: "", time: "", status: "todo", ref: false, pick: null };
  const libMatch = (x, skipArea) => (skipArea || !libF.area || x.areas.includes(libF.area))
    && (!libF.kind || x.kind === libF.kind)
    && (libF.time ? x.time === libF.time : libF.ref || x.time !== "ref")
    && (libF.status === "all" || (libF.status === "done" ? libDone(x.key) : libF.status === "later" ? libLater(x.key) : !libDone(x.key)))
    && (!libF.q.trim() || x.text.includes(libF.q.toLowerCase().trim()));
  const libKpis = () => `<div><b>${LIB.length}</b><span>items</span></div><div><b>${LIB.filter(x => libLater(x.key)).length}</b><span>saved ★</span></div><div><b>${LIB.filter(x => libDone(x.key)).length}</b><span>done</span></div>`;
  function vLibrary(tabs) {
    return `<div class="panel">${tabs}<div class="rm-head"><div class="grow"><h2>Library</h2>
      <p class="muted">Everything worth watching, reading or listening to — the roadmap's resources plus talks, channels, podcasts and newsletters, tagged by area. Got a free half hour? Pick a time, then <b>🎲 Pick something</b>. ☆ saves for later; ticking done here also ticks it on its topics.</p></div>
      <div class="kpis small-kpis" id="libKpis">${libKpis()}</div></div>
      <div class="filters"><input id="lq" type="search" placeholder="Search titles, tools, topics…" value="${esc(libF.q)}">
        <select id="lkind" title="Format"><option value="">All formats</option>${KINDS.map(k => `<option value="${k}" ${libF.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select>
        <select id="lstatus" title="Status">${[["todo", "Not done yet"], ["later", "Saved ★"], ["done", "Done"], ["all", "Everything"]].map(([v, l]) => `<option value="${v}" ${libF.status === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <label class="small chk"><input type="checkbox" id="lref" ${libF.ref ? "checked" : ""}> Include reference docs & tools</label>
        <button class="btn primary" data-act="libpick">🎲 Pick something for me</button></div>
      <div id="libChips">${libChips()}</div></div>
      <div id="libList">${libList()}</div>`;
  }
  function libChips() {
    const base = LIB.filter(x => libMatch(x, true));
    const areas = [["", "All areas", base.length], ...P.tracks.map(t => [t.id, t.name, base.filter(x => x.areas.includes(t.id)).length])];
    return `<div class="fchips"><span class="muted small">Time</span>${Object.entries(TIME).map(([k, [ic, lab]]) => `<button class="fchip ${libF.time === k ? "on" : ""}" data-time="${k}">${ic} ${lab}</button>`).join("")}</div>
      <div class="fchips"><span class="muted small">Area</span>${areas.map(([id, n, c]) => `<button class="fchip ${libF.area === id ? "on" : ""}" data-area="${id}" ${c || libF.area === id ? "" : "disabled"}>${esc(n)} <b>${c}</b></button>`).join("")}</div>`;
  }
  function libRow(x) {
    const d = libDone(x.key), l = libLater(x.key), [ic, lab] = TIME[x.time];
    const title = x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : `<span>${esc(x.title)}</span>`;
    return `<div class="lrow ${d ? "done" : ""} ${libF.pick === x.key ? "pick" : ""}" data-key="${esc(x.key)}">
      <input type="checkbox" data-lib="${esc(x.key)}" ${d ? "checked" : ""} title="${d ? "Done — untick to undo" : "Mark as done"}">
      <button class="icon sm ${l ? "on" : ""}" data-act="libsave" data-key="${esc(x.key)}" title="${l ? "Saved for later — click to unsave" : "Save for later"}" ${d ? "disabled" : ""}>${l ? "★" : "☆"}</button>
      <div class="lmain"><div class="ltop"><span class="kind k-${esc(x.kind)}">${esc(x.kind)}</span><span class="tb t-${x.time}">${ic} ${lab}</span>${title}</div>
        ${x.why ? `<div class="small muted">${esc(x.why)}</div>` : ""}
        <div class="ltags">${x.areas.map(a => `<button class="atag ${libF.area === a ? "on" : ""}" data-area="${a}" title="Show everything for ${esc(trackName[a])}">${esc(trackName[a])}</button>`).join("")}
          ${x.topics.slice(0, 6).map(id => `<button class="tchip" data-open="${id}" title="Open ${esc(it(id).name)}">${id}</button>`).join("")}${x.topics.length > 6 ? `<span class="muted small">+${x.topics.length - 6}</span>` : ""}</div></div></div>`;
  }
  function libList() {
    const items = LIB.filter(x => libMatch(x));
    if (!items.length) return `<div class="panel muted">Nothing matches — clear a filter${libF.status !== "all" ? " or set status to <b>Everything</b>" : ""}.</div>`;
    const T = Object.keys(TIME), sort = (a, b) => T.indexOf(a.time) - T.indexOf(b.time) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind);
    if (libF.area) return `<section class="panel lgroup"><h3>${esc(trackName[libF.area])} <span class="muted small">${items.length}</span></h3>${items.sort(sort).map(libRow).join("")}</section>`;
    return P.tracks.map(t => {
      const g = items.filter(x => x.areas[0] === t.id).sort(sort);
      return g.length ? `<section class="panel lgroup"><h3>${esc(t.name)}${t.star ? " ⭐" : ""} <span class="muted small">${g.length}</span></h3>${g.map(libRow).join("")}</section>` : "";
    }).join("");
  }
  function updLib() {
    const l = $("#libList"), c = $("#libChips"), k = $("#libKpis");
    if (l) l.innerHTML = libList();
    if (c) c.innerHTML = libChips();
    if (k) k.innerHTML = libKpis();
  }
  function libPick() {
    let pool = LIB.filter(x => libMatch(x) && !libDone(x.key));
    if (pool.length > 1) pool = pool.filter(x => x.key !== libF.pick);
    if (!pool.length) return toast("Nothing left to pick with these filters");
    libF.pick = pool[Math.floor(Math.random() * pool.length)].key;
    updLib();
    const el = document.querySelector(`.lrow[data-key="${CSS.escape(libF.pick)}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---------- daily journal / to do ----------
  const entryEdit = { log: null, todo: null };
  let entryFocus = null, todoDoneOpen = false;
  const sortedLog = () => S.log.map((e, i) => ({ e, i })).sort((a, b) => b.e.d.localeCompare(a.e.d) || b.i - a.i).map(x => x.e);
  const entryKey = (kind, id) => `${kind}:${id ? "edit:" + id : "new"}`;
  function entryForm(kind, entry) {
    const key = entryKey(kind, entry?.id), editing = !!entry, journal = kind === "log";
    if (!journal) {
      const value = drafts[key] ?? entry?.text ?? "", track = drafts[key + ":t"] ?? entry?.track ?? GEN;
      // Older multi-line items remain editable without flattening their text.
      const field = value.includes("\n") ? `<textarea name="text" aria-label="To do item" required>${esc(value)}</textarea>` : `<input type="text" name="text" aria-label="To do item" placeholder="Something to follow up on…" value="${esc(value)}" required>`;
      return `<form class="entryform todoform" data-kind="todo" data-key="${esc(key)}" ${editing ? `data-id="${esc(entry.id)}"` : ""}>
        <div class="todo-add-row">${field}<select name="track" aria-label="Track">${trackOpts(track)}</select><button class="btn primary">${editing ? "Save" : "Add to do"}</button></div>
        ${editing ? `<div><button type="button" class="btn" data-act="entrycancel" data-kind="todo">Cancel</button></div>` : ""}
      </form>`;
    }
    return `<form class="entryform" data-kind="${kind}" data-key="${esc(key)}" ${editing ? `data-id="${esc(entry.id)}"` : ""}>
      ${journal ? `<label class="entry-date">Date<input type="date" name="d" value="${esc(drafts[key + ":d"] ?? entry?.d ?? Store.today())}" required></label>` : ""}
      <div class="editor-shell">${formatToolbar()}
      <textarea name="text" aria-label="${journal ? "Daily progress" : "To do item"}" placeholder="${journal ? "What did you work on or learn today? Write it however you like…" : "Something to look up, try, read or come back to…"}" required>${esc(drafts[key] ?? entry?.text ?? "")}</textarea></div>
      <div class="row form-actions"><button class="btn primary sm">${editing ? "Save changes" : journal ? "Save entry" : "Add to do"}</button>
        ${editing ? `<button type="button" class="btn sm" data-act="entrycancel" data-kind="${kind}">Cancel</button>` : ""}
        <span class="small muted">${MOD}Enter to save</span></div>
    </form>`;
  }
  function entryCard(kind, entry) {
    if (entryEdit[kind] === entry.id) return `<article class="nt editing">${entryForm(kind, entry)}</article>`;
    const journal = kind === "log";
    return `<article class="nt ${journal ? "journal-entry" : "todo-entry"} ${entry.done ? "completed" : ""}">
      <div class="nt-head">
        ${journal ? `<time class="nt-title" datetime="${esc(entry.d)}">${esc(entry.d)}</time>` : `<div class="todo-check"><input type="checkbox" data-todo="${esc(entry.id)}" ${entry.done ? "checked" : ""} aria-label="Mark ${esc(entry.text.split("\n")[0].slice(0, 100))} ${entry.done ? "incomplete" : "complete"}"><div class="nt-body">${mdBlock(entry.text)}</div></div>`}
        ${journal ? "" : `<span class="ttag todo-track">${esc(trackLabel(entry.track || GEN))}</span>`}
        <div class="nt-tools"><button class="icon sm" data-act="entryedit" data-kind="${kind}" data-id="${esc(entry.id)}" title="Edit ${journal ? "entry" : "to do"}">${icon("edit")}</button>
          <button class="icon sm" data-act="entrydelete" data-kind="${kind}" data-id="${esc(entry.id)}" title="Delete ${journal ? "entry" : "to do"}">${icon("trash")}</button></div>
      </div>${journal ? `<div class="nt-body">${mdBlock(entry.text)}</div>` : ""}
    </article>`;
  }
  function vLog() {
    const rows = sortedLog();
    return `<div class="page-head"><div><div class="eyebrow">Daily practice</div><h2>Daily progress log</h2><p class="muted">What you worked on, what you learned, and what comes next.</p></div></div><section class="panel composer"><h3>Write an entry</h3>${entryForm("log")}</section>
      <div class="section-head"><h3>Previous entries</h3><span class="small muted">${rows.length} ${rows.length === 1 ? "entry" : "entries"}</span></div><div class="nlist">${rows.map(e => entryCard("log", e)).join("") || `<div class="panel muted">No entries yet. Start with a few lines about today.</div>`}</div>`;
  }
  function vTodo() {
    const pending = S.todo.filter(e => !e.done).reverse(), done = S.todo.filter(e => e.done).reverse();
    return `<div class="page-head"><div><div class="eyebrow">Keep it for later</div><h2>To do</h2><p class="muted">A place for things you want to look up, try, or come back to.</p></div></div><div class="panel composer">${entryForm("todo")}</div>
      <div class="section-head"><h3>To follow up</h3><span class="small muted">${pending.length} ${pending.length === 1 ? "item" : "items"}</span></div><div class="panel todo-list"><div class="nlist">${pending.map(e => entryCard("todo", e)).join("") || `<div class="empty-state">Nothing waiting. Capture an idea whenever it comes up.</div>`}</div></div>
      ${done.length ? `<details class="todo-completed" id="todoCompleted" ${todoDoneOpen || done.some(e => entryEdit.todo === e.id) ? "open" : ""}><summary>Completed (${done.length})</summary><div class="nlist">${done.map(e => entryCard("todo", e)).join("")}</div></details>` : ""}`;
  }
  function cancelEntry(kind) {
    if (!Object.hasOwn(entryEdit, kind)) return;
    const key = entryKey(kind, entryEdit[kind]);
    if (entryEdit[kind]) { delete drafts[key]; delete drafts[key + ":d"]; delete drafts[key + ":t"]; }
    entryEdit[kind] = null;
  }
  function clearEntryDrafts() {
    ["log", "todo"].forEach(kind => { cancelEntry(kind); delete drafts[entryKey(kind)]; delete drafts[entryKey(kind) + ":d"]; delete drafts[entryKey(kind) + ":t"]; });
    entryFocus = null;
  }
  function clearDrafts() {
    clearEntryDrafts();
    for (const key of Object.keys(drafts)) delete drafts[key];
    noteEdit = null; focusKey = null; noteExpanded.clear();
    practice.reset();
  }
  function saveEntry(form) {
    const { kind, key, id } = form.dataset;
    if (!Object.hasOwn(entryEdit, kind)) return;
    const text = form.text.value.trimEnd();
    if (!text.trim()) return toast("Write something first 🙂");
    const d = kind === "log" ? form.d.value : null;
    if (kind === "log" && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return toast("Choose a date for this entry.");
    const now = Store.today(), track = kind === "todo" ? (trackName[form.track.value] ? form.track.value : GEN) : null;
    if (id) {
      const entry = S[kind].find(e => e.id === id);
      if (!entry) return toast("This entry is no longer here. Copy your text to a new entry.", true);
      entry.text = text; entry.u = now; if (d) entry.d = d; if (track) entry.track = track;
      entryEdit[kind] = null;
    } else {
      S[kind].push({ id: Store.uid(), text, c: now, u: now, ...(d ? { d } : { done: false, track }) });
      entryFocus = key;
    }
    delete drafts[key]; delete drafts[key + ":d"]; delete drafts[key + ":t"];
    touch(); save(); rerender();
  }
  function focusEntry() {
    const key = entryFocus; entryFocus = null;
    const ta = key && document.querySelector(`.entryform[data-key="${CSS.escape(key)}"] [name="text"]`);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  // ---------- notes ----------
  const noteExpanded = new Set();
  const NF = { track: "", q: "" };      // Notes view: selected bucket ("" = all) and search
  const drafts = {};                     // unsaved text per form key — survives re-renders
  let noteEdit = null, focusKey = null;  // noteEdit = "v:<id>" (Notes view) or "d:<id>" (drawer)
  const noteSort = list => list.map((n, i) => [n, i]).sort((a, b) => (b[0].u || "").localeCompare(a[0].u || "") || b[1] - a[1]).map(x => x[0]);
  const trackOpts = sel => `<option value="${GEN}" ${sel === GEN ? "selected" : ""}>General</option>` + P.tracks.map(t => `<option value="${t.id}" ${sel === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  function noteForm(key, { text = "", track = GEN, topic = "", nid = "", pick = true } = {}) {
    const tv = drafts[key + ":t"] ?? track;
    return `<form class="nform" data-key="${esc(key)}" ${nid ? `data-nid="${esc(nid)}"` : ""} ${topic ? `data-topic="${esc(topic)}"` : ""}>
      <div class="editor-shell">${formatToolbar("Note formatting")}
      <textarea name="text" aria-label="Note text" placeholder="${nid ? "" : "Title on the first line, then your note…"}">${esc(drafts[key] ?? text)}</textarea></div>
      <div class="row form-actions">${pick ? `<select name="track" title="Track">${trackOpts(tv)}</select>` : ""}
        <button class="btn primary sm">${nid ? "Save" : "Add note"}</button>${nid ? `<button type="button" class="btn sm" data-act="ncancel">Cancel</button>` : ""}
        <span class="muted small">${MOD}Enter to save</span></div></form>`;
  }
  function noteCard(n, inDrawer) {
    const k = (inDrawer ? "d:" : "v:") + n.id;
    if (noteEdit === k) return `<div class="nt editing">${noteForm("e" + k, { text: n.text, track: n.track, nid: n.id })}</div>`;
    const [first, ...rest] = n.text.split("\n"), body = rest.join("\n").trim();
    const text = [n.text, trackLabel(n.track), n.topic ? n.topic + " " + it(n.topic).name : ""].join(" ").toLowerCase();
    return `<div class="nt" data-text="${esc(text)}">
      <div class="nt-head">${body ? `<details class="note-content" data-note-key="${esc(k)}" ${noteExpanded.has(k) ? "open" : ""}><summary><span class="nt-title">${inl(first)}</span></summary><div class="nt-body">${mdBlock(body)}</div></details>` : `<div class="nt-title">${inl(first)}</div>`}<span class="nt-tools"><button class="icon sm" data-act="nedit" data-nk="${esc(k)}" title="Edit">${icon("edit")}</button><button class="icon sm" data-act="ndel" data-nid="${esc(n.id)}" title="Delete">${icon("trash")}</button></span></div>
      <div class="nt-foot small muted">${inDrawer ? "" : `<span class="ttag">${esc(trackLabel(n.track))}</span>`}${n.topic && !inDrawer ? `<button class="tchip" data-open="${n.topic}" title="Open topic">${n.topic} · ${esc(it(n.topic).name)}</button>` : ""}<span class="nt-date">${esc(n.u || n.c || "")}</span></div></div>`;
  }
  function vNotes() {
    const cnt = {}; S.notes.forEach(n => cnt[n.track] = (cnt[n.track] || 0) + 1);
    const sel = NF.track, list = noteSort(S.notes.filter(n => !sel || n.track === sel));
    const b = (id, name) => `<button class="nb ${sel === id ? "on" : ""} ${id && !cnt[id] ? "empty" : ""}" data-nb="${id}"><span>${esc(name)}</span><b>${id ? cnt[id] || 0 : S.notes.length}</b></button>`;
    return `<div class="page-head"><div class="grow"><div class="eyebrow">Your knowledge</div><h2>Notes</h2>
        <p class="muted">Keep what you learn, organized by track. Click a note to expand it.</p></div>
        <div class="page-actions"><button class="btn" data-act="notesexpand">Expand all</button><button class="btn" data-act="notescollapse">Collapse all</button><button class="btn" data-act="exportmd" ${S.notes.length ? "" : "disabled"}>Download Markdown</button></div></div>
      <div class="notes-layout"><aside class="panel nside">${b("", "All notes")}${b(GEN, "General")}<div class="nsep"></div>${P.tracks.map(t => b(t.id, t.name)).join("")}</aside>
      <div class="nmain"><div class="panel nadd composer"><h3>Write a note</h3>${noteForm("new:" + (sel || "all"), { track: sel || GEN })}</div>
        ${S.notes.length ? `<div class="filters"><input id="nq" type="search" placeholder="Search ${sel ? esc(trackLabel(sel)) + " " : ""}notes…" value="${esc(NF.q)}"></div>` : ""}
        <div class="nlist" id="nlist">${list.map(n => noteCard(n)).join("") || `<div class="panel muted">No notes ${sel ? "in " + esc(trackLabel(sel)) + " " : ""}yet — type above and press <b>Add note</b>.</div>`}</div>
        <p class="muted" id="nnone" hidden>No notes match your search.</p></div></div>`;
  }
  function filterNotes() {
    const q = NF.q.toLowerCase().trim(); let any = false;
    const all = document.querySelectorAll("#nlist .nt");
    all.forEach(el => { const ok = !q || el.classList.contains("editing") || (el.dataset.text || "").includes(q); el.hidden = !ok; any = any || ok; });
    const nn = $("#nnone"); if (nn) nn.hidden = any || !all.length;
  }
  function drawerNotes(id) {
    const tr = it(id).track, mine = noteSort(S.notes.filter(n => n.topic === id)), all = S.notes.filter(n => n.track === tr).length;
    return `<section class="notes-sec"><h4>Notes <span class="muted small">saved under ${esc(trackLabel(tr))}</span></h4>
      ${noteForm("dnew:" + id, { topic: id, pick: false })}
      <div class="nlist">${mine.map(n => noteCard(n, true)).join("")}</div>
      ${all ? `<p class="small"><a href="#notes" data-nb="${tr}">All ${esc(trackLabel(tr))} notes (${all}) →</a></p>` : ""}</section>`;
  }
  function saveNote(f) {
    const key = f.dataset.key, text = f.text.value.replace(/\s+$/, "").replace(/^\s*\n/, "");
    if (!text.trim()) return toast("Write something first 🙂");
    const now = Store.today(), track = f.track ? f.track.value : null;
    if (f.dataset.nid) {
      const n = S.notes.find(x => x.id === f.dataset.nid);
      if (!n) return;
      n.text = text; if (track) n.track = track; n.u = now; noteEdit = null;
    } else {
      const topic = f.dataset.topic, n = { id: Store.uid(), track: topic ? trackOf(topic) : track || GEN, text, c: now, u: now };
      if (topic) n.topic = topic;
      S.notes.push(n); focusKey = key;
      if (!topic && NF.track && n.track !== NF.track) toast(`Saved to ${trackLabel(n.track)} ✓`);
    }
    delete drafts[key]; delete drafts[key + ":t"];
    touch(); save(); rerender();
  }
  function focusNote() {
    const k = focusKey; focusKey = null;
    const ta = k && document.querySelector(`.nform[data-key="${CSS.escape(k)}"] textarea`);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function exportMd() {
    const parts = [GEN, ...P.tracks.map(t => t.id)].map(t => [t, S.notes.filter(n => n.track === t)]).filter(([, l]) => l.length)
      .map(([t, l]) => Store.fileMd(t, trackLabel(t), l).replace(/^---\n[\s\S]*?\n---\n\n/, "").replace(/<!-- AE roadmap[^\n]*-->\n\n/, "").replace(/^# (.*) — notes\n/, "# $1\n"));
    dl(`# Analytics engineer notes\n\n_Exported ${Store.today()} · ${S.notes.length} notes_\n\n${parts.join("\n")}`, `ae-notes-${Store.today()}.md`, "text/markdown");
  }
  // maps a notes/*.md file without front matter to its track
  const fileTrack = n => n.toLowerCase() === "general.md" ? GEN : (P.tracks.find(t => Store.slug(t.name) + ".md" === n.toLowerCase()) || {}).id;

  // ---------- drawer ----------
  let openId = null;
  function renderDrawer() {
    const d = $("#drawer");
    document.body.classList.toggle("drawer-open", !!openId);
    if (!openId) { d.innerHTML = ""; return; }
    const scroll = d.querySelector(".dr-scroll")?.scrollTop || 0;
    const id = openId, x = it(id), w = where[id], r = ratings(id), st = status(id);
    const idx = order.indexOf(id), prev = order[idx - 1], next = order[idx + 1];
    const pc = S.pc[id] || [];
    d.innerHTML = `<div class="dr-head" style="--rc:${role(id).color}">
        <div class="dr-nav"><button class="icon" data-open="${prev || ""}" ${prev ? "" : "disabled"} title="Previous topic">‹</button>
        <button class="icon" data-open="${next || ""}" ${next ? "" : "disabled"} title="Next topic">›</button>
        <span class="muted small">Stage ${w.stage} · Step ${w.step} · ${esc(trackName[x.track])}</span>
        <button class="icon close" data-act="close" title="Close (Esc)">✕</button></div>
        <div class="card-top">${tag(id)}${x.opt ? '<span class="tag opt">optional</span>' : ""}<span class="cid">${id}</span><span class="muted small">~${x.h}h</span><span class="st st-${st}">${st === "done" ? "✓ " : ""}${statusLabel[st]}</span></div>
        <h2>${esc(x.name)}</h2>${bar(score(id), "thick")}</div>
      <div class="dr-scroll">
        ${x.prerequisites?.length ? `<section><h4>Finish these first</h4><div class="chips">${x.prerequisites.map(chip).join("")}</div><p class="small muted">Earlier topics in this step can be prerequisites too. Open a topic to check its definition of done.</p></section>` : ""}
        <section><h4>What it covers</h4><p>${md(x.c)}</p></section>
        ${x.setup ? `<section class="setup-box"><h4>🔧 Set up first <span class="muted small">only what this topic needs</span></h4><ul>${x.setup.map(t => `<li>${md(t)}</li>`).join("")}</ul></section>` : ""}
        <section><h4>Definition of done <span class="muted small">rate yourself honestly — Done when every line is Solid or Confident</span></h4>
          <div class="dod">${x.dod.map((t, i) => `<div class="dod-row r${r[i]}"><div class="dod-text">${md(t)}</div>
            <div class="seg">${P.rating.map((lab, v) => `<button class="${r[i] === v ? "on v" + v : ""}" data-rate="${id}|${i}|${v}">${lab}</button>`).join("")}</div></div>`).join("")}</div>
          <p class="small muted">Progress ${pct(score(id))} (Shaky counts 40%, Solid or Confident 100%). Re-rate a few weeks later — knowledge fades; a second Solid counts more than the first.</p></section>
        <section><h4>How to practice</h4><div class="checks">${x.practice.map((t, i) => `<label><input type="checkbox" data-pc="${id}|${i}" ${pc[i] ? "checked" : ""}> <span>${md(t)}</span></label>`).join("")}</div></section>
        <section><h4>Learn from</h4><div class="res-list">${x.learn.map(resolve).map(rr => resRow(id, rr)).join("")}</div></section>
        ${drawerNotes(id)}
        <section><h4>Daily progress</h4><p class="small muted">Write about what you worked on in your daily log.</p><button class="btn" data-act="dailylog">Open daily log →</button></section>
      </div>`;
    d.querySelector(".dr-scroll").scrollTop = scroll;
  }
  function openItem(id) {
    if (!id || !P.items[id]) return;
    const changed = openId !== id;
    if (changed && noteEdit && noteEdit.startsWith("d:")) noteEdit = null;
    openId = id; renderDrawer();
    if (changed) $("#drawer .dr-scroll").scrollTop = 0;
    document.querySelectorAll(".card.sel,.chip.sel,.schip.sel").forEach(e => e.classList.remove("sel"));
    document.querySelectorAll(`[data-open="${id}"]`).forEach(e => { if (!e.closest("#drawer")) e.classList.add("sel"); });
  }

  // ---------- routing / render ----------
  const practice = globalThis.AEPractice.create({ catalog: globalThis.AEPracticeCatalog, getState: () => S, save, touch, toast });
  $("#trackerSubnav").innerHTML = practice.model.tools.map(t => `<a href="#trackers/${esc(t.id)}">${esc(t.name)}</a>`).join("");
  const views = { trackers: practice.hub, ...Object.fromEntries(practice.model.tools.map(t => ["trackers/" + t.id, () => practice.toolView(t.id)])), roadmap: vRoadmap, skills: vSkills, dashboard: vDashboard, resources: vResources, notes: vNotes, log: vLog, todo: vTodo };
  const ALIAS = { kb: "notes", knowledge: "notes", interview: "roadmap", library: "resources" };
  function route() {
    let r = location.hash.replace("#", "");
    if (ALIAS[r]) { if (r === "library") S.ui.res = "lib"; r = ALIAS[r]; history.replaceState(null, "", "#" + r); }
    return views[r] ? r : "roadmap";
  }
  function render() {
    const r = route();
    $("#view").dataset.route = r;
    $("#view").innerHTML = views[r]();
    $("#trackerSubnav").hidden = !r.startsWith("trackers");
    $("#trackerNavLink").setAttribute("aria-expanded", String(r.startsWith("trackers")));
    document.querySelectorAll("nav a").forEach(a => {
      const active = a.getAttribute("href") === "#" + r;
      a.classList.toggle("active", active || (a.id === "trackerNavLink" && r.startsWith("trackers/"))); a.setAttribute?.("aria-current", active ? "page" : "false");
      if (active && matchMedia("(max-width: 1049px)").matches) {
        const nav = a.closest("nav"), box = a.getBoundingClientRect(), rail = nav.getBoundingClientRect();
        if (box.left < rail.left || box.right > rail.right) nav.scrollLeft += box.left - rail.left;
      }
    });
    if (openId) document.querySelectorAll(`#view [data-open="${openId}"]`).forEach(e => e.classList.add("sel"));
    if (r === "resources" && S.ui.res !== "lib") filterResources();
    if (r === "notes") {
      filterNotes();
      if (matchMedia("(max-width: 900px)").matches) {
        const selected = $(".nside .nb.on"), container = selected?.parentElement;
        if (container) container.scrollLeft = Math.max(0, selected.offsetLeft - 12);
      }
    }
    practice.afterRender();
    focusEntry();
  }
  const rerender = () => { render(); renderDrawer(); focusNote(); };

  // ---------- sample / io ----------
  function sample() {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const s = blank();
    const doneSteps = ["0.1", "1.1", "1.2", "1.3", "1.4"], partial = ["1.5", "2.1"];
    allSteps.forEach(sp => sp.items.forEach(id => {
      const x = it(id);
      if (doneSteps.includes(sp.id)) {
        s.r[id] = x.dod.map(() => 2 + (rnd() > 0.5 ? 1 : 0));
        s.pc[id] = x.practice.map(() => true);
        s.rc[id] = Object.fromEntries(x.learn.map(resolve).map(r => [r.key, rnd() > 0.3]));
      } else if (partial.includes(sp.id)) {
        s.r[id] = x.dod.map(() => Math.floor(rnd() * 3));
        s.pc[id] = x.practice.map(() => rnd() > 0.5);
      }
    }));
    s.g["s0-0"] = true;
    const ids = allSteps.filter(sp => doneSteps.concat(partial).includes(sp.id)).flatMap(sp => sp.items);
    for (let i = 70; i >= 0; i--) {
      if (rnd() < 0.45) continue;
      const d = new Date(); d.setDate(d.getDate() - i);
      const id = ids[Math.floor(rnd() * ids.length)];
      s.log.push({ id: Store.uid() + "-" + i, d: dayKey(d), text: `Worked on ${it(id).name}.\nTried an exercise and wrote down what I learned.`, c: dayKey(d), u: dayKey(d) });
      s.act[dayKey(d)] = 1 + Math.floor(rnd() * 6);
    }
    const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
    const N = (track, n, text, topic) => Object.assign({ id: Store.uid() + Math.floor(rnd() * 1e4), track, text, c: day(n), u: day(n) }, topic ? { topic } : {});
    s.notes = [
      N("sql", 20, "LAST_VALUE needs an explicit window frame\nThe default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, so it returns the current row.\nUse `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.", "S1"),
      N("sql", 18, "Keep only the latest row per key\n```sql\nselect *\nfrom events\nqualify row_number() over (partition by user_id order by event_ts desc) = 1\n```", "S1"),
      N("sql", 15, "ROW_NUMBER vs RANK vs DENSE_RANK\n- ROW_NUMBER: unique 1..n — use for dedup\n- RANK: ties share a rank, then a gap (1, 1, 3)\n- DENSE_RANK: ties share a rank, no gap (1, 1, 2)"),
      N("model", 12, "Write the grain down first\nMixing order-level and line-level measures in one fact double-counts when summed. One sentence: **one row per …**", "M1"),
      N("py", 6, "Generators keep memory flat\n`for line in open(path)` + `yield` streams a 10 GB JSONL file in constant memory; a list comprehension loads all of it.", "Py1"),
      N(GEN, 3, "Kimball techniques cheat sheet\nhttps://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/\nSCD types, fact table types, bridge tables."),
    ];
    s.lib = { ytKahanStar: "done", ytCafferkyDim: "later", podAE: "later", arWhatIsAE: "done" };
    s.savedAt = Date.now();
    s.todo = [{ id: Store.uid(), text: "Try FILTER for conditional SQL counts", done: false, c: Store.today(), u: Store.today() }];
    return migrate(s);
  }
  const download = () => dl(JSON.stringify(S, null, 2), `ae-roadmap-progress-${dayKey(new Date())}.json`, "application/json");

  // ---------- toast ----------
  let toastT = null;
  function toast(msg, bad) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.className = "show" + (bad ? " bad" : "");
    clearTimeout(toastT); toastT = setTimeout(() => t.className = "", bad ? 7000 : 3000);
  }

  // ---------- data folder ----------
  const guard = p => Promise.resolve(p).catch(e => {
    if (e && e.name === "AbortError") return;
    console.error(e); toast((e && e.message) || String(e), true); updatePill();
  });
  function updatePill() {
    const i = Store.info(), b = $("#dataBtn");
    if (!b) return;
    const cloud = Cloud?.info();
    const accountButton = $("#cloudBtn");
    if (accountButton) {
      accountButton.hidden = !cloud?.configured;
      accountButton.textContent = cloud?.user ? "Google account" : "Sign in with Google";
      accountButton.dataset.act = cloud?.user ? "data" : "cloudsignin";
    }
    if (cloud?.configured && cloud.user) {
      const labels = { synced: "Cloud saved", saving: "Saving…", offline: "Offline · saved here", connecting: "Connecting…", error: "Sync needs attention" };
      b.textContent = labels[cloud.status] || "Connecting…";
      b.className = "btn pill" + (cloud.status === "synced" ? " ok" : ["offline", "error"].includes(cloud.status) ? " warn" : "");
      b.title = cloud.error || `Signed in as ${cloud.user.email}${cloud.pending ? ` · ${cloud.pending} changes waiting to sync` : ""}`;
      if ($("#dataDlg").open) renderData();
      renderCloudGate(); return;
    }
    renderCloudGate();
    const ok = i.state === "connected" && !i.err, warn = i.state === "locked" || !!i.err;
    b.textContent = i.state === "connected" ? (i.err ? "Save failed" : i.name) : i.state === "locked" ? "Reconnect folder" : "Browser only";
    b.className = "btn pill" + (ok ? " ok" : warn ? " warn" : "");
    b.title = i.state === "connected" ? `Saving to folder “${i.name}”${i.lastSaved ? " · last saved " + i.lastSaved.toLocaleTimeString() : ""}` : "Where your progress is stored";
    if ($("#dataDlg").open) renderData();
  }
  function renderData() {
    const i = Store.info();
    let status;
    if (i.state === "unsupported") status = `<div class="note warn">This browser can't save to a folder. Open the page in <b>Microsoft Edge</b> or <b>Google Chrome</b> — or use Export / Import below.</div>`;
    else if (i.state === "connected") status = `<div class="note ok">📁 Saving to folder <b>${esc(i.name)}</b>${i.lastSaved ? ` · last saved ${i.lastSaved.toLocaleTimeString()}` : ""}${i.err ? `<br>⚠️ ${esc(i.err)}` : ""}</div>
      <div class="row"><button class="btn" data-act="fsreload">↻ Reload from folder</button><button class="btn" data-act="fspick">Switch folder…</button><button class="btn" data-act="fsdisconnect">Disconnect</button></div>`;
    else if (i.state === "locked") status = `<div class="note warn">Your data folder <b>${esc(i.name)}</b> needs permission again — browsers ask once per session (pick <i>Allow on every visit</i> if offered). Until then changes are kept in this browser.</div>
      <div class="row"><button class="btn primary" data-act="fsunlock">🔓 Reconnect “${esc(i.name)}”</button><button class="btn" data-act="fspick">Choose another folder…</button><button class="btn" data-act="fsdisconnect">Forget it</button></div>`;
    else status = `<div class="note">Right now everything lives only in this browser's storage — clearing site data or switching computers loses it.</div>
      <div class="row"><button class="btn primary" data-act="fspick">📁 Connect a data folder…</button></div>`;
    const cloud = Cloud?.info();
    if (cloud?.configured && cloud.user) {
      const labels = { synced: "Your changes are saved to the cloud.", saving: "Saving your changes…", offline: "Your changes are saved on this device and will sync when you reconnect.", connecting: "Connecting to your saved progress…", error: "Your local changes are retained. Cloud syncing needs attention." };
      $("#dataDlg").innerHTML = `<form method="dialog" class="dlg-x"><button class="icon" title="Close">✕</button></form>
        <h2>Your data</h2><p class="muted">${esc(cloud.user.email)}</p>
        <div class="note ${cloud.status === "synced" ? "ok" : "warn"}">${labels[cloud.status] || "Connecting…"}${cloud.error ? `<p>${esc(cloud.error)}</p>` : ""}${cloud.pending ? `<p class="small">${cloud.pending} changes waiting to sync.</p>` : ""}</div>
        <div class="row"><button class="btn" data-act="cloudretry">Sync now</button><button class="btn" data-act="cloudsignout" ${cloud.pending ? "disabled" : ""}>Sign out</button></div>
        ${cloud.candidate ? `<div class="note"><p>This browser also has earlier local progress. You can add entries missing from the cloud; existing cloud entries are kept.</p><button class="btn" data-act="cloudimportlocal">Add earlier local progress</button></div>` : ""}
        <h4>Backup & restore</h4><p class="small muted">Export a copy whenever you want. Import replaces the signed-in account’s current data on all devices.</p>
        <div class="row"><button class="btn" data-act="export">Export JSON</button><button class="btn" data-act="import">Import JSON</button><button class="btn" data-act="exportmd" ${S.notes.length ? "" : "disabled"}>Notes as Markdown</button></div>`;
      return;
    }
    $("#dataDlg").innerHTML = `<form method="dialog" class="dlg-x"><button class="icon" title="Close">✕</button></form>
      <h2>Your data</h2>${cloud?.configured ? `<div class="note"><p>Sign in to sync your tracker across devices.</p><button class="btn primary" data-act="cloudsignin">Continue with Google</button></div>` : ""}${status}
      <h4>What's saved in the folder</h4>
      <ul class="small"><li><code>progress.json</code> — ratings, practice and resource ticks, library, daily log and to dos</li>
        <li><code>notes/</code> — your notes as Markdown, one file per track (<code>general.md</code> for the rest). Open and edit them in VS Code, Obsidian or GitHub; changes show up here when you return to this tab. An older <code>knowledge/</code> folder is imported once and left untouched.</li>
        <li><code>backups/</code> — a full snapshot each day you use it (last 14 kept). Restore one with Import.</li></ul>
      <h4>Moving to your personal laptop</h4>
      <ol class="small"><li>Keep the data folder somewhere synced or versioned: personal OneDrive / Dropbox, or a <b>private GitHub repo</b> (you also get a history of your notes).</li>
        <li>Copy the entire <code>ae-tracker/</code> app folder — keep it <b>separate</b> from the data folder so app updates never touch your data.</li>
        <li>Open <code>index.html</code> in Edge or Chrome → 💾 → <b>Connect a data folder</b> → pick the same folder.</li></ol>
      <h4>Backup & tools</h4>
      <div class="row"><button class="btn" data-act="export">⬇ Export JSON</button><button class="btn" data-act="import">⬆ Import JSON</button><button class="btn" data-act="exportmd" ${S.notes.length ? "" : "disabled"}>⬇ Notes as Markdown</button><button class="btn" data-act="sample">Sample data</button><button class="btn danger" data-act="reset">Reset</button></div>`;
  }
  // Decide between the folder copy and this browser's copy, then load/write.
  async function syncFolder(reason) {
    if (Cloud?.info().user) return;
    const f = await Store.read(fileTrack), name = Store.info().name;
    if (f.empty) {
      Store.schedule(S, trackLabel); await Store.flush();
      toast(`Saved everything to “${name}” ✓`);
    } else {
      const fs = migrate(Object.assign({}, f.progress && f.progress.data, { notes: f.notes, kb: f.kb, savedAt: (f.progress && f.progress.savedAt) || 0 }));
      const localNewer = hasData(S) && S.savedAt > fs.savedAt + 2000;
      if (localNewer && (reason === "connect" || reason === "unlock" || reason === "startup") &&
        confirm(`This browser has changes newer than the folder “${name}”.\n\nOK = keep this browser's copy and write it to the folder\nCancel = load the folder's copy`)) {
        // older knowledge/ files: keep any entries the browser doesn't have yet
        if (f.kb) { const have = new Set(S.notes.map(n => n.id)); S.notes.push(...fs.notes.filter(n => !have.has(n.id))); }
        save(); await Store.flush(); toast(`Folder “${name}” updated ✓`);
      } else {
        S = fs; persistLocal();
        Store.schedule(S, trackLabel); // normalises hand-written Markdown (adds ids)
        if (reason !== "startup") toast(reason === "external" ? "Picked up changes from the folder ✓" : `Loaded from “${name}” ✓`);
      }
    }
    Store.backup(S).catch(() => {});
    rerender(); updatePill();
  }
  const folderNote = () => Cloud?.info().user ? "\n\nThis replaces data in your cloud account and syncs to your other devices." : Store.info().state === "connected" ? `\n\nThis also changes the data folder “${Store.info().name}” (today's backup in backups/ stays).` : "";

  // ---------- theme ----------
  const sysDark = matchMedia("(prefers-color-scheme: dark)");
  const curTheme = () => document.documentElement.dataset.theme || (sysDark.matches ? "dark" : "light");
  function themeLabel() {
    const b = $("#themeBtn"); if (!b) return;
    const dark = curTheme() === "dark", label = dark ? "Switch to light theme" : "Switch to dark theme";
    b.innerHTML = icon(dark ? "sun" : "moon"); b.title = label; b.setAttribute?.("aria-label", label);
  }
  function toggleTheme() {
    const t = curTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t; localStorage.setItem("ae-theme", t); themeLabel();
  }
  sysDark.addEventListener("change", themeLabel);
  const setHeaderH = () => document.documentElement.style.setProperty("--hh", (matchMedia("(min-width: 1050px)").matches ? 0 : $("header").offsetHeight) + "px");
  window.addEventListener("resize", setHeaderH);
  setHeaderH();

  // ---------- events ----------
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open],[data-rate],[data-act],[data-nb],[data-rtab],[data-area],[data-time],[data-note-format],[data-list]");
    if (!t || t.disabled) return;
    if (t.dataset.list) return formatList($("textarea", t.closest(".editor-shell")), t.dataset.list === "number");
    if (t.dataset.noteFormat === "link") return formatLink($("textarea", t.closest(".editor-shell")));
    if (t.dataset.noteFormat) return formatNote($("textarea", t.closest(".editor-shell")), NOTE_FORMAT[t.dataset.noteFormat]);
    if (t.dataset.open !== undefined) { if (t.tagName === "BUTTON") e.preventDefault(); return openItem(t.dataset.open); }
    if (t.dataset.rate) {
      const [id, i, v] = t.dataset.rate.split("|");
      const a = ratings(id); a[+i] = +v; S.r[id] = a; touch(); save(); return rerender();
    }
    if (t.dataset.nb !== undefined) { e.preventDefault(); NF.track = t.dataset.nb; if (route() !== "notes") location.hash = "#notes"; else render(); return; }
    if (t.dataset.rtab) { S.ui.res = t.dataset.rtab; save(); return render(); }
    if (t.dataset.area !== undefined) {
      libF.area = libF.area === t.dataset.area ? "" : t.dataset.area; libF.pick = null; updLib();
      if (t.classList.contains("atag")) $("#libChips").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (t.dataset.time !== undefined) { libF.time = libF.time === t.dataset.time ? "" : t.dataset.time; libF.pick = null; return updLib(); }
    switch (t.dataset.act) {
      case "close": openId = null; if (noteEdit && noteEdit.startsWith("d:")) noteEdit = null; document.querySelectorAll(".sel").forEach(x => x.classList.remove("sel")); return renderDrawer();
      case "jump": { const c = currentStep(); const el = c && document.getElementById("step-" + c.id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      case "dailylog": {
        openId = null; renderDrawer(); entryFocus = entryKey("log");
        if (route() !== "log") location.hash = "#log"; else render();
        return;
      }
      case "entryedit": {
        const kind = t.dataset.kind;
        if (!Object.hasOwn(entryEdit, kind) || !S[kind].some(x => x.id === t.dataset.id)) return;
        cancelEntry(kind); entryEdit[kind] = t.dataset.id; entryFocus = entryKey(kind, t.dataset.id); return rerender();
      }
      case "entrycancel": cancelEntry(t.dataset.kind); return rerender();
      case "entrydelete": {
        const kind = t.dataset.kind;
        if (!Object.hasOwn(entryEdit, kind) || !confirm(`Delete this ${kind === "log" ? "entry" : "to do"}?`)) return;
        if (entryEdit[kind] === t.dataset.id) cancelEntry(kind);
        S[kind] = S[kind].filter(x => x.id !== t.dataset.id); save(); return rerender();
      }
      // notes
      case "notesexpand":
      case "notescollapse": {
        const open = t.dataset.act === "notesexpand";
        document.querySelectorAll("#nlist details[data-note-key]").forEach(el => { el.open = open; if (open) noteExpanded.add(el.dataset.noteKey); else noteExpanded.delete(el.dataset.noteKey); });
        return;
      }
      case "nedit": cancelEdit(); noteEdit = t.dataset.nk; focusKey = "e" + noteEdit; return rerender();
      case "ncancel": cancelEdit(); return rerender();
      case "ndel": {
        if (!confirm("Delete this note?")) return;
        S.notes = S.notes.filter(n => n.id !== t.dataset.nid);
        if (noteEdit && noteEdit.endsWith(":" + t.dataset.nid)) cancelEdit();
        save(); return rerender();
      }
      case "exportmd": return exportMd();
      // library
      case "libsave": { const k = t.dataset.key; if (libLater(k)) delete S.lib[k]; else S.lib[k] = "later"; save(); return updLib(); }
      case "libpick": return libPick();
      // data
      case "cloudsignin": return guard(Cloud.signIn());
      case "cloudsignout": return guard(Cloud.signOut());
      case "cloudretry": return guard(Cloud.retry());
      case "cloudimportlocal": Cloud.importLocal(); return;
      case "data": renderData(); return $("#dataDlg").showModal();
      case "fspick": return guard(Store.pick().then(() => syncFolder("connect")));
      case "fsunlock": return guard(Store.unlock().then(ok => ok && syncFolder("unlock")));
      case "fsreload": return guard(syncFolder("reload"));
      case "fsdisconnect": if (confirm("Stop saving to this folder? Your files stay where they are; the app keeps working from this browser's storage.")) guard(Store.disconnect().then(() => toast("Disconnected — saving in this browser only"))); return;
      case "theme": return toggleTheme();
      case "export": return download();
      case "import": return $("#importFile").click();
      case "sample": if (confirm("Replace your progress with sample data? (Export first if you want to keep it.)" + folderNote())) { S = sample(); clearDrafts(); save(); rerender(); updatePill(); } return;
      case "reset": if (confirm("Clear all progress, ratings, log, notes, to dos, library ticks and practice progress?" + folderNote())) { S = blank(); clearDrafts(); save(); openId = null; noteEdit = null; rerender(); updatePill(); } return;
    }
  });
  function cancelEdit() {
    if (noteEdit) { delete drafts["e" + noteEdit]; delete drafts["e" + noteEdit + ":t"]; }
    noteEdit = null;
  }
  const inEntryForm = t => !!(t && t.form && t.form.classList.contains("entryform"));
  const inTextForm = t => !!(t?.form?.matches(".nform,.entryform,.practice-notes-form"));
  const inNoteForm = t => !!(t && t.form && t.form.classList.contains("nform"));
  document.addEventListener("change", e => {
    const t = e.target;
    if (inEntryForm(t)) {
      if (t.name === "d") drafts[t.form.dataset.key + ":d"] = t.value;
      if (t.name === "track") drafts[t.form.dataset.key + ":t"] = t.value;
      return;
    }
    if (inNoteForm(t)) { if (t.name === "track") drafts[t.form.dataset.key + ":t"] = t.value; return; }
    if (t.dataset.todo) {
      const entry = S.todo.find(x => x.id === t.dataset.todo);
      if (entry) { entry.done = t.checked; entry.u = Store.today(); touch(); save(); render(); }
      return;
    }
    if (t.dataset.gate) { S.g[t.dataset.gate] = t.checked; touch(); save(); return render(); }
    if (t.dataset.pc) { const [id, i] = t.dataset.pc.split("|"); (S.pc[id] = S.pc[id] || [])[+i] = t.checked; touch(); save(); return rerender(); }
    if (t.dataset.rc) {
      const [id, k] = t.dataset.rc.split("|"); (S.rc[id] = S.rc[id] || {})[k] = t.checked;
      if (!t.checked && S.lib[k] === "done") delete S.lib[k];
      touch(); save(); return rerender();
    }
    if (t.dataset.lib) { setLibDone(t.dataset.lib, t.checked); touch(); save(); return updLib(); }
    if (t.dataset.act === "hideDone" || t.dataset.act === "showOpt") { S.ui[t.dataset.act] = t.checked; save(); return render(); }
    if (t.id === "rkind") return filterResources();
    if (t.id === "lkind") { libF.kind = t.value; libF.pick = null; return updLib(); }
    if (t.id === "lstatus") { libF.status = t.value; libF.pick = null; return updLib(); }
    if (t.id === "lref") { libF.ref = t.checked; return updLib(); }
    if (t.id === "importFile" && t.files[0]) {
      t.files[0].text().then(txt => {
        try {
          const s = JSON.parse(txt);
          if (!s || typeof s !== "object" || !("r" in s)) throw 0;
          if (!confirm("Replace your current progress with this file?" + folderNote())) return;
          S = migrate(s); clearDrafts(); save(); rerender(); toast("Imported ✓");
        } catch { alert("That file doesn't look like a roadmap export."); }
        finally { t.value = ""; }
      });
    }
  });
  document.addEventListener("input", e => {
    const t = e.target;
    if (inEntryForm(t)) {
      if (t.name === "text") drafts[t.form.dataset.key] = t.value;
      if (t.name === "d") drafts[t.form.dataset.key + ":d"] = t.value;
      if (t.name === "track") drafts[t.form.dataset.key + ":t"] = t.value;
      return;
    }
    if (inNoteForm(t)) { if (t.name === "text") drafts[t.form.dataset.key] = t.value; return; }
    if (t.id === "rsearch") filterResources();
    if (t.id === "nq") { NF.q = t.value; filterNotes(); }
    if (t.id === "lq") { libF.q = t.value; libF.pick = null; updLib(); }
  });
  document.addEventListener("submit", e => {
    if (e.target.classList.contains("nform")) { e.preventDefault(); return saveNote(e.target); }
    if (e.target.classList.contains("entryform")) { e.preventDefault(); return saveEntry(e.target); }
  });
  document.addEventListener("mousedown", e => {
    if (e.button === 0 && e.target.closest("[data-note-format],[data-list]")) e.preventDefault();
  });
  document.addEventListener("keydown", e => {
    const editor = inTextForm(e.target) && e.target.name === "text" && e.target.tagName === "TEXTAREA";
    if (editor && !e.isComposing && !e.altKey && !(e.ctrlKey || e.metaKey)) {
      if (e.key === "Enter" && !e.shiftKey && continueList(e.target)) { e.preventDefault(); return; }
      if (e.key === "Tab" && indentList(e.target, e.shiftKey)) { e.preventDefault(); return; }
    }
    if (!e.isComposing && !e.altKey && (e.ctrlKey || e.metaKey) && editor) {
      if (e.shiftKey && ["Digit7", "Digit8"].includes(e.code)) { e.preventDefault(); if (!e.repeat) formatList(e.target, e.code === "Digit7"); return; }
      if (e.key.toLowerCase() === "k") { e.preventDefault(); if (!e.repeat) formatLink(e.target); return; }
      const mark = ({ b: "**", i: "*", e: "`" })[e.key.toLowerCase()];
      if (mark) { e.preventDefault(); if (!e.repeat) formatNote(e.target, mark); return; }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && inTextForm(e.target)) { e.preventDefault(); return e.target.form.requestSubmit(); }
    if ($("#dataDlg").open || $("#practiceDlg").open) return;
    if (e.key === "Escape") {
      if (noteEdit) { cancelEdit(); return rerender(); }
      const kind = route();
      if (entryEdit[kind]) { cancelEntry(kind); return rerender(); }
      if (openId) { openId = null; return renderDrawer(); }
    }
  });
  document.addEventListener("toggle", e => {
    if (e.target.id === "todoCompleted") todoDoneOpen = e.target.open;
    if (e.target.dataset.noteKey) { if (e.target.open) noteExpanded.add(e.target.dataset.noteKey); else noteExpanded.delete(e.target.dataset.noteKey); }
  }, true);
  window.addEventListener("hashchange", render);
  $("#dataDlg").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  // folder storage: reconnect on load, pick up edits made outside the app, flush before leaving
  function renderCloudGate() {
    const gate = $("#cloudGate"), cloud = Cloud?.info();
    if (!gate) return;
    const locked = !!cloud?.configured && !cloud.localHost && !cloud.user;
    gate.hidden = !locked;
    document.querySelector("header").inert = locked;
    document.querySelector(".workspace").inert = locked;
    const error = $("#cloudGateError");
    if (error) { error.textContent = cloud?.error || ""; error.hidden = !cloud?.error; }
    const signIn = $("#cloudGateSignIn");
    if (signIn) signIn.disabled = cloud?.status === "starting";
  }
  function applyCloud(state, uid) {
    const active = document.activeElement, formKey = active?.form?.dataset.key, name = active?.name;
    const selection = active?.tagName === "TEXTAREA" ? [active.selectionStart, active.selectionEnd] : null;
    const scroll = [window.scrollX, window.scrollY];
    activeKey = Cloud.stateKey(uid);
    S = migrate(Object.assign(state, { ui: S.ui, savedAt: Date.now() })); persistLocal();
    rerender();
    if (formKey && name) {
      const form = [...document.querySelectorAll("form[data-key]")].find(f => f.dataset.key === formKey);
      const input = form?.elements.namedItem(name);
      if (input) { input.focus({ preventScroll: true }); if (selection) input.setSelectionRange(...selection); }
    }
    window.scrollTo(...scroll);
  }
  Store.on(updatePill);
  Cloud?.on(updatePill);
  window.addEventListener("focus", () => guard(Store.changedOnDisk().then(ch => ch && syncFolder("external"))));
  document.addEventListener("visibilitychange", () => { if (document.hidden) Store.flush(); });

  window.AE = { build: "2026-10-06.10", state: () => S, openItem, order, isDone, score, currentStep, syncFolder, Store, Cloud, LIB, Practice: practice };
  themeLabel();
  render();
  updatePill();
  guard(Store.init().then(async i => {
    if (i.state === "connected") await syncFolder("startup");
    if (Cloud) await Cloud.init({ current: () => S, empty: blank, hasData, apply: applyCloud,
      account: uid => { activeKey = Cloud.stateKey(uid); if (accountUid !== uid) { clearDrafts(); } accountUid = uid; },
      signedOut: () => { accountUid = null; activeKey = KEY; S = load(); clearDrafts(); openId = null; rerender(); }
    });
  }));
})();
