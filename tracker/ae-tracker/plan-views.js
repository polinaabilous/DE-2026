// Roadmap and skills presentation. Rendering reads state and never writes it.
globalThis.AEPlanViews = Object.freeze({
  create({ plan: P, roadmap, getState }) {
    const { esc, pct } = globalThis.AEUtils;
    const { order, where, it, role, score, isDone, status, statusLabel, required, progress, stepOptional, stepDone, currentStep, visible } = roadmap;
    // ---------- small components ----------
    const tag = id => `<span class="tag" style="--rc:${role(id).color}">${role(id).name}</span>`;
    const bar = (v, cls = "") => `<div class="bar ${cls}"><i style="width:${pct(v)}"></i></div>`;
    const nCount = id => getState().notes.filter(n => n.topic === id).length;
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
      const n = g.items.length, c = g.items.filter((_, i) => getState().g[key + "-" + i]).length;
      return `<div class="gate ${apply ? "apply" : ""} ${c === n ? "passed" : ""}">
        <div class="dot">${apply ? "🚪" : c === n ? "✓" : "⛳"}</div>
        <div class="gate-body"><h4>${esc(g.title)} <span class="muted small">${c}/${n}</span></h4>
        ${g.note ? `<p class="small">${esc(g.note)}</p>` : ""}
        <div class="gate-items">${g.items.map((t, i) => `<label><input type="checkbox" data-gate="${key}-${i}" ${getState().g[key + "-" + i] ? "checked" : ""}> ${esc(t)}</label>`).join("")}</div></div></div>`;
    }

    // ---------- views ----------
    function vRoadmap() {
      const cur = currentStep(), all = progress(required);
      const doneCount = required.filter(isDone).length;
      let h = `<div class="page-head"><div><div class="eyebrow">Your learning plan</div><h2>Your roadmap</h2><p class="muted">Build practical skills, one step at a time.</p></div></div><div class="panel rm-head">
        <div class="grow"><details class="roadmap-help"><summary>Plan scope & how to use this roadmap</summary>
        <p class="small"><b>Portfolio v1:</b> ${esc(P.portfolio.question)} ${esc(P.portfolio.scope)} <b>Later releases:</b> lakehouse, orchestration, semantic layer, AI and portability.</p>
        <p class="muted">Work top to bottom. Each step groups complementary topics — practice, theory and a build piece. Work in topic order within a step and finish a topic’s <b>prerequisites</b> before its deliverable. Click a topic to see what to learn, how to practice and its <b>definition of done</b>. A topic is <b>Done</b> when every check is rated <b>Solid</b> or better.</p>
        <div class="legend">${Object.values(P.roles).map(r => `<span><i style="background:${r.color}"></i>${r.name}</span>`).join("")}</div></details></div>
        <div class="kpis small-kpis">
          <div><b>${pct(all.pct)}</b><span>overall</span></div>
          <div><b>${doneCount}/${required.length}</b><span>topics done</span></div>
          <div><b>~${Math.round(all.left)}h</b><span>left (est.)</span></div>
          <div><b>${cur ? cur.id : "🎉"}</b><span>current step</span></div>
        </div>
        <div class="rm-tools"><button class="btn primary" data-act="jump">📍 Jump to current step</button>
          <label><input type="checkbox" data-act="hideDone" ${getState().ui.hideDone ? "checked" : ""}> Hide finished steps</label>
          <label><input type="checkbox" data-act="showOpt" ${getState().ui.showOpt ? "checked" : ""}> Show optional topics</label></div>
      </div><div class="timeline">`;
      P.stages.forEach(st => {
        const p = progress(st.steps.flatMap(s => s.items).filter(id => !it(id).opt));
        h += `<section class="stage"><div class="stage-head"><div class="stage-num">${st.n}</div>
          <div class="grow"><h3>Stage ${st.n} · ${esc(st.name)}</h3><p class="muted">${esc(st.goal)}</p>${bar(p.pct, "thick")}</div>
          <div class="stage-p"><b>${pct(p.pct)}</b><span>~${p.h}h</span></div></div>`;
        st.steps.forEach(sp => {
          const opt = stepOptional(sp);
          if (opt && !getState().ui.showOpt) return;
          const done = stepDone(sp);
          if (done && getState().ui.hideDone) return;
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

    return { tag, bar, card, chip, roadmap: vRoadmap, skills: vSkills };
  }
});
