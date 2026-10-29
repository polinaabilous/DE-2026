// Shared practice tracker: three progress statuses, compact topic filters and problem notes.
globalThis.AEPractice = (() => {
  const STATUS = Object.freeze({ "not-started": "Not Started", completed: "Completed", "needs-review": "Needs Review" });
  const validStatus = value => Object.hasOwn(STATUS, value);
  const key = (tool, slug) => `${tool}:${slug}`;
  function createModel(catalog, getState) {
    const tools = catalog.tools;
    const tool = id => tools.find(t => t.id === id);
    const problem = (id, slug) => tool(id)?.problems.find(p => p.slug === slug);
    const entry = (id, slug) => {
      const saved = getState().practice[key(id, slug)] || {};
      // Prefer the current status; map legacy confidence without rewriting saved data.
      const hasRating = Number.isInteger(saved.rating) && saved.rating >= 0 && saved.rating <= 3;
      const status = validStatus(saved.status) ? saved.status : hasRating ? saved.rating >= 2 ? "completed" : saved.rating === 1 ? "needs-review" : "not-started"
        : saved.review === true || saved.status === "attempted" ? "needs-review" : saved.status === "solved" ? "completed" : "not-started";
      return { ...saved, status, notes: typeof saved.notes === "string" ? saved.notes : "" };
    };
    const tags = p => p.topics;
    function matches(id, p, f) {
      const e = entry(id, p.slug), q = f.q.trim().toLowerCase();
      return (!f.category || p.category === f.category) && (!f.difficulty || p.difficulty === f.difficulty)
        && (!f.status || e.status === f.status) && (!f.tag || tags(p).includes(f.tag))
        && (!q || [p.title, p.id, p.company, p.section, p.category, ...tags(p)].join(" ").toLowerCase().includes(q));
    }
    function update(id, slug, changes) {
      if (!problem(id, slug)) throw Error("Unknown practice problem.");
      if (Object.hasOwn(changes, "status") && !validStatus(changes.status)) throw Error("Unknown progress status.");
      const safe = Object.fromEntries(Object.entries(changes).filter(([field]) => ["status", "notes"].includes(field)));
      getState().practice[key(id, slug)] = { ...getState().practice[key(id, slug)], ...safe };
    }
    function stats(id, problems = tool(id).problems) {
      return { total: problems.length, completed: problems.filter(p => entry(id, p.slug).status === "completed").length,
        review: problems.filter(p => entry(id, p.slug).status === "needs-review").length, todo: problems.filter(p => entry(id, p.slug).status === "not-started").length };
    }
    return { tools, tool, problem, entry, tags, matches, update, stats };
  }
  function create({ catalog, getState, save, touch, toast }) {
    const { $, esc, dl, today } = globalThis.AEUtils;
    const { mdBlock, formatToolbar } = globalThis.AEEditor;
    const model = createModel(catalog, getState), filters = {}, drafts = new Map();
    let opened = null;
    const dialog = () => $("#practiceDlg");
    const filter = id => filters[id] ||= { q: "", category: model.tool(id).defaultCategory || "", difficulty: "", tag: "", status: "" };
    const statusButtons = (id, p) => {
      const current = model.entry(id, p.slug).status;
      return `<div class="seg practice-progress" role="group" aria-label="Status for ${esc(p.title)}">${Object.entries(STATUS).map(([value, label]) => `<button type="button" class="${current === value ? "on status-" + value : ""}" data-practice-status="${esc(p.slug)}" data-status="${value}" aria-pressed="${current === value}">${label}</button>`).join("")}</div>`;
    };
    const filterOptions = (name, values, selected) => `<div class="practice-filter-options">${values.map(([value, label]) => `<label><input type="radio" name="${name}" value="${esc(value)}" ${selected === value ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div>`;
    function hub() {
      return `<div class="page-head"><div><div class="eyebrow">Practice workspace</div><h2>Trackers</h2><p class="muted">Choose a tool and track your practice.</p></div></div><div class="practice-tools">${model.tools.map(t => {
        const s = model.stats(t.id);
        return `<a class="panel practice-tool-card" href="#trackers/${esc(t.id)}"><div class="practice-tool-mark">${esc(t.shortName)}</div><div><h3>${esc(t.name)}</h3><p class="muted">${esc(t.description)}</p><p class="practice-tool-progress"><strong>${s.completed}</strong> / ${s.total} completed${s.review ? ` · ${s.review} to review` : ""}</p><div class="bar thick"><i style="width:${s.total ? s.completed / s.total * 100 : 0}%"></i></div><span class="practice-tool-open">Open tracker →</span></div></a>`;
      }).join("")}</div>`;
    }
    function row(id, p) {
      const e = model.entry(id, p.slug);
      return `<tr data-practice-problem="${esc(p.slug)}"><td><a class="practice-problem-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.title)} ↗</a><div class="practice-meta muted"><span>${esc(p.company || (p.id != null ? "#" + p.id : ""))}</span><span class="practice-level ${p.difficulty.toLowerCase()}">${esc(p.difficulty)}</span></div></td><td><div class="practice-tags">${model.tags(p).map(t => `<button type="button" class="practice-tag" data-practice-tag="${esc(t)}" title="Filter by ${esc(t)}">${esc(t)}</button>`).join("")}</div></td><td>${statusButtons(id, p)}</td><td class="practice-notes-cell"><button class="btn" type="button" data-practice-open="${esc(p.slug)}" aria-label="${e.notes ? "Edit" : "Add"} notes for ${esc(p.title)}">${e.notes ? "Edit notes" : "Notes"}</button>${e.notes ? '<span class="practice-meta muted">Saved notes</span>' : ""}</td></tr>`;
    }
    function counters(id) {
      const s = model.stats(id);
      return `<div><b>${s.completed}/${s.total}</b><span>Completed</span></div><div><b>${s.review}</b><span>Needs Review</span></div><div><b>${s.todo}</b><span>Not Started</span></div>`;
    }
    function toolView(id) {
      const t = model.tool(id), f = filter(id), tags = [...new Set(t.problems.flatMap(model.tags))].sort(), categories = [...new Set(t.problems.map(p => p.category))].sort();
      return `<div class="page-head"><div><div class="eyebrow"><a href="#trackers">Trackers</a> / ${esc(t.name)}</div><h2>${esc(t.name)} practice</h2><p class="muted">Find a problem, update its status, and keep useful notes.</p></div><button type="button" class="btn primary" data-practice-action="pick">Pick a problem</button></div>
      <div class="kpis practice-kpis" id="practiceKpis">${counters(id)}</div>
      <section class="panel practice-catalog" data-practice-tool="${esc(id)}"><form class="practice-filters" aria-label="Problem filters">
        <label class="practice-search"><span class="sr-only">Search problems</span><input type="search" name="q" value="${esc(f.q)}" placeholder="${esc(t.searchPlaceholder || "Search problems or companies…")}" autocomplete="off"></label>
        ${categories.length > 1 ? `<fieldset><legend>Category</legend>${filterOptions("category", [["", "All"], ...categories.map(c => [c, c])], f.category)}</fieldset>` : ""}
        <fieldset><legend>Difficulty</legend>${filterOptions("difficulty", [["", "All"], ...["Easy", "Medium", "Hard"].map(c => [c, c])], f.difficulty)}</fieldset>
        <fieldset><legend>Status</legend>${filterOptions("status", [["", "All"], ...Object.entries(STATUS)], f.status)}</fieldset>
        <details class="practice-topic-picker"><summary>Topics <span id="practiceTopicSummary">${esc(f.tag || "All")}</span></summary><div class="practice-topic-options" role="group" aria-label="Topic filter"><button type="button" class="practice-tag" data-practice-tag="" aria-pressed="${!f.tag}">All topics</button>${tags.map(tag => `<button type="button" class="practice-tag" data-practice-tag="${esc(tag)}" aria-pressed="${tag === f.tag}">${esc(tag)}</button>`).join("")}</div></details>
      </form><div class="practice-list-head"><div class="practice-results"><span id="practiceCount" role="status" aria-live="polite"></span><button class="practice-active-topic" type="button" data-practice-tag="" id="practiceActiveTopic" hidden></button></div><div><button type="button" class="btn" data-practice-action="clear">Clear filters</button><button type="button" class="btn" data-practice-action="export">Export CSV</button></div></div>
      <div class="practice-table-scroll"><table class="practice-table"><caption class="sr-only">${esc(t.name)} SQL problems, topics and progress status</caption><thead><tr><th scope="col">Problem</th><th scope="col">Topics</th><th scope="col">Status</th><th scope="col">Notes</th></tr></thead><tbody>${t.problems.map(p => row(id, p)).join("")}</tbody></table></div><div class="practice-empty muted" id="practiceEmpty" hidden>No problems match. Try another topic or clear the filters.</div></section>
      <details class="practice-coverage"><summary>About this catalog and its topics</summary><p class="muted">${esc(t.coverage)} Snapshot: ${esc(t.snapshot)}. ${esc(t.suggestedTagMethod)} Each problem has one or two broad topics; alternative approaches may work. Progress is entered manually; opening a problem does not import submissions from ${esc(t.name)}.</p><p><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">Source catalog ↗</a></p></details>`;
    }
    const activeTool = () => $("[data-practice-tool]")?.dataset.practiceTool;
    const visible = id => model.tool(id).problems.filter(p => model.matches(id, p, filter(id)));
    function applyFilters() {
      const id = activeTool(); if (!id) return;
      const found = new Set(visible(id).map(p => p.slug)), f = filter(id);
      document.querySelectorAll("[data-practice-problem]").forEach(r => { r.hidden = !found.has(r.dataset.practiceProblem); });
      $("#practiceCount").textContent = `${found.size} of ${model.tool(id).problems.length} problems`;
      $("#practiceEmpty").hidden = found.size > 0;
      $("#practiceKpis").innerHTML = counters(id);
      $("#practiceTopicSummary").textContent = f.tag || "All";
      const active = $("#practiceActiveTopic"); active.hidden = !f.tag; active.textContent = f.tag ? `${f.tag} ×` : "";
      active.setAttribute("aria-label", `Remove topic filter ${f.tag}`);
      document.querySelectorAll(".practice-topic-options [data-practice-tag]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.practiceTag === f.tag)));
    }
    function refresh() {
      const id = activeTool();
      if (id) { document.querySelector(".practice-table tbody").innerHTML = model.tool(id).problems.map(p => row(id, p)).join(""); applyFilters(); }
      if (opened) renderDialog();
    }
    function renderDialog() {
      if (!opened) return;
      const { tool: id, slug } = opened, p = model.problem(id, slug), e = model.entry(id, slug);
      dialog().innerHTML = `<div class="practice-dialog-head"><div><div class="eyebrow">${esc(p.company || (p.id != null ? "#" + p.id : model.tool(id).name))} · ${esc(p.difficulty)}</div><h2 id="practiceDialogTitle">${esc(p.title)}</h2>${p.section ? `<p class="small muted">${esc(p.section)}</p>` : ""}<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Open problem on ${esc(model.tool(id).name)} ↗</a></div><button type="button" class="icon" data-practice-action="close" aria-label="Close problem notes">✕</button></div>
        <form class="practice-notes-form" data-key="${esc('practice-notes:' + key(id, slug))}"><h3>Problem notes</h3><div class="editor-shell">${formatToolbar()}<textarea name="text" aria-label="Problem notes" placeholder="Approach, useful snippets, or what to revisit…">${esc(drafts.get(key(id, slug)) ?? e.notes)}</textarea></div><button class="btn primary" type="submit">Save notes</button></form>${e.notes ? `<section class="practice-saved-notes"><h3>Saved notes</h3><div class="nt-body">${mdBlock(e.notes)}</div></section>` : ""}`;
    }
    function open(id, slug) { if (!model.problem(id, slug)) return; opened = { tool: id, slug }; renderDialog(); dialog().showModal(); }
    function reset() { drafts.clear(); opened = null; if (dialog()?.open) dialog().close(); }
    function csv(id) {
      const cell = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
      return '\ufeff' + ["tool,title,company,category,difficulty,topics,status,notes,url,id,section", ...visible(id).map(p => {
        const e = model.entry(id, p.slug);
        return [model.tool(id).name, p.title, p.company, p.category, p.difficulty, model.tags(p).join(" | "), STATUS[e.status], e.notes, p.url, p.id, p.section].map(cell).join(",");
      })].join("\r\n") + "\r\n";
    }
    function capture(t) {
      if (!opened || !t.form?.classList.contains("practice-notes-form")) return false;
      drafts.set(key(opened.tool, opened.slug), t.value); return true;
    }
    function bind() {
      document.addEventListener("click", e => {
        const t = e.target.closest("[data-practice-action],[data-practice-open],[data-practice-tag],[data-practice-status]");
        if (!t) return;
        const id = activeTool();
        if (t.dataset.practiceOpen) return open(id, t.dataset.practiceOpen);
        if (t.dataset.practiceStatus && id) {
          model.update(id, t.dataset.practiceStatus, { status: t.dataset.status }); touch(); save();
          // Keep the focused button in place for keyboard users.
          t.parentElement.querySelectorAll("button").forEach(b => { const on = b === t; b.className = on ? "on status-" + b.dataset.status : ""; b.setAttribute("aria-pressed", String(on)); });
          applyFilters(); return;
        }
        if (t.dataset.practiceTag !== undefined && id) { filter(id).tag = t.dataset.practiceTag; applyFilters(); return; }
        if (t.dataset.practiceAction === "close") { dialog().close(); return; }
        if (!id) return;
        switch (t.dataset.practiceAction) {
          case "clear": Object.assign(filter(id), { q: "", category: model.tool(id).defaultCategory || "", difficulty: "", tag: "", status: "" }); $(".practice-filters").reset(); $(".practice-search input").value = ""; document.querySelectorAll('.practice-filters input[type="radio"]').forEach(el => { el.checked = el.value === filter(id)[el.name]; }); return applyFilters();
          case "pick": { const pool = visible(id).filter(p => model.entry(id, p.slug).status !== "completed"); if (!pool.length) return toast("Everything matching these filters is completed. Try another filter."); return open(id, pool[Math.floor(Math.random() * pool.length)].slug); }
          case "export": return dl(csv(id), `${id}-progress-${today()}.csv`, "text/csv;charset=utf-8");
        }
      });
      document.addEventListener("change", e => { const t = e.target; if (capture(t)) return; if (t.closest(".practice-filters") && activeTool()) { filter(activeTool())[t.name] = t.value; applyFilters(); } });
      document.addEventListener("input", e => { if (capture(e.target)) return; if (e.target.matches('.practice-search input') && activeTool()) { filter(activeTool()).q = e.target.value; applyFilters(); } });
      document.addEventListener("submit", e => {
        const f = e.target;
        if (f.matches(".practice-filters")) { e.preventDefault(); return; }
        if (!f.matches(".practice-notes-form") || !opened) return;
        e.preventDefault();
        const { tool: id, slug } = opened;
        model.update(id, slug, { notes: f.elements.text.value.trimEnd() }); drafts.delete(key(id, slug)); touch(); save(); refresh(); toast("Notes saved");
      });
      dialog().addEventListener("close", () => { opened = null; });
      window.addEventListener("hashchange", () => { if (dialog().open) dialog().close(); });
    }
    bind();
    return { model, hub, toolView, afterRender() { applyFilters(); if (opened) renderDialog(); }, reset, open, filters, csv };
  }
  return Object.freeze({ createModel, create, key, STATUS });
})();
