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
  const { order, it, isDone, status, required, lessonChecks, currentRow } = roadmap;
  const resources = globalThis.AEResources.create(P, roadmap, () => S);
  const { resolve, LIB, TIME, FORMATS, FORMAT_ORDER, libDone, libLater, setLibDone } = resources;
  const planViews = globalThis.AEPlanViews.create({ plan: P, roadmap, resources, getState: () => S });
  const bar = v => `<div class="bar"><i style="width:${pct(v)}"></i></div>`;
  // Old portfolio topic IDs (notes, library tags) open the first project stage that carries their content.
  const target = id => roadmap.sourceOf[id] ? roadmap.sourceOf[id][0] : id;
  const topicTitle = id => roadmap.title(target(id));
  let roadHighlight = null;

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
    const cur = currentRow();
    const ws = dayKey(weekStart(new Date())), today = Store.today();
    const weekDays = new Set(S.log.filter(e => e.d >= ws && e.d <= today).map(e => e.d)).size;
    const loggedDays = new Set(S.log.map(e => e.d)).size;
    const recent = sortedLog().slice(0, 3);
    const lessonsDone = required.filter(isDone).length, built = P.stages.filter(st => isDone(st.id)).length;
    const allChecks = required.reduce((a, id) => a + it(id).dod.length, 0);
    const ticked = required.reduce((a, id) => a + lessonChecks(id).filter(Boolean).length, 0);
    const cps = Object.keys(P.checkpoints), passed = cps.filter(roadmap.cpDone).length;
    const next = cur ? [...(cur.learn || []), cur.milestone].filter(id => id && !isDone(id)) : [];
    return `<div class="page-head"><div><div class="eyebrow">Your progress</div><h2>Dashboard</h2><p class="muted">See how your skills, portfolio and daily practice are growing.</p></div></div><div class="kpis">
        <div class="kpi"><b>${lessonsDone}/${required.length}</b><span>lessons complete</span></div>
        <div class="kpi"><b>${built}/${P.stages.length}</b><span>portfolio stages built</span></div>
        <div class="kpi"><b>${ticked}/${allChecks}</b><span>checks ticked</span></div>
        <div class="kpi"><b>${passed}/${cps.length}</b><span>checkpoints passed</span></div>
        <div class="kpi"><b>${weekDays}d</b><span>logged this week</span></div>
        <div class="kpi"><b>${loggedDays}d</b><span>days logged total</span></div>
        <div class="kpi"><b>${streak()}d</b><span>streak</span></div>
        <div class="kpi"><b>${S.notes.length}</b><span><a href="#notes">notes</a> · ${LIB.filter(x => libDone(x.key)).length} library items done</span></div>
      </div>
      <div class="grid2">
        <div class="panel"><h3>Up next ${cur ? `<span class="muted small">${esc(cur.title || P.checkpoints[cur.checkpoint].title)}</span>` : ""}</h3>
          ${!cur ? `<p class="muted">Everything done 🎉</p>` : `<div class="road-lessons">${next.map(id => planViews.lessonButton(id)).join("")}${cur.stage ? planViews.lessonButton(cur.stage) : ""}</div>
            ${cur.checkpoint ? `<p class="small muted">Tick the checkpoint on the roadmap when you meet it.</p>` : ""}<p><a href="#roadmap" data-road="${cur.key}">Open on the roadmap →</a></p>`}</div>
        <div class="panel"><h3>Days logged per week</h3>${weeklyChart()}<p class="small muted">Each day counts once, however many entries you write.</p></div>
        <div class="panel"><h3>Recent progress</h3>
          ${recent.map(e => `<div class="progress-preview"><a href="#log">${esc(e.d)}</a><div class="nt-body">${mdBlock(e.text)}</div></div>`).join("") || `<p class="muted">Your daily entries will appear here.</p>`}
          <p><a href="#log">Open daily log →</a> · <a href="#todo">To do (${S.todo.filter(e => !e.done).length}) →</a></p></div>
        <div class="panel"><h3>Portfolio releases</h3>
          ${P.road.filter(sec => P.stages.some(st => st.release === sec.id)).map(sec => { const ids = P.stages.filter(st => st.release === sec.id), n = ids.filter(st => isDone(st.id)).length; return `<div class="lane-row"><span>${esc(sec.name.replace(/^Extension · /, ""))}</span>${bar(n / ids.length)}<span class="small">${n}/${ids.length}</span></div>`; }).join("")}</div>
        <div class="panel wide"><h3>Learning areas</h3><div class="tracks-grid">
          ${P.areas.map(a => { const ids = roadmap.areaLessons(a).filter(id => !it(id).opt), n = ids.filter(isDone).length; return `<div class="lane-row"><span>${esc(a.name)}${a.star ? " ⭐" : ""}</span>${bar(ids.length ? n / ids.length : 0)}<span class="small">${n}/${ids.length}</span></div>`; }).join("")}</div></div>
      </div>`;
  }

  // ---------- resources ----------
  const { fmtBadge, timeBadge, bookBadge } = planViews;
  function vResources() {
    const lib = S.ui.res === "lib";
    const tabs = `<div class="tabs" role="tablist"><button role="tab" aria-selected="${!lib}" class="${lib ? "" : "on"}" data-rtab="topic">By lesson</button><button role="tab" aria-selected="${lib}" class="${lib ? "on" : ""}" data-rtab="lib">📚 Library <span class="small">${LIB.length}</span></button></div>`;
    return lib ? vLibrary(tabs) : vByTopic(tabs);
  }

  // By lesson: deck(s), labs, Start here / Go deeper, problem sites, data & tools, book chapters, then everything else
  // tagged to the lesson in a quiet "Also tagged" group. Each area ends with its reading list.
  function vByTopic(tabs) {
    let h = `<div class="panel">${tabs}<h2>Resources by lesson</h2><p class="muted">Every learning area and lesson with its decks, labs and picks, then everything else tagged to it. Ticks are shared with the lesson panel and the Library.</p>
      <div class="filters"><input id="rsearch" type="search" placeholder="Search lessons, resources…" aria-label="Search lessons and resources"> <select id="rkind" aria-label="Format"><option value="">All formats</option><option value="lab">Lab</option>${FORMAT_ORDER.map(f => `<option value="${f}">${esc(FORMATS[f][0])}</option>`).join("")}</select></div></div>`;
    const item = (id, r, role, area, cls = "") => `<li class="ritem ${cls}" data-kind="${esc(r.format)}" data-text="${esc((topicTitle(id) + " " + r.title + " " + r.format + " " + role + " " + area + " " + (r.note || "")).toLowerCase())}">${resRow(id, r, role)}</li>`;
    P.areas.forEach(a => {
      h += `<section class="panel rgroup"><h3>${esc(a.name)}${a.star ? " ⭐" : ""}</h3>`;
      roadmap.areaLessons(a).forEach(id => {
        const x = it(id), p = resources.lessonRes(id), d = resources.deckFor(id), name = x.name.toLowerCase();
        h += `<div class="rtopic"><button class="link-btn" data-open="${id}"><b>${esc(x.name)}</b>${x.opt ? ' <span class="muted small">optional</span>' : ""}</button><ul class="rlist">`;
        d.decks.forEach(k => { h += `<li class="ritem" data-kind="deck" data-text="${esc((name + " " + k.title + " deck " + k.coverage + " " + a.name).toLowerCase())}"><span class="res">${fmtBadge("deck")}<span class="grow"><a href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.title)}</a>${k.partial ? ' <span class="badge amber">Partial</span>' : ""}${k.mdUrl ? ` · <a href="${esc(k.mdUrl)}" target="_blank" rel="noopener">Markdown ↗</a>` : ""} <span class="muted small">— ${esc(k.coverage)}</span></span></span></li>`; });
        if (!d.decks.length) h += `<li class="ritem" data-kind="deck" data-text="${esc((name + " no deck yet " + d.planned.join(" ")).toLowerCase())}"><span class="res muted">${fmtBadge("deck")}No deck yet${d.planned.length ? ` · planned: ${esc(d.planned.join(" · "))}` : ""}</span></li>`;
        d.labs.forEach(l => { h += `<li class="ritem" data-kind="lab" data-text="${esc((name + " lab " + l.title + " " + a.name).toLowerCase())}"><span class="res"><span class="fmt f-lab">${icon("box")}Lab</span><span class="grow"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>${l.slideUrl ? ` · <a href="${esc(l.slideUrl)}" target="_blank" rel="noopener">walkthrough slide</a>` : ""}</span></span></li>`; });
        if (p.start) h += item(id, p.start, "Start here", a.name);
        p.deeper.forEach(r => { h += item(id, r, "Go deeper", a.name); });
        p.sites.forEach(r => { h += item(id, r, "Problems", a.name); });
        p.tools.forEach(r => { h += item(id, r, "Data & tools", a.name); });
        p.reading.forEach(r => { h += item(id, r, "Book chapters", a.name); });
        if (p.more.length) h += `<li class="also"><details class="also-tagged"><summary>Also tagged <span class="muted">(${p.more.length})</span></summary><ul class="rlist">${p.more.map(r => item(id, r, "", a.name, "quiet")).join("")}</ul></details></li>`;
        h += `</ul></div>`;
      });
      const reading = resources.areaReading(a);
      if (reading.length) h += `<div class="rtopic"><b>Area reading list</b><ul class="rlist">${reading.map(r => `<li class="ritem" data-kind="${esc(r.format)}" data-text="${esc((a.name + " reading list " + r.title + " " + r.format + " " + r.lessons.map(l => l.note).join(" ")).toLowerCase())}"><label class="res"><input type="checkbox" data-lib="${esc(r.key)}" ${libDone(r.key) ? "checked" : ""} aria-label="Mark ${esc(r.title)} done">${fmtBadge(r.format)}<span class="grow">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : `<span>${esc(r.title)}</span>`}${bookBadge(r)}${r.lessons.length ? `<small class="muted reading-for">${r.lessons.map(l => `${esc(it(l.id).name)}${l.note ? ` — ${esc(l.note)}` : ""}`).join("<br>")}</small>` : ""}</span></label></li>`).join("")}</ul></div>`;
      h += `</section>`;
    });
    h += `<section class="panel rgroup"><h3>Portfolio stages</h3>`;
    P.stages.forEach(st => {
      const refs = resources.stageRefs(st);
      if (!refs.length) return;
      h += `<div class="rtopic"><button class="link-btn" data-open="${st.id}"><b>${esc(st.name)}</b></button><ul class="rlist">${refs.map(([id, r]) => item(id, r, "Reference", "Portfolio")).join("")}</ul></div>`;
    });
    return h + `</section>`;
  }
  function resRow(id, r, role) {
    const ck = (S.rc[id] || {})[r.key] || libDone(r.key);
    const title = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : `<span>${esc(r.title)}</span>`;
    return `<label class="res"><input type="checkbox" data-rc="${id}|${esc(r.key)}" ${ck ? "checked" : ""} aria-label="Mark ${esc(r.title)} done">${fmtBadge(r.format)}<span class="grow">${title}${r.note ? ` <span class="res-note">— ${esc(r.note)}</span>` : ""}${bookBadge(r)}${role ? ` <span class="res-role">${esc(role)}</span>` : ""}</span></label>`;
  }
  function filterResources() {
    const q = ($("#rsearch")?.value || "").toLowerCase().trim(), k = $("#rkind")?.value || "";
    document.querySelectorAll(".ritem").forEach(li => { li.hidden = !((!q || li.dataset.text.includes(q)) && (!k || li.dataset.kind === k)); });
    document.querySelectorAll(".also-tagged").forEach(d => { const any = d.querySelector(".ritem:not([hidden])"); d.closest(".also").hidden = !any; if (q || k) d.open = !!any; });
    document.querySelectorAll(".rtopic").forEach(tp => { tp.hidden = !tp.querySelector(".ritem:not([hidden])"); });
    document.querySelectorAll(".rgroup").forEach(g => { g.hidden = !g.querySelector(".rtopic:not([hidden])"); });
  }

  // ---------- Library: Now bar + shelves ----------
  // Now: what you are reading (long reads with status Reading) and short picks for the roadmap's current lesson.
  // Below: format chips, time chips, area and status filters; shelves for quick learning, long reads and things to follow.
  const libF = { q: "", area: "", formats: new Set(), time: "", status: "todo", pick: null, open: new Set(), lesson: null };
  const STATUS = [["todo", "To do"], ["later", "Saved ★"], ["done", "Done"], ["all", "All"]];
  const SHELVES = { quick: ["⚡", "Quick learning", "Decks, articles, videos, docs and practice — one sitting each. Start with the deck, then one article or video."],
    long: ["📚", "Long reads", "Books and courses. Keep one in progress; the rest wait on Later until you finish or pause it."],
    loop: ["📬", "Stay in the loop", "Newsletters, podcasts and communities to follow — not lessons to finish."] };
  const GROUP_SIZE = 6;
  const longOrder = ["reading", "paused", "later", "", "done"];
  const libMatch = (x, skip = "") => (skip === "area" || !libF.area || x.areas.includes(libF.area))
    && (skip === "format" || !libF.formats.size || libF.formats.has(x.format))
    && (skip === "time" || !libF.time || x.time === libF.time)
    && (libF.status === "all" || (libF.status === "done" ? libDone(x.key) : libF.status === "later" ? libLater(x.key) : !libDone(x.key)))
    && (!libF.q.trim() || x.text.includes(libF.q.toLowerCase().trim()));
  const libKpis = () => [[LIB.length, "items"], [resources.readingNow().length, "reading now"], [LIB.filter(x => libLater(x.key)).length, "saved ★"], [LIB.filter(x => libDone(x.key)).length, "done"]].map(([n, l]) => `<span><b>${n}</b> ${l}</span>`).join("");
  // Decks show their size in slides; everything else shows the time it takes.
  const sizeBadge = x => x.format === "deck" && x.slides ? `<span class="tb">📑 ${x.slides} slides</span>` : timeBadge(x.time);
  function vLibrary(tabs) {
    return `<div class="panel lib-intro">${tabs}<div class="rm-head"><div class="grow"><h2>Library</h2>
      <p class="muted">Short things for the topic you're on now, your book in progress, and everything else on shelves. Colours show the format; the badge shows how long it takes. ☆ saves for later; ticking done here also ticks it in its lessons.</p></div>
      <p class="lib-stats" id="libKpis">${libKpis()}</p></div></div></div>
      <section class="now-bar" id="libNow" aria-label="Now">${libNow()}</section>
      <div class="panel lib-filters"><div class="filters"><input id="lq" type="search" placeholder="Search titles, topics, lessons…" value="${esc(libF.q)}" aria-label="Search the Library">
        <select id="larea" aria-label="Learning area"><option value="">All areas</option>${P.tracks.map(t => `<option value="${t.id}" ${libF.area === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
        <div class="seg lib-status" role="group" aria-label="Status">${STATUS.map(([v, l]) => `<button type="button" data-lstatus="${v}" aria-pressed="${libF.status === v}" class="${libF.status === v ? "on" : ""}">${l}</button>`).join("")}</div>
        <button class="btn primary" data-act="libpick">🎲 Pick something</button></div>
        <div id="libChips">${libChips()}</div></div>
      <div id="libShelves">${libShelves()}</div>`;
  }
  // ----- Now bar -----
  function currentLessons() {
    const cur = currentRow(), lessons = roadmap.lessons;
    let ids = cur ? [...(cur.learn || []), cur.milestone].filter(id => id && lessons.includes(id) && !isDone(id)) : [];
    if (!ids.length) { const next = lessons.find(id => !isDone(id) && !it(id).opt); if (next) ids = [next]; }
    return { ids, row: cur };
  }
  function chaptersFor(key) {
    return roadmap.lessons.flatMap(id => resources.lessonRes(id).reading.concat(resources.lessonRes(id).deeper).filter(r => r.key === key && r.note).map(r => ({ id, note: r.note })));
  }
  function readingCard(k) {
    const x = resources.libItem[k], r = (S.reading || {})[k] || {}, ch = chaptersFor(k);
    const pct = Number.isFinite(r.pct) ? r.pct : null;
    return `<article class="now-read f-${esc(x.format)}"><div class="row spread">${fmtBadge(x.format)}<span class="small muted">${r.updated && /^\d{4}/.test(r.updated) ? "Updated " + esc(r.updated) : ""}</span></div>
      <h3>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</h3>
      <div class="now-progress"><label class="grow"><span class="sr-only">Where you are in ${esc(x.title)}</span><input type="text" data-rnote="${esc(k)}" value="${esc(r.note || "")}" placeholder="Where are you? e.g. Ch. 7 · Accounting" maxlength="120"></label>
        <label class="pct"><input type="number" min="0" max="100" step="5" data-rpct="${esc(k)}" value="${pct ?? ""}" placeholder="%" aria-label="Percent read of ${esc(x.title)}"><span aria-hidden="true">%</span></label></div>
      ${pct !== null ? `<div class="bar thick" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(x.title)} progress"><i style="width:${pct}%"></i></div>` : ""}
      ${ch.length ? `<details class="now-chapters"><summary>Chapters your lessons use <span class="muted">(${ch.length})</span></summary><ul>${ch.map(c => `<li><button class="link-btn" data-open="${c.id}">${esc(it(c.id).name)}</button> — ${esc(c.note)}</li>`).join("")}</ul></details>` : ""}
      <div class="row now-actions"><button class="btn sm" data-act="readset" data-key="${esc(k)}" data-status="done">${icon("check")} Done</button><button class="btn sm" data-act="readset" data-key="${esc(k)}" data-status="paused">${icon("pause")} Pause</button></div></article>`;
  }
  function libNow() {
    const now = resources.readingNow(), paused = LIB.filter(x => resources.longStatus(x.key) === "paused");
    const suggest = (P.currentBooks || []).filter(k => resources.libItem[k] && !now.includes(k) && resources.longStatus(k) !== "done");
    const readingCol = `<div class="now-col"><p class="eyebrow">${icon("book")} Currently reading</p>
      ${now.length ? now.map(readingCard).join("") : `<div class="now-empty"><p>Nothing marked as reading. Pick one book or course on the <b>Long reads</b> shelf and press <b>Reading</b>.</p>
        ${suggest.map(k => `<div class="now-suggest">${fmtBadge(resources.libItem[k].format)}<span class="grow"><strong>${esc(resources.libItem[k].title)}</strong><small>You mentioned you're reading this — mark it to track chapters and progress here.</small></span><button class="btn sm primary" data-act="readstart" data-key="${esc(k)}">Mark as reading</button></div>`).join("")}</div>`}
      ${paused.length ? `<p class="small muted now-paused">Paused: ${paused.map(x => `<span>${esc(x.title)} <button class="link-btn" data-act="readstart" data-key="${esc(x.key)}">Resume</button></span>`).join(" · ")}</p>` : ""}</div>`;
    const { ids } = currentLessons(), id = ids.includes(libF.lesson) ? libF.lesson : ids[0];
    let picksCol;
    if (!id) picksCol = `<div class="now-col"><p class="eyebrow">⚡ Quick picks</p><p class="muted">Every lesson is complete 🎉</p></div>`;
    else {
      const picks = resources.quickPicks(id);
      picksCol = `<div class="now-col"><p class="eyebrow">⚡ Quick picks for your current lesson</p>
        <h3><button class="link-btn" data-open="${id}">${esc(it(id).name)} ${icon("arrow")}</button></h3>
        <div class="pick-list">${picks.length ? picks.map(pickRow).join("") : `<p class="small muted">No short deck, article or video for this lesson — open it for its resources and reading list.</p>`}</div>
        ${ids.length > 1 ? `<div class="now-also"><span class="small muted">Also in this step:</span>${ids.filter(x => x !== id).map(x => `<button class="fchip" data-libles="${x}">${esc(it(x).name)}</button>`).join("")}</div>` : ""}</div>`;
    }
    return readingCol + picksCol;
  }
  function pickRow(x) {
    const d = libDone(x.key);
    return `<div class="pick f-${esc(x.format)} ${d ? "done" : ""}"><input type="checkbox" data-lib="${esc(x.key)}" ${d ? "checked" : ""} aria-label="Mark ${esc(x.title)} done">
      <span class="grow"><span class="pick-meta">${fmtBadge(x.format)}${sizeBadge(x)}</span><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>${x.why ? `<small class="muted">${esc(x.why)}</small>` : ""}</span></div>`;
  }
  // ----- filters -----
  function libChips() {
    const base = LIB.filter(x => libMatch(x, "format"));
    const fchips = FORMAT_ORDER.map(f => { const c = base.filter(x => x.format === f).length, on = libF.formats.has(f);
      return `<button type="button" class="fchip fmt-chip f-${f} ${on ? "on" : ""}" data-fmt="${f}" aria-pressed="${on}" ${c || on ? "" : "disabled"}>${icon(FORMATS[f][1])}${esc(FORMATS[f][0])} <b>${c}</b></button>`; }).join("");
    const tbase = LIB.filter(x => libMatch(x, "time"));
    const tchips = Object.entries(TIME).map(([k, [ic, lab]]) => { const on = libF.time === k; return `<button type="button" class="fchip ${on ? "on" : ""}" data-time="${k}" aria-pressed="${on}">${ic} ${lab} <b>${tbase.filter(x => x.time === k).length}</b></button>`; }).join("");
    const any = libF.formats.size || libF.time || libF.area || libF.q || libF.status !== "todo";
    return `<div class="fchips" role="group" aria-label="Format"><span class="muted small">Format</span>${fchips}</div>
      <div class="fchips" role="group" aria-label="Time"><span class="muted small">Time</span>${tchips}${any ? `<button type="button" class="text-btn small" data-act="libclear">Clear filters</button>` : ""}</div>`;
  }
  // ----- shelves -----
  function libCard(x) {
    const d = libDone(x.key), l = libLater(x.key);
    const title = x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : `<span>${esc(x.title)}</span>`;
    return `<article class="lcard f-${esc(x.format)} ${d ? "done" : ""} ${libF.pick === x.key ? "pick" : ""}" data-key="${esc(x.key)}">
      <div class="lcard-top">${fmtBadge(x.format)}${sizeBadge(x)}<span class="grow"></span>
        <button class="icon sm ${l ? "on" : ""}" data-act="libsave" data-key="${esc(x.key)}" aria-pressed="${l}" aria-label="${l ? "Saved for later — unsave" : "Save for later"}: ${esc(x.title)}" title="${l ? "Saved for later" : "Save for later"}" ${d ? "disabled" : ""}>${l ? "★" : "☆"}</button>
        <input type="checkbox" data-lib="${esc(x.key)}" ${d ? "checked" : ""} aria-label="Mark ${esc(x.title)} done" title="${d ? "Done — untick to undo" : "Mark as done"}"></div>
      <div class="lcard-title">${title}${x.mdUrl ? ` <a class="small" href="${esc(x.mdUrl)}" target="_blank" rel="noopener">Markdown ↗</a>` : ""}</div>
      ${x.why ? `<p class="lcard-why">${esc(x.why)}</p>` : ""}${tags(x)}</article>`;
  }
  const tags = x => `<div class="ltags">${x.areas.map(a => `<button type="button" class="atag ${libF.area === a ? "on" : ""}" data-larea="${a}" title="Show everything for ${esc(trackName[a])}">${esc(trackName[a])}</button>`).join("")}
      ${x.topics.slice(0, 2).map(id => `<button type="button" class="tchip" data-open="${id}" title="Open ${esc(topicTitle(id))}">${esc(topicTitle(id))}</button>`).join("")}${x.topics.length > 2 ? `<span class="muted small">+${x.topics.length - 2}</span>` : ""}</div>`;
  function longRow(x) {
    const st = resources.longStatus(x.key);
    const seg = [["reading", st === "paused" ? "Resume" : "Reading"], ["later", "Later"], ["done", "Done"]].map(([v, l]) => {
      const on = st === v;
      return `<button type="button" data-act="readset" data-key="${esc(x.key)}" data-status="${v}" aria-pressed="${on}" class="${on ? "on" : ""}">${l}</button>`;
    }).join("");
    const title = x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : `<span>${esc(x.title)}</span>`;
    return `<div class="long-row f-${esc(x.format)} st-${st || "none"} ${libF.pick === x.key ? "pick" : ""}" data-key="${esc(x.key)}">${fmtBadge(x.format)}
      <div class="grow"><div class="long-title">${title}${st === "paused" ? ' <span class="badge neutral">Paused</span>' : st === "reading" ? ' <span class="badge">Reading</span>' : ""}${bookBadge(x)}</div>
        ${x.why ? `<p class="lcard-why">${esc(x.why)}</p>` : ""}${tags(x)}</div>
      <div class="seg long-seg" role="group" aria-label="Status of ${esc(x.title)}">${seg}</div></div>`;
  }
  function groupBlock(id, title, items, render, size = GROUP_SIZE, extraCls = "") {
    if (!items.length) return "";
    const open = libF.open.has(id) || !!libF.area || items.length <= size + 1 || items.some(x => x.key === libF.pick);
    const shown = open ? items : items.slice(0, size);
    return `<div class="shelf-group ${extraCls}"><h4>${esc(title)} <span class="muted small">${items.length}</span></h4><div class="${extraCls === "long" ? "long-list" : "card-grid"}">${shown.map(render).join("")}</div>
      ${items.length > shown.length ? `<button type="button" class="text-btn" data-act="libmore" data-group="${esc(id)}" aria-expanded="false">Show all ${items.length}</button>` : libF.open.has(id) ? `<button type="button" class="text-btn" data-act="libmore" data-group="${esc(id)}" aria-expanded="true">Show fewer</button>` : ""}</div>`;
  }
  function libShelves() {
    const items = LIB.filter(x => libMatch(x));
    if (!items.length) return `<div class="panel muted">Nothing matches — <button class="link-btn" data-act="libclear">clear the filters</button>${libF.status !== "all" ? " or choose status <b>All</b>" : ""}.</div>`;
    const T = Object.keys(TIME), sort = (a, b) => (a.format === "deck" ? 0 : 1) - (b.format === "deck" ? 0 : 1) || T.indexOf(a.time) - T.indexOf(b.time) || FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format);
    const shelf = (id, body, n) => { const [ic, t, d] = SHELVES[id]; return `<section class="panel shelf shelf-${id}" aria-labelledby="shelf-${id}"><div class="shelf-head"><h3 id="shelf-${id}">${ic} ${t} <span class="muted small">${n}</span></h3><p class="small muted">${d}</p></div>${body}</section>`; };
    const quick = items.filter(x => x.shelf === "quick"), long = items.filter(x => x.shelf === "long"), loop = items.filter(x => x.shelf === "loop");
    let h = "";
    if (quick.length) {
      const body = libF.area ? groupBlock("q:" + libF.area, trackName[libF.area], quick.sort(sort), libCard, 99)
        : P.tracks.map(t => groupBlock("q:" + t.id, t.name, quick.filter(x => x.areas[0] === t.id).sort(sort), libCard)).join("");
      h += shelf("quick", body, quick.length);
    }
    if (long.length) {
      const st = x => longOrder.indexOf(resources.longStatus(x.key));
      const by = s => long.filter(x => resources.longStatus(x.key) === s);
      const body = groupBlock("l:now", "In progress", [...by("reading"), ...by("paused")], longRow, 99, "long")
        + groupBlock("l:later", "Later", by("later"), longRow, 8, "long")
        + groupBlock("l:none", "Not started", long.filter(x => !resources.longStatus(x.key)).sort((a, b) => P.tracks.findIndex(t => t.id === a.areas[0]) - P.tracks.findIndex(t => t.id === b.areas[0]) || st(a) - st(b)), longRow, 8, "long")
        + groupBlock("l:done", "Finished", by("done"), longRow, 4, "long");
      h += shelf("long", body, long.length);
    }
    if (loop.length) h += shelf("loop", `<div class="loop-list">${loop.sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format)).map(x => `<div class="loop-item f-${esc(x.format)} ${libDone(x.key) ? "done" : ""}">${fmtBadge(x.format)}<span class="grow">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}${x.why ? `<small class="muted">${esc(x.why)}</small>` : ""}</span><input type="checkbox" data-lib="${esc(x.key)}" ${libDone(x.key) ? "checked" : ""} aria-label="Mark ${esc(x.title)} done"></div>`).join("")}</div>`, loop.length);
    return h;
  }
  function updLib() {
    const set = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
    set("#libShelves", libShelves()); set("#libChips", libChips()); set("#libKpis", libKpis()); set("#libNow", libNow());
    document.querySelectorAll("[data-lstatus]").forEach(b => { const on = b.dataset.lstatus === libF.status; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    const area = $("#larea"); if (area) area.value = libF.area;
  }
  // 🎲: respects every filter; skips long reads while one is in progress unless you filtered for books or courses.
  function libPick() {
    const longAsked = libF.formats.has("book") || libF.formats.has("course");
    let pool = LIB.filter(x => libMatch(x) && !libDone(x.key) && (longAsked || x.shelf !== "long" || !resources.readingNow().length));
    if (pool.length > 1) pool = pool.filter(x => x.key !== libF.pick);
    if (!pool.length) return toast("Nothing left to pick with these filters");
    libF.pick = pool[Math.floor(Math.random() * pool.length)].key;
    updLib();
    const el = document.querySelector(`#libShelves [data-key="${CSS.escape(libF.pick)}"]`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.querySelector("a")?.focus({ preventScroll: true }); }
  }
  function setReading(k, status) {
    const x = resources.libItem[k]; if (!x) return;
    const cur = resources.longStatus(k);
    if (status === "reading" && cur === "reading") resources.setLongStatus(k, "");
    else if (status === "reading") {
      const res = resources.startReading(k);
      if (res.confirm) {
        const names = res.confirm.map(o => resources.libItem[o]?.title || o).join(" and ");
        if (!confirm(`You're reading ${names}. Pause it and start ${x.title}?`)) return;
        resources.startReading(k, true);
      }
    } else resources.setLongStatus(k, cur === status ? "" : status);
    touch(); save(); updLib();
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
    const text = [n.text, trackLabel(n.track), n.topic ? topicTitle(n.topic) : ""].join(" ").toLowerCase();
    return `<div class="nt" data-text="${esc(text)}">
      <div class="nt-head">${body ? `<details class="note-content" data-note-key="${esc(k)}" ${noteExpanded.has(k) ? "open" : ""}><summary><span class="nt-title">${inl(first)}</span></summary><div class="nt-body">${mdBlock(body)}</div></details>` : `<div class="nt-title">${inl(first)}</div>`}<span class="nt-tools"><button class="icon sm" data-act="nedit" data-nk="${esc(k)}" title="Edit">${icon("edit")}</button><button class="icon sm" data-act="ndel" data-nid="${esc(n.id)}" title="Delete">${icon("trash")}</button></span></div>
      <div class="nt-foot small muted">${inDrawer ? "" : `<span class="ttag">${esc(trackLabel(n.track))}</span>`}${n.topic && !inDrawer ? `<button class="tchip" data-open="${n.topic}" title="Open lesson">${esc(topicTitle(n.topic))}</button>` : ""}<span class="nt-date">${esc(n.u || n.c || "")}</span></div></div>`;
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
    const keys = roadmap.isStage(id) ? [id, ...roadmap.stage(id).from] : [id];
    const tr = trackOf(id), mine = noteSort(S.notes.filter(n => keys.includes(n.topic))), all = S.notes.filter(n => n.track === tr).length;
    return `<section class="notes-sec lesson-section"><h4>Notes <span class="muted small">saved under ${esc(trackLabel(tr))}</span></h4>
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

  // ---------- side panel: lessons and portfolio stages ----------
  let openId = null, trail = [], opener = null, openerSel = null;
  const drawer = () => $("#drawer");
  // Re-rendering replaces the panel; restore focus to the control the user was on.
  function focusSelector(el) {
    if (!el || !drawer().contains(el) || !el.dataset) return null;
    for (const k of ["ck", "pc", "rc", "lib", "act", "open"]) if (el.dataset[k] !== undefined) return `[data-${k}="${CSS.escape(el.dataset[k])}"]`;
    return null;
  }
  function renderDrawer() {
    const d = drawer();
    document.body.classList.toggle("drawer-open", !!openId);
    if (!openId) { d.innerHTML = ""; if (d.open) d.close(); return; }
    const scroll = d.querySelector(".panel-scroll")?.scrollTop || 0, sel = focusSelector(document.activeElement);
    d.innerHTML = `<div class="panel-shell">${planViews.panelHead(openId, trail.at(-1)?.id)}
      <div class="panel-scroll">${planViews.panelBody(openId)}${drawerNotes(openId)}
        <section class="lesson-section"><h4>Daily progress</h4><p class="small muted">Write about what you worked on in your daily log.</p><button class="btn" data-act="dailylog">Open daily log →</button></section></div>
      <footer class="panel-foot">${planViews.panelFoot(openId)}</footer></div>`;
    d.querySelector(".panel-scroll").scrollTop = scroll;
    if (toastEl?.className) d.append(toastEl);
    if (!d.open) d.showModal();
    if (sel) d.querySelector(sel)?.focus({ preventScroll: true });
  }
  function markSelected() {
    document.querySelectorAll("#view .sel").forEach(e => e.classList.remove("sel"));
    if (openId) document.querySelectorAll(`#view [data-open="${openId}"]`).forEach(e => e.classList.add("sel"));
  }
  function openItem(id, adjacent = false) {
    if (!id) return;
    id = target(id);
    if (!P.items[id] && !roadmap.isStage(id)) return;
    const d = drawer();
    if (openId === id && d.open) return;
    if (openId && d.open) {
      if (!adjacent) { trail.push({ id: openId, scroll: d.querySelector(".panel-scroll")?.scrollTop || 0 }); if (trail.length > 6) trail.shift(); }
    } else {
      opener = document.activeElement; trail = [];
      openerSel = opener?.dataset?.open ? `#view [data-open="${CSS.escape(opener.dataset.open)}"]` : null;
    }
    if (noteEdit && noteEdit.startsWith("d:")) noteEdit = null;
    openId = id; renderDrawer();
    d.querySelector(".panel-scroll").scrollTop = 0;
    $("#panelTitle")?.focus({ preventScroll: true });
    markSelected();
  }
  function panelBack() {
    const prev = trail.pop(); if (!prev) return;
    if (noteEdit && noteEdit.startsWith("d:")) noteEdit = null;
    openId = prev.id; renderDrawer();
    drawer().querySelector(".panel-scroll").scrollTop = prev.scroll;
    $("#panelTitle")?.focus({ preventScroll: true });
    markSelected();
  }
  function closePanel() { if (drawer().open) drawer().close(); if (openId) panelClosed(); }
  function panelClosed() {
    openId = null; trail = [];
    if (noteEdit && noteEdit.startsWith("d:")) noteEdit = null;
    if (toastEl && toastEl.parentElement !== document.body) document.body.append(toastEl);
    drawer().innerHTML = ""; document.body.classList.remove("drawer-open"); markSelected();
    // Progress changes re-render the page behind the panel; fall back to the matching control.
    const back = opener?.isConnected ? opener : openerSel && document.querySelector(openerSel);
    back?.focus({ preventScroll: true });
    opener = openerSel = null;
  }
  // Escape and backdrop clicks close the dialog natively; a close event queued before a reopen is ignored.
  drawer().addEventListener("close", () => { if (openId && !drawer().open) panelClosed(); });
  drawer().addEventListener("click", e => { if (e.target === drawer()) closePanel(); });
  function showRoadRow(key) {
    closePanel(); roadHighlight = key;
    if (route() !== "roadmap") location.hash = "#roadmap"; else render();
  }
  function scrollToRow() {
    const el = roadHighlight && document.getElementById("row-" + roadHighlight);
    if (el) el.scrollIntoView({ block: "center" });
  }

  // ---------- routing / render ----------
  const practice = globalThis.AEPractice.create({ catalog: globalThis.AEPracticeCatalog, getState: () => S, save, touch, toast });
  $("#trackerSubnav").innerHTML = practice.model.tools.map(t => `<a href="#trackers/${esc(t.id)}">${esc(t.name)}</a>`).join("");
  const views = { trackers: practice.hub, ...Object.fromEntries(practice.model.tools.map(t => ["trackers/" + t.id, () => practice.toolView(t.id)])), topics: planViews.topics, roadmap: () => planViews.roadmap(roadHighlight), dashboard: vDashboard, resources: vResources, notes: vNotes, log: vLog, todo: vTodo };
  const ALIAS = { kb: "notes", knowledge: "notes", interview: "roadmap", skills: "topics", areas: "topics", library: "resources" };
  function route() {
    let r = location.hash.replace("#", "");
    if (ALIAS[r]) { if (r === "library") S.ui.res = "lib"; r = ALIAS[r]; history.replaceState(null, "", "#" + r); }
    return views[r] ? r : "topics";
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
    markSelected();
    if (r === "roadmap") scrollToRow(); else roadHighlight = null;
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
    const rows = roadmap.rows, doneRows = rows.slice(0, 6), partial = rows.slice(6, 8);
    const finish = id => { const x = it(id); s.ck[id] = x.dod.map(() => true); s.done[id] = Store.today(); s.pc[id] = x.practice.map(() => true); s.rc[id] = Object.fromEntries(x.learn.map(resolve).map(r => [r.key, rnd() > 0.3])); };
    doneRows.forEach(row => {
      (row.learn || []).forEach(finish); if (row.milestone) finish(row.milestone);
      if (row.stage) { const st = roadmap.stage(row.stage); roadmap.stageChecks(st).forEach(c => { (s.ck[c.owner] ||= [])[c.idx] = true; }); roadmap.stageTasks(st).forEach(t => { (s.pc[t.owner] ||= [])[t.idx] = true; }); s.built[st.id] = Store.today(); }
      if (row.checkpoint) P.checkpoints[row.checkpoint].items.forEach((_, i) => { s.g[row.checkpoint + "-" + i] = true; });
    });
    partial.forEach(row => (row.learn || []).forEach(id => { s.ck[id] = it(id).dod.map(() => rnd() > 0.5); s.pc[id] = it(id).practice.map(() => rnd() > 0.5); }));
    const ids = [...doneRows, ...partial].flatMap(row => row.learn || []);
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
    s.lib = { ytKahanStar: "done", ytCafferkyDim: "later", podAE: "later", arWhatIsAE: "done", corr: "later" };
    s.reading = { dwt: { status: "reading", note: "Ch. 6 · Order Management", pct: 35, updated: Store.today() } };
    s.savedAt = Date.now();
    s.todo = [{ id: Store.uid(), text: "Try FILTER for conditional SQL counts", done: false, c: Store.today(), u: Store.today() }];
    return migrate(s);
  }
  const download = () => dl(JSON.stringify(S, null, 2), `ae-roadmap-progress-${dayKey(new Date())}.json`, "application/json");

  // ---------- toast ----------
  let toastT = null;
  const toastEl = document.getElementById("toast");
  function toast(msg, bad) {
    const t = toastEl; if (!t) return;
    // A modal panel sits in the top layer, so the toast moves inside it while it is open.
    const host = $("#drawer")?.open ? $("#drawer") : document.body;
    if (t.parentElement !== host) host.append(t);
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
      <ul class="small"><li><code>progress.json</code> — lesson checks, completed lessons and stages, practice and resource ticks, library, daily log and to dos (older ratings are kept too)</li>
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
    const t = e.target.closest("[data-open],[data-road],[data-act],[data-nb],[data-rtab],[data-larea],[data-time],[data-fmt],[data-lstatus],[data-libles],[data-note-format],[data-list]");
    if (!t || t.disabled) return;
    if (t.dataset.list) return formatList($("textarea", t.closest(".editor-shell")), t.dataset.list === "number");
    if (t.dataset.noteFormat === "link") return formatLink($("textarea", t.closest(".editor-shell")));
    if (t.dataset.noteFormat) return formatNote($("textarea", t.closest(".editor-shell")), NOTE_FORMAT[t.dataset.noteFormat]);
    if (t.dataset.open !== undefined) { if (t.tagName === "BUTTON") e.preventDefault(); return openItem(t.dataset.open, !!t.dataset.adjacent); }
    if (t.dataset.road !== undefined) { e.preventDefault(); return showRoadRow(t.dataset.road); }
    if (t.dataset.nb !== undefined) { e.preventDefault(); NF.track = t.dataset.nb; if (route() !== "notes") location.hash = "#notes"; else render(); return; }
    if (t.dataset.rtab) { S.ui.res = t.dataset.rtab; save(); return render(); }
    if (t.dataset.larea !== undefined) {
      libF.area = libF.area === t.dataset.larea ? "" : t.dataset.larea; libF.pick = null; updLib();
      $("#libChips")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (t.dataset.time !== undefined) { libF.time = libF.time === t.dataset.time ? "" : t.dataset.time; libF.pick = null; return updLib(); }
    if (t.dataset.fmt) { const f = t.dataset.fmt; if (libF.formats.has(f)) libF.formats.delete(f); else libF.formats.add(f); libF.pick = null; return updLib(); }
    if (t.dataset.lstatus) { libF.status = t.dataset.lstatus; libF.pick = null; return updLib(); }
    if (t.dataset.libles) { libF.lesson = t.dataset.libles; return updLib(); }
    switch (t.dataset.act) {
      case "close": return closePanel();
      case "closepanel": return closePanel();
      case "back": return panelBack();
      case "jump": { const c = currentRow(); const el = c && document.getElementById("row-" + c.key); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      case "complete": {
        const id = t.dataset.id; if (!roadmap.canComplete(id)) return;
        S.done[id] = Store.today(); touch(); save(); rerender();
        return toast(roadmap.connections(id).length ? "Lesson complete ✓ Portfolio readiness updated on the roadmap." : "Lesson complete ✓");
      }
      case "reopen": delete S.done[t.dataset.id]; save(); return rerender();
      case "build": {
        const st = roadmap.stage(t.dataset.id); if (!st || !roadmap.canBuild(st)) return;
        S.built[st.id] = Store.today(); touch(); save(); rerender();
        return toast("Stage built ✓ Later stages updated.");
      }
      case "unbuild": delete S.built[t.dataset.id]; save(); return rerender();
      case "dailylog": {
        opener = openerSel = null; closePanel(); entryFocus = entryKey("log");
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
      case "libclear": Object.assign(libF, { q: "", area: "", time: "", status: "todo", pick: null }); libF.formats.clear(); if ($("#lq")) $("#lq").value = ""; return updLib();
      case "libmore": { const g = t.dataset.group; if (libF.open.has(g)) libF.open.delete(g); else libF.open.add(g); updLib(); return document.querySelector(`[data-act="libmore"][data-group="${CSS.escape(g)}"]`)?.focus(); }
      case "readstart": return setReading(t.dataset.key, "reading");
      case "readset": return setReading(t.dataset.key, t.dataset.status);
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
      case "reset": if (confirm("Clear all progress, checks, log, notes, to dos, library ticks, reading status and practice progress?" + folderNote())) { S = blank(); clearDrafts(); save(); closePanel(); noteEdit = null; rerender(); updatePill(); } return;
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
    if (t.dataset.ck) { const [id, i] = t.dataset.ck.split("|"); (S.ck[id] = S.ck[id] || [])[+i] = t.checked; touch(); save(); return rerender(); }
    if (t.dataset.pc) { const [id, i] = t.dataset.pc.split("|"); (S.pc[id] = S.pc[id] || [])[+i] = t.checked; touch(); save(); return rerender(); }
    if (t.dataset.rc) {
      const [id, k] = t.dataset.rc.split("|"); (S.rc[id] = S.rc[id] || {})[k] = t.checked;
      if (!t.checked && S.lib[k] === "done") delete S.lib[k];
      touch(); save(); return rerender();
    }
    if (t.dataset.lib) { setLibDone(t.dataset.lib, t.checked); touch(); save(); if ($("#libShelves")) return updLib(); return rerender(); }
    if (t.id === "rkind") return filterResources();
    if (t.id === "larea") { libF.area = t.value; libF.pick = null; return updLib(); }
    if (t.dataset.rnote !== undefined) { resources.setProgress(t.dataset.rnote, { note: t.value }); save(); return updLib(); }
    if (t.dataset.rpct !== undefined) { resources.setProgress(t.dataset.rpct, { pct: t.value }); save(); return updLib(); }
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
      // The open side panel closes itself on Escape unless a note inside it is being edited.
      if (noteEdit) { if (drawer().open) e.preventDefault(); cancelEdit(); return rerender(); }
      if (drawer().open) return;
      const kind = route();
      if (entryEdit[kind]) { cancelEntry(kind); return rerender(); }
    }
  });
  document.addEventListener("toggle", e => {
    if (e.target.id === "todoCompleted") todoDoneOpen = e.target.open;
    if (e.target.dataset.noteKey) { if (e.target.open) noteExpanded.add(e.target.dataset.noteKey); else noteExpanded.delete(e.target.dataset.noteKey); }
    if (e.target.dataset.area && e.target.closest?.(".area-card")) { if (e.target.open) planViews.expanded.add(e.target.dataset.area); else planViews.expanded.delete(e.target.dataset.area); }
    if (e.target.dataset.reading) { const k = "r:" + e.target.dataset.reading; if (e.target.open) planViews.expanded.add(k); else planViews.expanded.delete(k); }
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

  window.AE = { build: "2026-10-13.5", state: () => S, openItem, closePanel, order, isDone, currentRow, roadmap, resources, syncFolder, Store, Cloud, LIB, Practice: practice };
  themeLabel();
  render();
  updatePill();
  guard(Store.init().then(async i => {
    if (i.state === "connected") await syncFolder("startup");
    if (Cloud) await Cloud.init({ current: () => S, empty: blank, hasData, apply: applyCloud,
      account: uid => { activeKey = Cloud.stateKey(uid); if (accountUid !== uid) { clearDrafts(); } accountUid = uid; },
      signedOut: () => { accountUid = null; activeKey = KEY; S = load(); clearDrafts(); closePanel(); rerender(); }
    });
  }));
})();
