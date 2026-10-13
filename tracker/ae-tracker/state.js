// State defaults and legacy migrations; no DOM or storage side effects.
globalThis.AEState = Object.freeze({
  create(plan, store) {
    const P = plan, Store = store, GEN = Store.GENERAL;
    const trackName = Object.fromEntries(P.tracks.map(t => [t.id, t.name]));
    const stageIds = new Set(P.stages.map(st => st.id));
    const sources = new Set(P.stages.flatMap(st => st.from));
    // notes: [{ id, track, text, topic?, c, u }] (first line of text = title) · lib: { resourceKey: "done"|"later" } · act: { "YYYY-MM-DD": actions }
    // ck: { lessonOrSourceId: [checked…] } · done: { lessonId: date } · built: { stageId: date } · r: legacy 4-level ratings, kept as evidence
    const MAPS = ["r", "pc", "rc", "g", "lib", "act", "practice", "ck", "done", "built"];
    // checksV is set by migrate(), never by defaults: cloud records are unpacked over blank(), and an
    // old account without the marker must still be migrated.
    const blank = () => ({ v: 7, setupV: 2, curriculumV: P.curriculumV, savedAt: 0, r: {}, pc: {}, rc: {}, g: {}, ck: {}, done: {}, built: {}, notes: [], lib: {}, act: {}, log: [], todo: [], practice: {}, attempts: [], ui: { hideDone: false, showOpt: true, res: "topic" } });
    const trackOf = topic => P.items[topic] ? P.items[topic].track : stageIds.has(topic) ? "pf" : GEN;
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
    function legacyLogText(e) {
      const details = [e.h != null && `${e.h}h`, P.roles[e.role]?.name,
        e.item && (P.items[e.item] ? P.items[e.item].name : e.item)].filter(Boolean).join(" · ");
      return [e.note, details].filter(Boolean).join("\n\n") || "Progress logged.";
    }
    function migrate(s) {
      const oldSetup = !!s && s.setupV !== 2;
      const oldCurriculum = s?.curriculumV ?? 3;
      const oldChecks = s?.checksV ?? 0;
      s = Object.assign(blank(), s || {});
      s.ui = Object.assign(blank().ui, s.ui || {}); delete s.ui.iv;
      MAPS.forEach(k => { if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {}; });
      const attemptIds = new Set();
      s.attempts = (Array.isArray(s.attempts) ? s.attempts : []).filter(e => e && typeof e.problem === "string" && typeof e.tool === "string").map((e, i) => {
        let id = e.id || `${Store.uid()}-attempt-${i}`;
        if (attemptIds.has(id)) id = `${Store.uid()}-attempt-${i}`;
        attemptIds.add(id);
        return { ...e, id };
      });
      if (!Array.isArray(s.log)) s.log = [];
      // Keep every legacy field while making old sessions readable as journal entries.
      const logIds = new Set();
      s.log = s.log.map((e, i) => {
        let id = e.id || `${Store.uid()}-${i}`;
        if (logIds.has(id)) id = `${Store.uid()}-log-${i}`;
        logIds.add(id);
        return { ...e, id, text: typeof e.text === "string" ? e.text : legacyLogText(e) };
      });
      const todoIds = new Set();
      s.todo = (Array.isArray(s.todo) ? s.todo : []).filter(e => e && typeof e.text === "string" && e.text.trim()).map((e, i) => {
        let id = e.id || `${Store.uid()}-todo-${i}`;
        if (todoIds.has(id)) id = `${Store.uid()}-todo-${i}`;
        todoIds.add(id);
        return { ...e, id, done: e.done === true, track: e.track === GEN || trackName[e.track] ? e.track : GEN };
      });
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
        if (n.topic && (P.items[n.topic] || stageIds.has(n.topic))) x.topic = n.topic;
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
      // Checks v1: 4-level ratings become check boxes once. Solid/Confident ticks a check; Not yet/Shaky leaves it open.
      // Topics that were Done under the old rule stay complete, even if a newer prerequisite is not. Ratings are kept.
      if (oldChecks < P.checksV) {
        const wasDone = id => Array.isArray(s.r[id]) && P.items[id].dod.every((_, i) => (s.r[id][i] || 0) >= 2);
        Object.keys(P.items).forEach(id => {
          const old = s.r[id];
          if (!Array.isArray(old)) return;
          const row = Array.isArray(s.ck[id]) ? s.ck[id] : (s.ck[id] = []);
          P.items[id].dod.forEach((_, i) => { row[i] = row[i] === true || (old[i] || 0) >= 2; });
          if (!sources.has(id) && wasDone(id) && !s.done[id]) s.done[id] = "migrated";
        });
        P.stages.forEach(st => {
          if (!st.from.length || !st.from.every(wasDone) || s.built[st.id]) return;
          s.built[st.id] = "migrated";
          const own = st.checks.filter(c => typeof c !== "string");
          if (own.length) s.ck[st.id] = own.map(() => true);
        });
      }
      s.checksV = Math.max(oldChecks, P.checksV);
      s.v = 7;
      return s;
    }
    const hasData = s => s.todo.length || s.log.length || s.notes.length || s.attempts.length || MAPS.some(k => Object.keys(s[k] || {}).length);

    return { blank, migrate, hasData, trackOf, trackLabel, trackName };
  }
});
