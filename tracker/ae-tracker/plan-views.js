// Topics, roadmap and the lesson / stage side panels. Rendering reads state and never writes it.
globalThis.AEPlanViews = Object.freeze({
  create({ plan: P, roadmap: R, resources: RES, getState }) {
    const { esc, icon } = globalThis.AEUtils;
    const md = t => globalThis.AEEditor.inl(t, false);
    const S = () => getState();
    const { it, isDone, status, statusLabel, stage, isStage, title } = R;
    const pad2 = n => String(n).padStart(2, "0");
    const stageNo = id => P.stages.findIndex(s => s.id === id) + 1;
    const sectionName = id => (P.road.find(s => s.id === id) || {}).name || "";
    const opt = id => it(id)?.opt ? `<span class="badge neutral">Optional</span>` : "";
    const firstSentence = (t, n = 110) => { const s = String(t).split(/(?<=\.)\s/)[0].replace(/\*\*/g, ""); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

    // "a, b (c, d); e" → ["a", "b (c, d)", "e"] for single-sentence lists; otherwise a paragraph.
    function learnPoints(c) {
      const text = String(c).trim().replace(/\.$/, "");
      if (/[.:]\s/.test(text)) return null;
      const parts = []; let depth = 0, cur = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "(") depth++;
        if (ch === ")") depth = Math.max(0, depth - 1);
        if (!depth && (ch === "," || ch === ";") && text[i + 1] === " ") { parts.push(cur.trim()); cur = ""; i++; continue; }
        cur += ch;
      }
      parts.push(cur.trim());
      return parts.length >= 3 && parts.every(p => p && p.length <= 90) ? parts : null;
    }

    // ---------- shared small components ----------
    function lessonButton(id, extra = "") {
      const done = isDone(id);
      return `<button class="road-lesson ${done ? "done" : ""}" data-open="${esc(id)}"><span class="dot ${done ? "done" : status(id) === "doing" ? "doing" : ""}" aria-hidden="true">${done ? "✓" : ""}</span><span class="grow">${esc(title(id))}${isStage(id) ? ' <span class="small muted">· portfolio stage</span>' : ""}</span>${it(id)?.opt ? '<span class="badge neutral">Optional</span>' : ""}${extra}${icon("arrow")}<span class="sr-only">${done ? "Complete" : isStage(id) ? R.stageLabel[R.stageStatus(stage(id))] : statusLabel[status(id)]}</span></button>`;
    }
    const sectionTitle = (n, t) => `<h3 class="section-title"><span class="section-number">${n}</span>${t}</h3>`;
    const linkRes = (r, attrs = "") => r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener" ${attrs}>${esc(r.title)}</a>` : `<span ${attrs}>${esc(r.title)}</span>`;
    function resRow(owner, r, label) {
      const ck = (S().rc[owner] || {})[r.key] || S().lib[r.key] === "done";
      return `<label class="res-row"><input type="checkbox" data-rc="${esc(owner)}|${esc(r.key)}" ${ck ? "checked" : ""} aria-label="Mark ${esc(r.title)} done"><span class="grow">${label ? `<span class="res-tier">${label}</span>` : ""}${linkRes(r)}${r.note ? ` <span class="muted small">— ${esc(r.note)}</span>` : ""}<span class="kind k-${esc(r.kind)}">${esc(r.kind)}</span></span></label>`;
    }
    const siteLink = r => `<a class="resource" href="${esc(r.url || "#")}" target="_blank" rel="noopener">${icon("flag")}<span class="grow"><strong>${esc(r.title)}</strong><small>Choose problems on this lesson's topics; track them separately.</small></span>${icon("arrow")}</a>`;

    // ---------- Topics (learning areas) ----------
    const expanded = new Set();
    let curLesson = null;
    function areaLesson(id, n) {
      const st = status(id), cur = curLesson === id;
      return `<button class="area-lesson ${cur ? "current" : ""}" data-open="${esc(id)}"><span class="lesson-order ${st === "done" ? "done" : ""}" aria-hidden="true">${st === "done" ? "✓" : pad2(n)}</span><span class="grow"><span class="lesson-title">${esc(it(id).name)}</span><span class="lesson-summary">${esc(firstSentence(it(id).c))}</span></span>${opt(id)}<span class="row-status">${st === "todo" ? "" : statusLabel[st]}</span>${icon("arrow")}</button>`;
    }
    function areaCard(a, i) {
      const ids = R.areaLessons(a), complete = ids.filter(isDone).length;
      let shown = 0, n = 0;
      const blocks = a.chapters.map((c, ci) => {
        const html = `<div class="chapter-block"><div class="chapter-head"><span class="chapter-index">${ci + 1}</span><span class="grow"><strong>${esc(c[0])}</strong><small>${esc(c[1])}</small></span><span class="chapter-progress">${c[2].filter(isDone).length} / ${c[2].length}</span></div>${c[2].map(id => areaLesson(id, ++n)).join("")}</div>`;
        return { html, size: c[2].length };
      });
      const visible = [], hidden = [];
      blocks.forEach((b, bi) => { if (bi === 0 || shown + b.size <= 4) { visible.push(b.html); shown += b.size; } else hidden.push(b); });
      const more = hidden.reduce((x, b) => x + b.size, 0);
      const reading = RES.areaReading(a);
      const firstRow = ids.map(id => R.rowOf[id]).filter(Boolean)[0];
      return `<section class="area-card" id="area-${a.id}"><div class="area-head"><div class="row spread"><span class="eyebrow">Area ${pad2(i + 1)}</span><span class="small muted">${complete} / ${ids.length} complete</span></div>
        <h3>${esc(a.name)}${a.star ? " ⭐" : ""}</h3><p>${esc(a.desc)}</p></div>
        <div class="area-lessons">${visible.join("")}${hidden.length ? `<details class="area-more" data-area="${a.id}" ${expanded.has(a.id) ? "open" : ""}><summary><span class="show-more">Show ${more} more ${more === 1 ? "lesson" : "lessons"}</span><span class="show-less">Show fewer lessons</span></summary>${hidden.map(b => b.html).join("")}</details>` : ""}</div>
        <footer class="area-foot">${reading.length ? `<details class="reading-list" data-reading="${a.id}" ${expanded.has("r:" + a.id) ? "open" : ""}><summary>${icon("book")} Area reading list <span class="muted">(${reading.length})</span></summary>${readingList(reading)}</details>` : "<span></span>"}
        ${firstRow ? `<button class="text-btn" data-road="${firstRow.key}">See on roadmap ${icon("arrow")}</button>` : ""}</footer></section>`;
    }
    function readingList(list) {
      return `<p class="small muted">Books and courses that span several lessons. Dip in when a lesson points here.</p><div class="reading-items">${list.map(r => {
        const d = S().lib[r.key] === "done" || Object.values(S().rc).some(m => m && m[r.key]);
        return `<label class="res-row"><input type="checkbox" data-lib="${esc(r.key)}" ${d ? "checked" : ""} aria-label="Mark ${esc(r.title)} done"><span class="grow">${linkRes(r)}<span class="kind k-${esc(r.kind)}">${esc(r.kind)}</span>${r.lessons.length ? `<small class="muted reading-for">${r.lessons.map(l => esc(it(l).name)).join(" · ")}</small>` : ""}</span></label>`;
      }).join("")}</div>`;
    }
    function vTopics() {
      curLesson = R.lessons.find(id => !isDone(id) && !it(id).opt) || null;
      const done = R.required.filter(isDone).length;
      return `<div class="page-head"><div><div class="eyebrow">Learning areas</div><h2>Topics</h2><p class="muted">Choose an area, then open a lesson. What to learn, how to practise and how it connects to your portfolio stay together in its side panel.</p></div>
        <div class="kpis small-kpis"><div><b>${done}/${R.required.length}</b><span>lessons complete</span></div><div><b>${P.areas.length}</b><span>areas</span></div></div></div>
        <div class="area-grid">${P.areas.map(areaCard).join("")}</div>`;
    }

    // ---------- Roadmap (learning & portfolio) ----------
    function learnCard(row, n) {
      const ids = row.learn || [];
      const st = row.stage && stage(row.stage);
      const req = st ? st.req : row.milestone ? R.prereqs(row.milestone) : ids;
      const earlier = st ? st.req.filter(id => !ids.includes(id)) : [];
      const counted = st ? st.req.filter(id => R.isLesson(id)) : ids.filter(id => !it(id).opt);
      const learned = counted.filter(isDone).length;
      const lessons = ids.length ? ids.map(id => lessonButton(id, st && !st.req.includes(id) ? '<span class="badge neutral" title="Not required for this stage">Standalone</span>' : "")).join("")
        : `<p class="small muted">No new lessons — builds on:</p>${req.map(id => lessonButton(id)).join("")}`;
      return `<article class="learn-card"><div class="row spread"><span class="eyebrow">${pad2(n)}</span><span class="small muted">${counted.length ? `${learned} / ${counted.length} learned` : ""}</span></div>
        <h4>${esc(row.title)}</h4><div class="road-lessons">${lessons}</div>
        ${earlier.length ? `<p class="extra">Also needs ${earlier.length} earlier ${earlier.length === 1 ? "lesson" : "lessons"}: ${earlier.map(id => `<button class="link-btn" data-open="${esc(id)}">${esc(title(id))}</button>`).join(", ")}</p>` : ""}</article>`;
    }
    function buildCard(row) {
      if (row.stage) {
        const s = stage(row.stage), st = R.stageStatus(s);
        return `<article class="project-card ${st}"><div class="row spread"><span class="eyebrow">Stage ${stageNo(s.id)} · ${esc(sectionName(s.release).split(" · ").pop())}</span><span class="badge ${st === "locked" ? "neutral" : ""}">${st === "built" ? icon("check") : st === "locked" ? icon("lock") : ""}${R.stageLabel[st]}</span></div>
          <h4>${esc(s.name)}</h4><p>${esc(firstSentence(R.stageDesc(s), 170))}</p>
          <button class="btn ${st === "ready" ? "primary" : ""}" data-open="${s.id}">Open stage ${icon("arrow")}</button></article>`;
      }
      if (row.milestone) {
        const id = row.milestone, st = status(id);
        return `<article class="project-card milestone ${st === "done" ? "built" : ""}"><div class="row spread"><span class="eyebrow">${icon("flag")} Career milestone</span><span class="badge ${st === "done" ? "" : "neutral"}">${it(id).opt ? "Optional · " : ""}${statusLabel[st]}</span></div>
          <h4>${esc(it(id).name)}</h4><p>${esc(firstSentence(it(id).c, 170))}</p>
          <button class="btn" data-open="${id}">Open lesson ${icon("arrow")}</button></article>`;
      }
      const p = row.practice, sites = (p.sites || []).map(k => RES.resolve(k));
      return `<article class="project-card practice"><div class="row spread"><span class="eyebrow">Standalone</span><span class="badge neutral">No project stage</span></div>
        <h4>${esc(p.title)}</h4><p>${esc(p.text)}</p>
        ${sites.length ? `<div class="site-links">${sites.map(r => `<a href="${esc(r.url || "#")}" target="_blank" rel="noopener">${esc(r.title)} ${icon("arrow")}</a>`).join("")}</div>` : ""}</article>`;
    }
    function checkpointCard(key) {
      const g = P.checkpoints[key], n = g.items.length, c = g.items.filter((_, i) => S().g[key + "-" + i]).length;
      return `<article class="checkpoint-card ${g.apply ? "apply" : ""} ${c === n ? "passed" : ""}"><div class="row spread"><span class="eyebrow">${g.apply ? icon("flag") + " Milestone" : "Checkpoint"}</span><span class="small muted">${c} / ${n}</span></div>
        <h4>${esc(g.title)}</h4>${g.note ? `<p class="small muted">${esc(g.note)}</p>` : ""}
        <div class="gate-items">${g.items.map((t, i) => `<label><input type="checkbox" data-gate="${key}-${i}" ${S().g[key + "-" + i] ? "checked" : ""}> <span>${esc(t)}</span></label>`).join("")}</div></article>`;
    }
    function vRoadmap(highlight) {
      const cur = R.currentRow();
      const built = P.stages.filter(s => isDone(s.id)).length, done = R.required.filter(isDone).length;
      let n = 0;
      let h = `<div class="page-head"><div><div class="eyebrow">Learning & portfolio</div><h2>Roadmap</h2><p class="muted">Learn on the left, build on the right. Each row lists the lessons that unlock the next project stage, career milestone or checkpoint.</p></div></div>
        <section class="road-intro"><div class="grow"><strong>Portfolio · Fuel Smart</strong><p>${esc(P.portfolio.question)}</p><p class="small muted">${esc(P.portfolio.scope)} <a href="${esc(P.deckBase + P.portfolio.brief)}" target="_blank" rel="noopener">Project brief</a></p></div>
          <div class="kpis small-kpis"><div><b>${done}/${R.required.length}</b><span>lessons complete</span></div><div><b>${built}/${P.stages.length}</b><span>stages built</span></div></div>
          ${cur ? `<button class="btn primary" data-act="jump">${icon("map")} Jump to where you are</button>` : ""}</section>
        <div class="road-headers"><div><h3>${icon("book")} Learning roadmap</h3><p>The lessons each step needs.</p></div><div></div><div><h3>${icon("box")} Portfolio roadmap</h3><p>Project stages, career milestones and checkpoints.</p></div></div>`;
      P.road.forEach((sec, si) => {
        const secStages = P.stages.filter(s => s.release === sec.id);
        h += `<section class="road-section" id="sec-${sec.id}"><div class="road-section-head"><div class="grow"><span class="eyebrow">${sec.kind === "release" ? (si === 0 ? "Release 1" : `Release ${si + 1}`) : "Career"}</span><h3>${esc(sec.name)}</h3><p class="muted small">${esc(sec.desc)}</p></div>${secStages.length ? `<span class="small muted">${secStages.filter(s => isDone(s.id)).length} / ${secStages.length} ${secStages.length === 1 ? "stage" : "stages"} built</span>` : ""}</div>`;
        sec.rows.forEach((row, i) => {
          const key = `${sec.id}-${i}`, rowObj = R.rows.find(r => r.key === key), isCur = cur && cur.key === key;
          const cls = `road-row ${isCur ? "current" : ""} ${R.rowDone(rowObj) ? "done" : ""} ${highlight === key ? "highlight" : ""}`;
          if (row.checkpoint) { h += `<div class="${cls} checkpoint-row" id="row-${key}">${isCur ? '<span class="here">You are here</span>' : ""}${checkpointCard(row.checkpoint)}</div>`; return; }
          h += `<div class="${cls}" id="row-${key}">${isCur ? '<span class="here">You are here</span>' : ""}${learnCard(row, ++n)}<div class="road-connector" aria-hidden="true">${icon("arrow")}</div>${buildCard(row)}</div>`;
        });
        h += `</section>`;
      });
      h += `<aside class="road-footnote"><strong>Standalone lessons still count.</strong><p>Rows marked “Standalone” hold lessons that no project stage needs — interview patterns, statistics and breadth topics. Practise them with the linked problem sites; they stay in their learning area too.</p>
        <h4>Skip for now</h4><div class="chips">${P.skip.map(s => `<span class="chip static">${esc(s)}</span>`).join("")}</div></aside>`;
      return h;
    }

    // ---------- lesson panel ----------
    function deckSlot(id) {
      const d = RES.deckFor(id);
      const decks = d.decks.map(x => `<a class="resource deck" href="${esc(x.url)}" target="_blank" rel="noopener">${icon("slides")}<span class="grow"><strong>${esc(x.title)}${x.slide ? ` · from slide ${x.slide}` : ""}</strong><small>${esc(x.note)}</small></span>${x.partial ? '<span class="badge amber">Partial</span>' : '<span class="badge">Deck</span>'}${icon("arrow")}</a>`).join("");
      const planned = d.planned.length ? `<small>Planned: ${d.planned.map(esc).join(" · ")}</small>` : "";
      if (!d.decks.length) return `<div class="resource inactive deck-missing">${icon("slides")}<span class="grow"><strong>No deck yet</strong>${planned || "<small>Use the resources below for now.</small>"}</span></div>`;
      return decks + (d.planned.length && d.decks.every(x => x.partial) ? `<p class="small muted planned">Fuller deck planned: ${d.planned.map(esc).join(" · ")}</p>` : "");
    }
    function lessonBody(id) {
      const x = it(id), d = RES.deckFor(id), res = RES.lessonRes(id), a = R.areaOf(id);
      const pre = R.prereqs(id), points = learnPoints(x.c), links = R.connections(id), row = R.rowOf[id];
      const done = isDone(id), pcs = S().pc[id] || [], cks = R.lessonChecks(id);
      const reading = RES.areaReading(a);
      const tiers = [res.start && resRow(id, res.start, "Start here"), ...res.deeper.map(r => resRow(id, r, "Go deeper"))].filter(Boolean).join("");
      const sites = res.sites;
      const sitesNames = sites.map(r => r.title.split(/ [–—(]/)[0]).join(", ");
      return `${pre.length ? `<section class="panel-prereq"><p class="eyebrow">Learn first</p><div class="prereq-list">${pre.map(p => lessonButton(p)).join("")}</div></section>` : ""}
        <section class="lesson-section">${sectionTitle(1, "What to learn")}
          ${points ? `<ul class="learn-list">${points.map(t => `<li><span class="bullet">·</span><span>${md(t)}</span></li>`).join("")}</ul>` : `<p class="learn-text">${md(x.c)}</p>`}
          ${x.setup ? `<div class="setup-box"><h4>🔧 Set up first <span class="muted small">only what this lesson needs</span></h4><ul>${x.setup.map(t => `<li>${md(t)}</li>`).join("")}</ul></div>` : ""}
          <h4 class="sub">Deck</h4>${deckSlot(id)}
          <h4 class="sub">Resources <span class="muted small">at most ${RES.MAX}</span></h4>
          ${tiers ? `<div class="res-list">${tiers}</div>` : `<p class="small muted">No single short resource fits this lesson — use the deck or the area reading list.</p>`}
          ${reading.length ? `<details class="reading-list in-panel"><summary>${icon("book")} ${esc(a.name)} reading list <span class="muted">(${reading.length})</span></summary>${readingList(reading)}</details>` : ""}
          ${res.more.length ? `<p class="small muted">${res.more.length} more ${res.more.length === 1 ? "resource is" : "resources are"} tagged with this lesson in the <a href="#resources" data-act="closepanel">Resources page</a>.</p>` : ""}</section>
        <section class="lesson-section">${sectionTitle(2, "How to practise")}
          <article class="practice-card"><div class="row spread"><h4>Lab</h4>${d.labs.length ? '<span class="badge">Existing material</span>' : '<span class="badge neutral">Coming later</span>'}</div>
            ${d.labs.length ? d.labs.map(l => `<a class="resource" href="${esc(l.url)}" target="_blank" rel="noopener">${icon("box")}<span class="grow"><strong>${esc(l.title)}${l.slide ? ` · slide ${l.slide}` : ""}</strong><small>${esc(l.note)}</small></span>${icon("arrow")}</a>`).join("") : `<p class="small muted">Lab will be added with the deck. Until then, use the practice tasks below.</p>`}</article>
          <article class="practice-card"><div class="row spread"><h4>Practice tasks</h4><span class="small muted">${pcs.filter(Boolean).length} / ${x.practice.length}</span></div>
            <div class="checks">${x.practice.map((t, i) => `<label><input type="checkbox" data-pc="${id}|${i}" ${pcs[i] ? "checked" : ""}> <span>${md(t)}</span></label>`).join("")}</div></article>
          ${sites.length ? `<article class="practice-card practice-directory"><h4>Where to find more problems</h4><p class="small muted">Choose your own questions on this lesson's topics.</p>${sites.map(siteLink).join("")}
            ${sites.some(r => r.key === "dataLemur") ? `<p class="small"><a href="#trackers/datalemur" data-act="closepanel">Track DataLemur problems in Trackers →</a> · <a href="${esc(RES.deckUrl("dlCatalog"))}" target="_blank" rel="noopener">Offline DataLemur catalog</a></p>` : ""}</article>` : ""}</section>
        <section class="lesson-section">${sectionTitle(3, "Portfolio connection")}
          ${links.length ? links.map(s => `<article class="project-link"><div class="row spread"><h4>${esc(s.name)}</h4><span class="badge ${R.stageStatus(s) === "locked" ? "neutral" : ""}">${R.stageLabel[R.stageStatus(s)]}</span></div><p>Stage ${stageNo(s.id)} of the portfolio needs this lesson. ${esc(firstSentence(R.stageDesc(s), 150))}</p><button class="text-btn" data-open="${s.id}">Open portfolio stage ${icon("arrow")}</button></article>`).join("")
            : `<div class="no-project">${x.opt ? "Optional. " : ""}Standalone — not required for a portfolio stage. ${sites.length ? `Practise with ${esc(sitesNames)}.` : "Practise with the tasks above and keep notes of what you learn."}</div>`}
          ${row ? `<p class="small muted road-pos">On the roadmap: <button class="link-btn" data-road="${row.key}">${esc(row.title || P.checkpoints[row.checkpoint]?.title || "")} ${icon("arrow")}</button>${row.milestone === id ? " · career milestone" : ""}</p>` : ""}</section>
        <section class="lesson-section">${sectionTitle(4, "Check your understanding")}
          <div class="checks boxed">${x.dod.map((t, i) => `<label><input type="checkbox" data-ck="${id}|${i}" ${cks[i] ? "checked" : ""} ${done ? "disabled" : ""}><span>${md(t)}</span></label>`).join("")}</div></section>`;
    }
    function lessonFoot(id) {
      const x = it(id), n = R.lessonChecks(id).filter(Boolean).length, miss = R.missingPrereqs(id);
      if (isDone(id)) return `<p>Lesson complete${S().done[id] === "migrated" ? " (carried over from your ratings)" : ""}.<br>Reopen it to change the checks.</p><div class="row"><button class="btn" data-act="reopen" data-id="${id}">Reopen</button><button class="btn primary" disabled>${icon("check")} Lesson complete</button></div>`;
      const why = miss.length ? `Finish first: ${miss.map(p => esc(title(p))).join(", ")}.` : n < x.dod.length ? "Tick every check to complete the lesson." : "Ready to complete.";
      return `<p>${n} / ${x.dod.length} checks ticked<br>${why}</p><button class="btn primary" data-act="complete" data-id="${id}" ${R.canComplete(id) ? "" : "disabled"}>${miss.length ? icon("lock") : icon("check")} Complete lesson</button>`;
    }

    // ---------- stage panel ----------
    function stageBody(s) {
      const learned = s.req.filter(isDone).length, tasks = R.stageTasks(s), checks = R.stageChecks(s), st = R.stageStatus(s);
      const refs = [...new Map(s.from.flatMap(id => it(id).learn.map(e => [id, RES.resolve(e)])).map(([o, r]) => [r.key, [o, r]])).values()];
      const setup = s.setup && it(s.setup).setup;
      return `<section class="lesson-section">${sectionTitle(1, "Knowledge needed")}<p class="practice-intro">${learned} of ${s.req.length} required lessons complete. Open one to review or practise it.</p>
          <div class="prereq-list">${s.req.map(id => lessonButton(id)).join("")}</div>
          ${s.after.length ? `<p class="eyebrow sub">Earlier portfolio work</p><div class="prereq-list">${s.after.map(id => lessonButton(id)).join("")}</div>` : ""}</section>
        <section class="lesson-section">${sectionTitle(2, "What this stage covers")}<ul class="scope-list">${s.scope.map(t => `<li>${md(t)}</li>`).join("")}</ul><p class="scope-note">${md(s.boundary)}</p>
          ${setup ? `<div class="setup-box"><h4>🔧 Set up first</h4><ul>${setup.map(t => `<li>${md(t)}</li>`).join("")}</ul></div>` : ""}
          ${refs.length ? `<h4 class="sub">References</h4><div class="res-list">${refs.map(([o, r]) => resRow(o, r)).join("")}</div>` : ""}</section>
        <section class="lesson-section">${sectionTitle(3, "What to do")}<ol class="task-list">${tasks.map(t => `<li><label><input type="checkbox" data-pc="${t.owner}|${t.idx}" ${t.on ? "checked" : ""} aria-label="Mark “${esc(t.title)}” done"><span><strong>${esc(t.title)}</strong><p>${md(t.text)}</p></span></label></li>`).join("")}</ol></section>
        <section class="lesson-section">${sectionTitle(4, "Deliverable & completion")}<div class="deliverable-box"><strong>${md(s.output)}</strong><p>Suggested files: ${md(s.files)}</p></div>
          <div class="checks boxed">${checks.map(c => `<label><input type="checkbox" data-ck="${c.owner}|${c.idx}" ${c.on ? "checked" : ""} ${isDone(s.id) ? "disabled" : ""}><span>${md(c.text)}</span></label>`).join("")}</div>
          ${st === "locked" ? `<p class="small muted">You can review the stage now. Finish its knowledge and earlier stages before marking it built.</p>` : ""}</section>`;
    }
    function stageFoot(s) {
      const st = R.stageStatus(s), checks = R.stageChecks(s), n = checks.filter(c => c.on).length;
      if (st === "built") return `<p>Stage built${S().built[s.id] === "migrated" ? " (carried over from your ratings)" : ""}.<br>Reopen it to change the checks.</p><div class="row"><button class="btn" data-act="unbuild" data-id="${s.id}">Reopen</button><button class="btn primary" disabled>${icon("check")} Stage built</button></div>`;
      const miss = [...s.req, ...s.after].filter(id => !isDone(id));
      const why = miss.length ? `Prerequisites needed: ${miss.length} left.` : n < checks.length ? "Tick every completion check after building the deliverable." : "Ready to mark built.";
      return `<p>${n} / ${checks.length} completion checks<br>${why}</p><button class="btn primary" data-act="build" data-id="${s.id}" ${R.canBuild(s) ? "" : "disabled"}>${miss.length ? icon("lock") : icon("check")} Mark stage built</button>`;
    }

    function panelHead(id, back) {
      const lesson = !isStage(id);
      const list = lesson ? R.areaLessons(R.areaOf(id)) : P.stages.map(s => s.id), i = list.indexOf(id);
      const prev = list[i - 1], next = list[i + 1], kind = lesson ? "lesson" : "stage";
      const eyebrow = lesson ? `${esc(R.areaOf(id).name)} · ${esc(R.areaOf(id).chapters.find(c => c[2].includes(id))[0])}` : `Portfolio · Stage ${stageNo(id)} · ${esc(sectionName(stage(id).release))}`;
      const st = lesson ? statusLabel[status(id)] : R.stageLabel[R.stageStatus(stage(id))];
      const neutral = lesson ? status(id) !== "done" : R.stageStatus(stage(id)) === "locked";
      return `<div class="panel-head"><div class="row spread"><p class="eyebrow">${eyebrow}</p><div class="panel-controls">
          <button class="panel-icon" data-open="${prev || ""}" data-adjacent="1" ${prev ? "" : "disabled"} aria-label="Previous ${kind}" title="Previous ${kind}"><span class="flip">${icon("arrow")}</span></button>
          <button class="panel-icon" data-open="${next || ""}" data-adjacent="1" ${next ? "" : "disabled"} aria-label="Next ${kind}" title="Next ${kind}">${icon("arrow")}</button>
          <button class="panel-icon close" data-act="close" aria-label="Close side panel" title="Close (Esc)">${icon("close")}</button></div></div>
        ${back ? `<button class="panel-context" data-act="back">← Related ${isStage(back) ? "stage" : "lesson"}: ${esc(title(back))}</button>` : ""}
        <h2 id="panelTitle" tabindex="-1">${esc(title(id))}</h2>
        <p class="panel-description">${lesson ? "Learn it, practise it, then tick the checks to complete the lesson." : esc(R.stageDesc(stage(id)))}</p>
        <div class="row badges"><span class="badge ${neutral ? "neutral" : ""}">${st}</span>${lesson && it(id).opt ? '<span class="badge neutral">Optional</span>' : ""}${lesson && it(id).setup ? '<span class="badge amber">🔧 Setup</span>' : ""}</div></div>`;
    }
    const panelBody = id => isStage(id) ? stageBody(stage(id)) : lessonBody(id);
    const panelFoot = id => isStage(id) ? stageFoot(stage(id)) : lessonFoot(id);

    return { topics: vTopics, roadmap: vRoadmap, panelHead, panelBody, panelFoot, lessonButton, learnPoints, expanded };
  }
});
