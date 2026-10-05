(() => {
  const P = window.PLAN, KEY = "ae-prep-tracker-v2";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  const pct = v => Math.round(v * 100) + "%";

  // ---------- index ----------
  const order = [], where = {};
  P.stages.forEach(st => st.steps.forEach(sp => sp.items.forEach(id => { order.push(id); where[id] = { stage: st.n, step: sp.id }; })));
  order.forEach(id => { if (!P.items[id]) console.error("Missing item " + id); });
  Object.keys(P.items).forEach(id => { if (!where[id]) console.error("Item not on roadmap " + id); });
  const allSteps = P.stages.flatMap(st => st.steps.map(sp => Object.assign({ stage: st.n }, sp)));
  const trackName = Object.fromEntries(P.tracks.map(t => [t.id, t.name]));

  // ---------- state ----------
  const Store = window.AEStore, GEN = Store.GENERAL;
  // notes: [{ id, track, text, topic?, c, u }] (first line of text = title) · lib: { resourceKey: "done"|"later" } · act: { "YYYY-MM-DD": actions }
  const blank = () => ({ v: 4, setupV: 2, curriculumV: P.curriculumV, savedAt: 0, r: {}, pc: {}, rc: {}, g: {}, notes: [], lib: {}, act: {}, log: [], ui: { hideDone: false, showOpt: true, res: "topic" } });
  const trackOf = topic => P.items[topic] ? P.items[topic].track : GEN;
  const trackLabel = t => t === GEN ? "General" : trackName[t] || t;
  // older typed knowledge-base entries (v3) become plain notes
  function kbText(e) {
    const head = ((e.t === "qa" ? "Q: " : "") + String(e.q || "").replace(/\s*\n\s*/g, " ").trim()) || "(untitled)";
    const parts = [];
    if (e.url) parts.push(String(e.url).trim());
    if (e.a && String(e.a).trim()) parts.push(e.t === "snippet" ? "```" + (e.lang || "") + "\n" + String(e.a).replace(/\s+$/, "") + "\n```" : String(e.a).trim());
    if (e.tags && e.tags.length) parts.push(e.tags.map(t => "#" + t).join(" "));
    return [head, parts.join("\n\n")].filter(Boolean).join("\n");
  }
  function migrate(s) {
    const oldSetup = !!s && s.setupV !== 2;
    const oldCurriculum = s?.curriculumV ?? 3;
    s = Object.assign(blank(), s || {});
    s.ui = Object.assign(blank().ui, s.ui || {}); delete s.ui.iv;
    ["r", "pc", "rc", "g", "lib", "act"].forEach(k => { if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {}; });
    if (!Array.isArray(s.log)) s.log = [];
    const now = Store.today(), list = [];
    if (Array.isArray(s.notes)) list.push(...s.notes.filter(n => n && typeof n.text === "string" && n.text.trim()));
    else if (s.notes && typeof s.notes === "object") // v2: free text per topic
      Object.entries(s.notes).forEach(([id, txt]) => { txt = String(txt || "").trim(); if (txt) list.push({ track: trackOf(id), topic: id, text: txt }); });
    if (s.kb && typeof s.kb === "object") // v3: typed entries per topic
      Object.entries(s.kb).forEach(([topic, es]) => (Array.isArray(es) ? es : []).forEach(e => list.push({ id: e.id, track: trackOf(topic), topic, text: kbText(e), c: e.c, u: e.u })));
    const ids = new Set();
    s.notes = list.map(n => {
      const x = { id: n.id && !ids.has(n.id) ? n.id : Store.uid(), track: n.track === GEN || trackName[n.track] ? n.track : GEN, text: n.text.replace(/\s+$/, ""), c: n.c || now };
      x.u = n.u || x.c;
      if (n.topic && P.items[n.topic]) x.topic = n.topic;
      ids.add(x.id); return x;
    });
    delete s.kb; delete s.srs;
    // Setup became a minimal lab with new checks; old ticks/ratings no longer line up
    if (oldSetup) { delete s.r.SETUP; delete s.pc.SETUP; }
    s.setupV = 2;
    // Checklist positions changed in curriculum v4. Retain exact matching checks,
    // and archive the previous values so old evidence is never silently discarded.
    const cm = P.curriculumMigration;
    if (oldCurriculum < cm.to) {
      const archive = { from: oldCurriculum, to: cm.to, r: {}, pc: {}, g: {} };
      Object.entries(cm.topics).forEach(([id, fields]) => {
        Object.entries(fields).forEach(([key, indices]) => {
          const old = s[key][id];
          if (!Array.isArray(old)) return;
          archive[key][id] = old.slice();
          s[key][id] = indices.map(i => i >= 0 ? old[i] ?? (key === "r" ? 0 : false) : (key === "r" ? 0 : false));
        });
      });
      Object.entries(cm.gates).forEach(([prefix, indices]) => {
        const old = {};
        Object.keys(s.g).filter(k => k.startsWith(prefix + "-")).forEach(k => {
          old[k] = s.g[k]; archive.g[k] = s.g[k]; delete s.g[k];
        });
        indices.forEach((i, j) => {
          if (i >= 0 && Object.hasOwn(old, prefix + "-" + i)) s.g[prefix + "-" + j] = old[prefix + "-" + i];
        });
      });
      if ([archive.r, archive.pc, archive.g].some(x => Object.keys(x).length)) {
        if (!Array.isArray(s.curriculumHistory)) s.curriculumHistory = [];
        s.curriculumHistory.push(archive);
      }
    }
    s.curriculumV = Math.max(oldCurriculum, P.curriculumV);
    s.v = 4;
    return s;
  }
  function load() {
    try { return migrate(JSON.parse(localStorage.getItem(KEY))); } catch { return blank(); }
  }
  let S = load();
  const persistLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save in the browser: " + e.message, true); } };
  function save() { S.savedAt = Date.now(); persistLocal(); Store.schedule(S, trackLabel); }
  // count a meaningful action for the activity history (future heatmap)
  const touch = () => { const d = Store.today(); S.act[d] = (S.act[d] || 0) + 1; };
  const hasData = s => s.log.length || Object.keys(s.r).length || Object.keys(s.pc).length || s.notes.length || Object.keys(s.lib).length;

  // ---------- scoring ----------
  const it = id => P.items[id];
  const role = id => P.roles[it(id).role];
  const ratings = id => { const a = S.r[id] || []; return it(id).dod.map((_, i) => a[i] || 0); };
  // progress per check: Not yet 0, Shaky 0.4, Solid/Confident 1 — so a Done topic is always 100%
  const W = [0, 0.4, 1, 1];
  const score = id => { const a = ratings(id); return a.reduce((x, y) => x + W[y], 0) / a.length; };
  const isDone = id => ratings(id).every(v => v >= 2);
  const started = id => ratings(id).some(v => v > 0) || (S.pc[id] || []).some(Boolean) || Object.values(S.rc[id] || {}).some(Boolean);
  const status = id => isDone(id) ? "done" : started(id) ? "doing" : "todo";
  const statusLabel = { done: "Done", doing: "In progress", todo: "Not started" };
  const required = order.filter(id => !it(id).opt);
  function progress(ids) {
    let h = 0, got = 0;
    ids.forEach(id => { h += it(id).h; got += score(id) * it(id).h; });
    return { pct: h ? got / h : 0, h, left: h - got };
  }
  const stepOptional = sp => sp.items.every(id => it(id).opt);
  const stepReq = sp => stepOptional(sp) ? sp.items : sp.items.filter(id => !it(id).opt);
  const stepDone = sp => stepReq(sp).every(isDone);
  const currentStep = () => allSteps.find(sp => !stepOptional(sp) && !stepDone(sp));
  const visible = id => S.ui.showOpt || !it(id).opt;

  function resolve(entry) {
    if (Array.isArray(entry)) return { key: entry[0], title: entry[0], url: entry[1], kind: entry[2] || "docs" };
    const [k, note] = entry.split("|");
    const r = P.L[k];
    if (!r) { console.error("Missing resource " + k); return { key: k, title: k, url: null, kind: "?" }; }
    return { key: k, title: r[0], url: r[1], kind: r[2], note };
  }

  // ---------- small components ----------
  const tag = id => `<span class="tag" style="--rc:${role(id).color}">${role(id).name}</span>`;
  const bar = (v, cls = "") => `<div class="bar ${cls}"><i style="width:${pct(v)}"></i></div>`;
  const nCount = id => S.notes.filter(n => n.topic === id).length;
  function card(id) {
    const x = it(id), st = status(id);
    return `<button class="card ${st}" data-open="${id}" style="--rc:${role(id).color}">
      <div class="card-top">${tag(id)}${x.opt ? '<span class="tag opt">optional</span>' : ""}<span class="cid">${id}</span></div>
      <div class="card-name">${esc(x.name)}</div>
      <div class="card-meta"><span>~${x.h}h · ${x.dod.length} checks${x.setup ? ` · <span title="Has a few install steps — see 🔧 Set up first">🔧</span>` : ""}${nCount(id) ? ` · 📝 ${nCount(id)}` : ""}</span><span class="st st-${st}">${st === "done" ? "✓ " : ""}${statusLabel[st]}</span></div>
      ${bar(score(id))}</button>`;
  }
  const chip = id => `<button class="chip ${isDone(id) ? "done" : ""}" data-open="${id}" style="--rc:${role(id).color}" title="${esc(it(id).name)} · ${pct(score(id))}">${isDone(id) ? "✓ " : ""}${id} · ${esc(it(id).name)}</button>`;

  function gate(g, key, apply) {
    const n = g.items.length, c = g.items.filter((_, i) => S.g[key + "-" + i]).length;
    return `<div class="gate ${apply ? "apply" : ""} ${c === n ? "passed" : ""}">
      <div class="dot">${apply ? "🚪" : c === n ? "✓" : "⛳"}</div>
      <div class="gate-body"><h4>${esc(g.title)} <span class="muted small">${c}/${n}</span></h4>
      ${g.note ? `<p class="small">${esc(g.note)}</p>` : ""}
      <div class="gate-items">${g.items.map((t, i) => `<label><input type="checkbox" data-gate="${key}-${i}" ${S.g[key + "-" + i] ? "checked" : ""}> ${esc(t)}</label>`).join("")}</div></div></div>`;
  }

  // ---------- views ----------
  function vRoadmap() {
    const cur = currentStep(), all = progress(required);
    const doneCount = required.filter(isDone).length;
    let h = `<div class="panel rm-head">
      <div class="grow"><h2>Your roadmap</h2>
      <p class="small"><b>Portfolio v1:</b> ${esc(P.portfolio.question)} ${esc(P.portfolio.scope)} <b>Later releases:</b> lakehouse, orchestration, semantic layer, AI and portability.</p>
      <p class="muted">Work top to bottom. Each step groups complementary topics — practice, theory and a build piece. Work in topic order within a step and finish a topic’s <b>prerequisites</b> before its deliverable. Click a topic to see what to learn, how to practice and its <b>definition of done</b>. A topic is <b>Done</b> when every check is rated <b>Solid</b> or better.</p>
      <div class="legend">${Object.values(P.roles).map(r => `<span><i style="background:${r.color}"></i>${r.name}</span>`).join("")}</div></div>
      <div class="kpis small-kpis">
        <div><b>${pct(all.pct)}</b><span>overall</span></div>
        <div><b>${doneCount}/${required.length}</b><span>topics done</span></div>
        <div><b>~${Math.round(all.left)}h</b><span>left (est.)</span></div>
        <div><b>${cur ? cur.id : "🎉"}</b><span>current step</span></div>
      </div>
      <div class="rm-tools"><button class="btn primary" data-act="jump">📍 Jump to current step</button>
        <label><input type="checkbox" data-act="hideDone" ${S.ui.hideDone ? "checked" : ""}> Hide finished steps</label>
        <label><input type="checkbox" data-act="showOpt" ${S.ui.showOpt ? "checked" : ""}> Show optional topics</label></div>
    </div><div class="timeline">`;
    P.stages.forEach(st => {
      const p = progress(st.steps.flatMap(s => s.items).filter(id => !it(id).opt));
      h += `<section class="stage"><div class="stage-head"><div class="stage-num">${st.n}</div>
        <div class="grow"><h3>Stage ${st.n} · ${esc(st.name)}</h3><p class="muted">${esc(st.goal)}</p>${bar(p.pct, "thick")}</div>
        <div class="stage-p"><b>${pct(p.pct)}</b><span>~${p.h}h</span></div></div>`;
      st.steps.forEach(sp => {
        const opt = stepOptional(sp);
        if (opt && !S.ui.showOpt) return;
        const done = stepDone(sp);
        if (done && S.ui.hideDone) return;
        const isCur = cur && cur.id === sp.id;
        const ids = sp.items.filter(visible);
        const hrs = ids.reduce((a, id) => a + it(id).h, 0);
        h += `<div class="step ${done ? "done" : ""} ${isCur ? "current" : ""}" id="step-${sp.id}">
          <div class="dot">${done ? "✓" : sp.id}</div>
          <div class="step-body"><div class="step-head"><h4>Step ${sp.id} · ${esc(sp.title)}</h4>
          ${isCur ? '<span class="here">📍 You are here</span>' : ""}${opt ? '<span class="tag opt">optional</span>' : ""}
          <span class="muted small">~${hrs}h · follow prerequisite order</span></div>
          ${done && !isCur ? `<div class="chips">${ids.map(chip).join("")}</div>` : `<div class="cards">${ids.map(card).join("")}</div>`}
          </div></div>`;
      });
      h += gate(st.gate, "s" + st.n);
      if (st.apply) h += gate(st.apply, "apply", true);
      h += `</section>`;
    });
    h += `<div class="panel skip"><h4>Skip for now</h4><div class="chips">${P.skip.map(s => `<span class="chip static">${esc(s)}</span>`).join("")}</div></div>`;
    return h + `</div>`;
  }

  function vSkills() {
    let h = `<div class="panel"><h2>Skills map</h2><p class="muted">The same topics, arranged by skill track (rows) and stage (columns). Fill = your self-rating; ✓ = done. Click any topic to open it.</p></div>
      <div class="skills-wrap"><table class="skills"><thead><tr><th>Track</th>${P.stages.map(s => `<th>${s.n} · ${esc(s.name)}</th>`).join("")}<th>Progress</th></tr></thead><tbody>`;
    P.tracks.forEach(t => {
      const ids = order.filter(id => it(id).track === t.id);
      const p = progress(ids.filter(id => !it(id).opt));
      h += `<tr><th><div>${esc(t.name)}${t.star ? " ⭐" : ""}</div><span class="muted small">${t.tier}</span></th>
        ${P.stages.map(s => `<td>${ids.filter(id => where[id].stage === s.n && visible(id)).map(id =>
          `<button class="schip st-${status(id)}" data-open="${id}" style="--s:${score(id)};--rc:${role(id).color}" title="${esc(it(id).name)} · ${pct(score(id))}"><b>${isDone(id) ? "✓ " : ""}${id}</b><small>${esc(it(id).name)}</small></button>`).join("")}</td>`).join("")}
        <td class="tp">${bar(p.pct)}<span class="small">${pct(p.pct)}</span></td></tr>`;
    });
    return h + `</tbody></table></div>`;
  }

  // dashboard helpers
  const dayKey = d => Store.today(d);
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
    for (let i = W - 1; i >= 0; i--) { const s = new Date(ws); s.setDate(s.getDate() - 7 * i); weeks.push({ s, v: { P: 0, T: 0, B: 0, J: 0 } }); }
    S.log.forEach(e => {
      const k = weekStart(new Date(e.d + "T12:00:00")).getTime();
      const w = weeks.find(x => x.s.getTime() === k);
      if (w) w.v[e.role] = (w.v[e.role] || 0) + Number(e.h);
    });
    const max = Math.max(P.effort.weekly + 2, ...weeks.map(w => Object.values(w.v).reduce((a, b) => a + b, 0)));
    const cw = 640, ch = 190, pad = 26, bw = (cw - pad) / W - 8;
    const y = v => ch - 20 - (v / max) * (ch - 34);
    let svg = `<svg viewBox="0 0 ${cw} ${ch}" class="chart" role="img" aria-label="Hours per week">`;
    svg += `<line x1="${pad}" x2="${cw}" y1="${y(P.effort.weekly)}" y2="${y(P.effort.weekly)}" class="target"/><text x="${cw - 4}" y="${y(P.effort.weekly) - 4}" text-anchor="end" class="axis">target ${P.effort.weekly}h</text>`;
    weeks.forEach((w, i) => {
      let base = 0; const x = pad + i * (bw + 8);
      ["P", "T", "B", "J"].forEach(r => {
        const v = w.v[r]; if (!v) return;
        svg += `<rect x="${x}" y="${y(base + v)}" width="${bw}" height="${y(base) - y(base + v)}" fill="${P.roles[r].color}" rx="2"><title>${P.roles[r].name}: ${v}h</title></rect>`;
        base += v;
      });
      svg += `<text x="${x + bw / 2}" y="${ch - 5}" text-anchor="middle" class="axis">${w.s.getMonth() + 1}/${w.s.getDate()}</text>`;
    });
    return svg + `</svg>`;
  }

  function vDashboard() {
    const all = progress(required), cur = currentStep();
    const total = S.log.reduce((a, e) => a + Number(e.h), 0);
    const ws = dayKey(weekStart(new Date()));
    const week = S.log.filter(e => e.d >= ws).reduce((a, e) => a + Number(e.h), 0);
    const byRole = { P: 0, T: 0, B: 0, J: 0 }; S.log.forEach(e => byRole[e.role] = (byRole[e.role] || 0) + Number(e.h));
    const target = { P: 30, T: 25, B: 40, J: 5 };
    const ratedChecks = required.reduce((a, id) => a + ratings(id).filter(v => v >= 2).length, 0);
    const allChecks = required.reduce((a, id) => a + it(id).dod.length, 0);
    const next = cur ? cur.items.filter(id => !isDone(id) && visible(id)) : [];
    return `<div class="kpis">
        <div class="kpi"><b>${pct(all.pct)}</b><span>overall (hours-weighted)</span></div>
        <div class="kpi"><b>${required.filter(isDone).length}/${required.length}</b><span>topics done</span></div>
        <div class="kpi"><b>${ratedChecks}/${allChecks}</b><span>checks Solid+</span></div>
        <div class="kpi"><b>${week.toFixed(1)}h</b><span>this week (target ${P.effort.weekly})</span></div>
        <div class="kpi"><b>${total.toFixed(1)}h</b><span>logged total</span></div>
        <div class="kpi"><b>${streak()}d</b><span>streak</span></div>
        <div class="kpi"><b>${S.notes.length}</b><span><a href="#notes">notes</a> · ${LIB.filter(x => libDone(x.key)).length} library items done</span></div>
      </div>
      <div class="grid2">
        <div class="panel"><h3>Up next ${cur ? `<span class="muted small">Step ${cur.id} · ${esc(cur.title)}</span>` : ""}</h3>
          ${next.length ? `<div class="cards">${next.map(card).join("")}</div>` : `<p class="muted">Everything done 🎉</p>`}</div>
        <div class="panel"><h3>Hours per week</h3>${weeklyChart()}
          <div class="legend">${Object.values(P.roles).map(r => `<span><i style="background:${r.color}"></i>${r.name}</span>`).join("")}</div></div>
        <div class="panel"><h3>Time balance <span class="muted small">actual vs suggested mix</span></h3>
          ${["P", "T", "B", "J"].map(r => { const a = total ? byRole[r] / total : 0; return `<div class="lane-row"><span style="color:${P.roles[r].color}">${P.roles[r].name}</span><div class="bar"><i style="width:${pct(a)};background:${P.roles[r].color}"></i><em style="left:${target[r]}%"></em></div><span class="small">${pct(a)} / ${target[r]}%</span></div>`; }).join("")}</div>
        <div class="panel"><h3>Stages</h3>
          ${P.stages.map(st => { const p = progress(st.steps.flatMap(s => s.items).filter(id => !it(id).opt)); return `<div class="lane-row"><span>${st.n} · ${esc(st.name)}</span>${bar(p.pct)}<span class="small">${pct(p.pct)}</span></div>`; }).join("")}</div>
        <div class="panel wide"><h3>Skill tracks</h3><div class="tracks-grid">
          ${P.tracks.map(t => { const p = progress(order.filter(id => it(id).track === t.id && !it(id).opt)); return `<div class="lane-row"><span>${esc(t.name)}${t.star ? " ⭐" : ""}</span>${bar(p.pct)}<span class="small">${pct(p.pct)}</span></div>`; }).join("")}</div></div>
      </div>`;
  }

  // ---------- resources ----------
  const TIME = { quick: ["⚡", "≤30 min"], hour: ["⏱", "~1 hour"], series: ["📺", "Pick a piece"], deep: ["📚", "Multi-session"], ref: ["🔎", "Reference"] };
  const KINDS = ["video", "podcast", "article", "newsletter", "course", "book", "practice", "docs", "tool"];
  const ORPHAN = { pgex: ["sql", "perf"], cmu: ["perf", "arch"], pyStdlib: ["py"], fluentPy: ["py"], realPython: ["py"] };
  // every resource once: the roadmap's (areas = tracks of the topics that use it, in roadmap order) + extras to watch, read or listen to
  const LIB = (() => {
    const m = new Map();
    order.forEach(id => it(id).learn.map(resolve).forEach(r => {
      if (!m.has(r.key)) m.set(r.key, { key: r.key, title: r.title, url: r.url, kind: r.kind, areas: [], topics: [], why: "" });
      const x = m.get(r.key);
      if (!x.topics.includes(id)) x.topics.push(id);
      if (!x.areas.includes(it(id).track)) x.areas.push(it(id).track);
    }));
    Object.entries(P.L).forEach(([k, r]) => { if (!m.has(k)) m.set(k, { key: k, title: r[0], url: r[1], kind: r[2], areas: (ORPHAN[k] || []).slice(), topics: [], why: "" }); });
    Object.entries(P.LX).forEach(([k, r]) => m.set(k, { key: k, title: r[0], url: r[1], kind: r[2], areas: r[3].slice(), topics: [], time: r[4], why: r[5] || "" }));
    return [...m.values()].map(x => {
      if (!x.areas.length) x.areas = ["career"];
      x.time = TIME[x.time] ? x.time : P.LT[x.key] || ({ docs: "ref", tool: "ref", book: "deep", course: "deep" })[x.kind] || "series";
      x.text = [x.title, x.why, x.kind, ...x.areas.map(a => trackName[a]), ...x.topics].join(" ").toLowerCase();
      return x;
    });
  })();
  const libDone = k => S.lib[k] === "done" || Object.values(S.rc).some(m => m && m[k]);
  const libLater = k => S.lib[k] === "later" && !libDone(k);
  function setLibDone(k, on) {
    if (on) { S.lib[k] = "done"; return; }
    delete S.lib[k];
    Object.values(S.rc).forEach(m => { if (m) delete m[k]; });
  }

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

  function topicOptions(sel) {
    return `<option value="">— general —</option>` + P.stages.map(st => `<optgroup label="Stage ${st.n} · ${esc(st.name)}">${st.steps.flatMap(s => s.items).map(id => `<option value="${id}" ${sel === id ? "selected" : ""}>${id} · ${esc(it(id).name)}</option>`).join("")}</optgroup>`).join("");
  }
  function vLog() {
    const today = dayKey(new Date());
    const rows = [...S.log].map((e, i) => ({ e, i })).sort((a, b) => b.e.d.localeCompare(a.e.d) || b.i - a.i);
    return `<div class="panel"><h2>Practice log</h2>
      <form id="logform" class="logform">
        <label>Date<input type="date" name="d" value="${today}" required></label>
        <label>Hours<input type="number" name="h" min="0.25" step="0.25" value="1" required></label>
        <label>Topic<select name="item">${topicOptions("")}</select></label>
        <label>Type<select name="role">${Object.entries(P.roles).map(([k, r]) => `<option value="${k}">${r.name}</option>`).join("")}</select></label>
        <label class="grow">Note<input name="note" placeholder="What did you do / learn?"></label>
        <button class="btn primary">Add</button>
      </form></div>
      <div class="panel"><table class="log"><thead><tr><th>Date</th><th>Hours</th><th>Type</th><th>Topic</th><th>Note</th><th></th></tr></thead><tbody>
      ${rows.length ? rows.map(({ e, i }) => `<tr><td>${e.d}</td><td>${e.h}</td><td><span class="tag" style="--rc:${P.roles[e.role].color}">${P.roles[e.role].name}</span></td>
        <td>${e.item && P.items[e.item] ? `<button class="link-btn" data-open="${e.item}">${e.item} · ${esc(it(e.item).name)}</button>` : "—"}</td><td>${esc(e.note)}</td>
        <td><button class="icon" data-dellog="${i}" title="Delete">✕</button></td></tr>`).join("") : `<tr><td colspan="6" class="muted">No entries yet.</td></tr>`}
      </tbody></table></div>`;
  }

  // ---------- notes ----------
  const NF = { track: "", q: "" };      // Notes view: selected bucket ("" = all) and search
  const drafts = {};                     // unsaved text per form key — survives re-renders
  let noteEdit = null, focusKey = null;  // noteEdit = "v:<id>" (Notes view) or "d:<id>" (drawer)
  const URL_RE = /https?:\/\/[^\s<>"'`]*[^\s<>"'`.,;:!?)\]]/g;
  const fmt = s => md(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  function inl(s) {
    s = String(s || ""); let out = "", i = 0;
    s.replace(URL_RE, (u, at) => { out += fmt(s.slice(i, at)) + `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`; i = at + u.length; return u; });
    return out + fmt(s.slice(i));
  }
  function mdBlock(s) {
    return String(s || "").split(/(```[^\n]*\n[\s\S]*?\n```)/).map(p => {
      const f = p.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
      if (f) return `<pre class="code"><code>${esc(f[1])}</code></pre>`;
      return p.trim().split(/\n{2,}/).filter(Boolean).map(par => {
        const lines = par.split("\n");
        if (lines.every(l => /^\s*[-*] /.test(l))) return `<ul>${lines.map(l => `<li>${inl(l.replace(/^\s*[-*] /, ""))}</li>`).join("")}</ul>`;
        return `<p>${lines.map(inl).join("<br>")}</p>`;
      }).join("");
    }).join("");
  }
  const noteSort = list => list.map((n, i) => [n, i]).sort((a, b) => (b[0].u || "").localeCompare(a[0].u || "") || b[1] - a[1]).map(x => x[0]);
  const trackOpts = sel => `<option value="${GEN}" ${sel === GEN ? "selected" : ""}>General</option>` + P.tracks.map(t => `<option value="${t.id}" ${sel === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  function noteForm(key, { text = "", track = GEN, topic = "", nid = "", pick = true } = {}) {
    const tv = drafts[key + ":t"] ?? track;
    return `<form class="nform" data-key="${esc(key)}" ${nid ? `data-nid="${esc(nid)}"` : ""} ${topic ? `data-topic="${esc(topic)}"` : ""}>
      <textarea name="text" placeholder="${nid ? "" : "Write a note — the first line becomes its title. **bold**, `code`, - lists and ``` code blocks work; links become clickable."}">${esc(drafts[key] ?? text)}</textarea>
      <div class="row">${pick ? `<select name="track" title="Track">${trackOpts(tv)}</select>` : ""}
        <button class="btn primary sm">${nid ? "Save" : "Add note"}</button>${nid ? `<button type="button" class="btn sm" data-act="ncancel">Cancel</button>` : ""}
        <span class="muted small">Ctrl+Enter</span></div></form>`;
  }
  function noteCard(n, inDrawer) {
    const k = (inDrawer ? "d:" : "v:") + n.id;
    if (noteEdit === k) return `<div class="nt editing">${noteForm("e" + k, { text: n.text, track: n.track, nid: n.id })}</div>`;
    const [first, ...rest] = n.text.split("\n"), body = rest.join("\n").trim();
    const text = [n.text, trackLabel(n.track), n.topic ? n.topic + " " + it(n.topic).name : ""].join(" ").toLowerCase();
    return `<div class="nt" data-text="${esc(text)}">
      <div class="nt-head"><div class="nt-title">${inl(first)}</div><span class="nt-tools"><button class="icon sm" data-act="nedit" data-nk="${esc(k)}" title="Edit">✎</button><button class="icon sm" data-act="ndel" data-nid="${esc(n.id)}" title="Delete">🗑</button></span></div>
      ${body ? `<div class="nt-body">${mdBlock(body)}</div>` : ""}
      <div class="nt-foot small muted">${inDrawer ? "" : `<span class="ttag">${esc(trackLabel(n.track))}</span>`}${n.topic && !inDrawer ? `<button class="tchip" data-open="${n.topic}" title="Open topic">${n.topic} · ${esc(it(n.topic).name)}</button>` : ""}<span class="nt-date">${esc(n.u || n.c || "")}</span></div></div>`;
  }
  function vNotes() {
    const cnt = {}; S.notes.forEach(n => cnt[n.track] = (cnt[n.track] || 0) + 1);
    const sel = NF.track, list = noteSort(S.notes.filter(n => !sel || n.track === sel));
    const b = (id, name) => `<button class="nb ${sel === id ? "on" : ""} ${id && !cnt[id] ? "empty" : ""}" data-nb="${id}"><span>${esc(name)}</span><b>${id ? cnt[id] || 0 : S.notes.length}</b></button>`;
    return `<div class="panel"><div class="rm-head"><div class="grow"><h2>Notes</h2>
        <p class="muted">Your findings in your own words — one bucket per track, nothing else to sort. The first line is the title. Notes you add from a topic's panel are linked to that topic.</p></div>
        <div class="rm-tools"><button class="btn" data-act="exportmd" ${S.notes.length ? "" : "disabled"}>⬇ Download as Markdown</button></div></div></div>
      <div class="notes-layout"><aside class="panel nside">${b("", "All notes")}${b(GEN, "General")}<div class="nsep"></div>${P.tracks.map(t => b(t.id, t.name)).join("")}</aside>
      <div class="nmain"><div class="panel nadd">${noteForm("new:" + (sel || "all"), { track: sel || GEN })}</div>
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
        <section class="quick"><h4>Log time on this topic</h4><div class="row"><input type="number" id="qh" min="0.25" step="0.25" value="1"> <span class="small">hours today as <b style="color:${role(id).color}">${role(id).name}</b></span>
          <button class="btn primary" data-act="quicklog">Log</button><span id="qmsg" class="small muted"></span></div></section>
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
  const views = { roadmap: vRoadmap, skills: vSkills, dashboard: vDashboard, resources: vResources, notes: vNotes, log: vLog };
  const ALIAS = { kb: "notes", knowledge: "notes", interview: "roadmap", library: "resources" };
  function route() {
    let r = location.hash.replace("#", "");
    if (ALIAS[r]) { if (r === "library") S.ui.res = "lib"; r = ALIAS[r]; history.replaceState(null, "", "#" + r); }
    return views[r] ? r : "roadmap";
  }
  function render() {
    const r = route();
    $("#view").innerHTML = views[r]();
    document.querySelectorAll("nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + r));
    if (openId) document.querySelectorAll(`#view [data-open="${openId}"]`).forEach(e => e.classList.add("sel"));
    if (r === "resources" && S.ui.res !== "lib") filterResources();
    if (r === "notes") filterNotes();
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
    const roles = ["P", "P", "T", "B", "B", "J"], ids = allSteps.filter(sp => doneSteps.concat(partial).includes(sp.id)).flatMap(sp => sp.items);
    for (let i = 70; i >= 0; i--) {
      if (rnd() < 0.45) continue;
      const d = new Date(); d.setDate(d.getDate() - i);
      const id = ids[Math.floor(rnd() * ids.length)];
      s.log.push({ d: dayKey(d), h: [0.5, 1, 1, 1.5, 2, 3][Math.floor(rnd() * 6)], role: rnd() < 0.7 ? it(id).role : roles[Math.floor(rnd() * roles.length)], item: id, note: "Sample entry" });
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
    return s;
  }
  function dl(text, name, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
    const ok = i.state === "connected" && !i.err, warn = i.state === "locked" || !!i.err;
    b.textContent = i.state === "connected" ? (i.err ? "⚠️ Save failed" : `📁 ${i.name}`) : i.state === "locked" ? "⚠️ Reconnect folder" : "💾 Browser only";
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
    $("#dataDlg").innerHTML = `<form method="dialog" class="dlg-x"><button class="icon" title="Close">✕</button></form>
      <h2>Your data</h2>${status}
      <h4>What's saved in the folder</h4>
      <ul class="small"><li><code>progress.json</code> — ratings, practice and resource ticks, library, log</li>
        <li><code>notes/</code> — your notes as Markdown, one file per track (<code>general.md</code> for the rest). Open and edit them in VS Code, Obsidian or GitHub; changes show up here when you return to this tab. An older <code>knowledge/</code> folder is imported once and left untouched.</li>
        <li><code>backups/</code> — a full snapshot each day you use it (last 14 kept). Restore one with Import.</li></ul>
      <h4>Moving to your personal laptop</h4>
      <ol class="small"><li>Keep the data folder somewhere synced or versioned: personal OneDrive / Dropbox, or a <b>private GitHub repo</b> (you also get a history of your notes).</li>
        <li>Copy the app folder (<code>index.html</code>, <code>app.js</code>, <code>store.js</code>, <code>data.js</code>) — keep it <b>separate</b> from the data folder so app updates never touch your data.</li>
        <li>Open <code>index.html</code> in Edge or Chrome → 💾 → <b>Connect a data folder</b> → pick the same folder.</li></ol>
      <h4>Backup & tools</h4>
      <div class="row"><button class="btn" data-act="export">⬇ Export JSON</button><button class="btn" data-act="import">⬆ Import JSON</button><button class="btn" data-act="exportmd" ${S.notes.length ? "" : "disabled"}>⬇ Notes as Markdown</button><button class="btn" data-act="sample">Sample data</button><button class="btn danger" data-act="reset">Reset</button></div>`;
  }
  // Decide between the folder copy and this browser's copy, then load/write.
  async function syncFolder(reason) {
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
  const folderNote = () => Store.info().state === "connected" ? `\n\nThis also changes the data folder “${Store.info().name}” (today's backup in backups/ stays).` : "";

  // ---------- theme ----------
  const sysDark = matchMedia("(prefers-color-scheme: dark)");
  const curTheme = () => document.documentElement.dataset.theme || (sysDark.matches ? "dark" : "light");
  function themeLabel() { const b = $("#themeBtn"); if (b) b.textContent = curTheme() === "dark" ? "☀️ Light mode" : "🌙 Dark mode"; }
  function toggleTheme() {
    const t = curTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t; localStorage.setItem("ae-theme", t); themeLabel();
  }
  sysDark.addEventListener("change", themeLabel);
  const setHeaderH = () => document.documentElement.style.setProperty("--hh", $("header").offsetHeight + "px");
  window.addEventListener("resize", setHeaderH);
  setHeaderH();

  // ---------- events ----------
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open],[data-rate],[data-act],[data-dellog],[data-nb],[data-rtab],[data-area],[data-time]");
    if (!t || t.disabled) return;
    if (t.dataset.open !== undefined) { if (t.tagName === "BUTTON") e.preventDefault(); return openItem(t.dataset.open); }
    if (t.dataset.rate) {
      const [id, i, v] = t.dataset.rate.split("|");
      const a = ratings(id); a[+i] = +v; S.r[id] = a; touch(); save(); return rerender();
    }
    if (t.dataset.dellog !== undefined) { S.log.splice(+t.dataset.dellog, 1); save(); return render(); }
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
      case "quicklog": {
        const h = parseFloat($("#qh").value); if (!(h > 0)) return;
        S.log.push({ d: dayKey(new Date()), h, role: it(openId).role, item: openId, note: "" }); touch(); save();
        render(); $("#qmsg").textContent = `Logged ${h}h ✓`; return;
      }
      // notes
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
      case "data": renderData(); return $("#dataDlg").showModal();
      case "fspick": return guard(Store.pick().then(() => syncFolder("connect")));
      case "fsunlock": return guard(Store.unlock().then(ok => ok && syncFolder("unlock")));
      case "fsreload": return guard(syncFolder("reload"));
      case "fsdisconnect": if (confirm("Stop saving to this folder? Your files stay where they are; the app keeps working from this browser's storage.")) guard(Store.disconnect().then(() => toast("Disconnected — saving in this browser only"))); return;
      case "theme": return toggleTheme();
      case "export": return download();
      case "import": return $("#importFile").click();
      case "sample": if (confirm("Replace your progress with sample data? (Export first if you want to keep it.)" + folderNote())) { S = sample(); noteEdit = null; save(); rerender(); updatePill(); } return;
      case "reset": if (confirm("Clear all progress, ratings, log, notes and library ticks?" + folderNote())) { S = blank(); save(); openId = null; noteEdit = null; rerender(); updatePill(); } return;
    }
  });
  function cancelEdit() {
    if (noteEdit) { delete drafts["e" + noteEdit]; delete drafts["e" + noteEdit + ":t"]; }
    noteEdit = null;
  }
  const inNoteForm = t => !!(t && t.form && t.form.classList.contains("nform"));
  document.addEventListener("change", e => {
    const t = e.target;
    if (inNoteForm(t)) { if (t.name === "track") drafts[t.form.dataset.key + ":t"] = t.value; return; }
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
          S = migrate(s); noteEdit = null; save(); rerender(); toast("Imported ✓");
        } catch { alert("That file doesn't look like a roadmap export."); }
        finally { t.value = ""; }
      });
    }
  });
  document.addEventListener("input", e => {
    const t = e.target;
    if (inNoteForm(t)) { if (t.name === "text") drafts[t.form.dataset.key] = t.value; return; }
    if (t.id === "rsearch") filterResources();
    if (t.id === "nq") { NF.q = t.value; filterNotes(); }
    if (t.id === "lq") { libF.q = t.value; libF.pick = null; updLib(); }
  });
  document.addEventListener("submit", e => {
    if (e.target.classList.contains("nform")) { e.preventDefault(); return saveNote(e.target); }
    if (e.target.id !== "logform") return;
    e.preventDefault();
    const f = new FormData(e.target);
    S.log.push({ d: f.get("d"), h: parseFloat(f.get("h")), role: f.get("role"), item: f.get("item"), note: f.get("note") });
    touch(); save(); render();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && inNoteForm(e.target)) { e.preventDefault(); return e.target.form.requestSubmit(); }
    if ($("#dataDlg").open) return;
    if (e.key === "Escape") {
      if (noteEdit) { cancelEdit(); return rerender(); }
      if (openId) { openId = null; return renderDrawer(); }
    }
  });
  // default the log "type" to the selected topic's role
  document.addEventListener("change", e => {
    if (e.target.name === "item" && e.target.form?.id === "logform" && e.target.value) e.target.form.role.value = it(e.target.value).role;
  });
  window.addEventListener("hashchange", render);
  $("#dataDlg").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  // folder storage: reconnect on load, pick up edits made outside the app, flush before leaving
  Store.on(updatePill);
  window.addEventListener("focus", () => guard(Store.changedOnDisk().then(ch => ch && syncFolder("external"))));
  document.addEventListener("visibilitychange", () => { if (document.hidden) Store.flush(); });

  window.AE = { state: () => S, openItem, order, isDone, score, currentStep, syncFolder, Store, LIB };
  themeLabel();
  render();
  updatePill();
  guard(Store.init().then(i => i.state === "connected" && syncFolder("startup")));
})();