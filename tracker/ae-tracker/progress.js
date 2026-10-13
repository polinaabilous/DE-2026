// Roadmap index and scoring. getState keeps calculations current after imports and account changes.
globalThis.AEProgress = Object.freeze({
  create(plan, getState) {
    const P = plan;
    // ---------- index ----------
    const order = [], where = {};
    P.stages.forEach(st => st.steps.forEach(sp => sp.items.forEach(id => { order.push(id); where[id] = { stage: st.n, step: sp.id }; })));
    order.forEach(id => { if (!P.items[id]) console.error("Missing item " + id); });
    Object.keys(P.items).forEach(id => { if (!where[id]) console.error("Item not on roadmap " + id); });
    const allSteps = P.stages.flatMap(st => st.steps.map(sp => Object.assign({ stage: st.n }, sp)));

    // ---------- scoring ----------
    const it = id => P.items[id];
    const role = id => P.roles[it(id).role];
    const ratings = id => { const a = getState().r[id] || []; return it(id).dod.map((_, i) => a[i] || 0); };
    // progress per check: Not yet 0, Shaky 0.4, Solid/Confident 1 — so a Done topic is always 100%
    const W = [0, 0.4, 1, 1];
    const score = id => { const a = ratings(id); return a.reduce((x, y) => x + W[y], 0) / a.length; };
    const isDone = id => ratings(id).every(v => v >= 2);
    const started = id => ratings(id).some(v => v > 0) || (getState().pc[id] || []).some(Boolean) || Object.values(getState().rc[id] || {}).some(Boolean);
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
    const visible = id => getState().ui.showOpt || !it(id).opt;

    return { order, where, allSteps, it, role, ratings, score, isDone, started, status, statusLabel, required, progress, stepOptional, stepReq, stepDone, currentStep, visible };
  }
});
