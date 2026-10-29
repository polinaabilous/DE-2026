// Lessons, portfolio stages and roadmap progress. getState keeps calculations current after imports and account changes.
globalThis.AEProgress = Object.freeze({
  create(plan, getState) {
    const P = plan;
    const S = () => getState();
    const it = id => P.items[id];
    const stageById = Object.fromEntries(P.stages.map(s => [s.id, s]));
    const stage = id => stageById[id];
    const isStage = id => !!stageById[id];
    // Portfolio topics are the content sources of project stages; every other topic is a lesson.
    const sourceOf = {};
    P.stages.forEach(s => s.from.forEach(id => { (sourceOf[id] ||= []).push(s.id); }));
    const isLesson = id => !!it(id) && !sourceOf[id];

    // ---------- roadmap rows (roadmap order defines lesson order) ----------
    const rows = [];
    P.road.forEach(sec => sec.rows.forEach((row, i) => rows.push(Object.assign({ section: sec.id, key: `${sec.id}-${i}` }, row))));
    const order = [];
    const rowOf = {};
    rows.forEach(row => {
      (row.learn || []).forEach(id => { order.push(id); rowOf[id] = row; });
      if (row.milestone) { order.push(row.milestone); rowOf[row.milestone] = row; }
      if (row.stage) rowOf[row.stage] = row;
      if (row.checkpoint) rowOf["cp:" + row.checkpoint] = row;
    });
    const sectionOf = id => P.road.find(s => s.id === (rowOf[id] || {}).section);
    Object.keys(P.items).filter(isLesson).forEach(id => { if (!rowOf[id]) console.error("Lesson not on roadmap " + id); });

    // ---------- areas ----------
    const areaOfId = {};
    P.areas.forEach(a => a.chapters.forEach(([, , ids]) => ids.forEach(id => { areaOfId[id] = a.id; })));
    const area = id => P.areas.find(a => a.id === id);
    const areaOf = id => area(areaOfId[id]);
    const areaLessons = a => (typeof a === "string" ? area(a) : a).chapters.flatMap(c => c[2]);

    // ---------- checks, completion and readiness ----------
    const ckRow = owner => S().ck[owner] || [];
    const lessonChecks = id => it(id).dod.map((_, i) => !!ckRow(id)[i]);
    const isDone = id => isStage(id) ? !!S().built[id] : !!S().done[id];
    const prereqs = id => it(id)?.prerequisites || [];
    const missingPrereqs = id => prereqs(id).filter(p => !isDone(p));
    const checksDone = id => lessonChecks(id).every(Boolean);
    const canComplete = id => !isDone(id) && checksDone(id) && !missingPrereqs(id).length;
    const started = id => isStage(id) ? stageChecks(stage(id)).some(c => c.on) || stageTasks(stage(id)).some(t => t.on) : lessonChecks(id).some(Boolean) || (S().pc[id] || []).some(Boolean) || Object.values(S().rc[id] || {}).some(Boolean);
    const status = id => isDone(id) ? "done" : started(id) ? "doing" : "todo";
    const statusLabel = { done: "Complete", doing: "In progress", todo: "Not started" };
    const lessons = order.filter(isLesson);
    const required = lessons.filter(id => !it(id).opt);

    // Stage tasks and completion checks resolve to an owner row and index in pc / ck.
    const ref = (r, ownerDefault, n) => {
      if (typeof r === "string") { const [owner, i] = r.split("|"); return { owner, idx: +i, legacy: true }; }
      return { owner: ownerDefault, idx: n, legacy: false };
    };
    function stageChecks(s) {
      let n = 0;
      return s.checks.map(c => {
        const r = typeof c === "string" ? ref(c) : ref(null, s.id, n++);
        return Object.assign(r, { text: r.legacy ? it(r.owner).dod[r.idx] : c.t, on: !!ckRow(r.owner)[r.idx] });
      });
    }
    function stageTasks(s) {
      let n = 0;
      return s.tasks.map(t => {
        const r = t.ref ? ref(t.ref) : ref(null, s.id, n++);
        return Object.assign(r, { title: t.t, text: r.legacy ? it(r.owner).practice[r.idx] : t.d, on: !!(S().pc[r.owner] || [])[r.idx] });
      });
    }
    const stageDesc = s => s.desc || (s.from[0] ? it(s.from[0]).c : "");
    const stageReady = s => s.req.every(isDone) && s.after.every(isDone);
    const stageStatus = s => isDone(s.id) ? "built" : stageReady(s) ? "ready" : "locked";
    const stageLabel = { built: "Built", ready: "Ready to build", locked: "Prerequisites needed" };
    const canBuild = s => !isDone(s.id) && stageReady(s) && stageChecks(s).every(c => c.on);
    const connections = id => P.stages.filter(s => s.req.includes(id));
    const stagesFrom = id => (sourceOf[id] || []).map(stage);

    // ---------- roadmap position ----------
    const cpDone = key => P.checkpoints[key].items.every((_, i) => !!S().g[key + "-" + i]);
    function rowDone(row) {
      if (row.checkpoint) return cpDone(row.checkpoint);
      const learnDone = (row.learn || []).filter(id => !it(id).opt).every(isDone);
      if (row.stage) return learnDone && isDone(row.stage);
      if (row.milestone) return learnDone && (it(row.milestone).opt || isDone(row.milestone));
      return learnDone;
    }
    const currentRow = () => rows.find(r => !rowDone(r));
    const title = id => isStage(id) ? stage(id).name : it(id) ? it(id).name : id;

    return { it, order, lessons, required, rows, rowOf, sectionOf, stage, isStage, isLesson, stagesFrom, sourceOf,
      area, areaOf, areaLessons, lessonChecks, isDone, prereqs, missingPrereqs, checksDone, canComplete, started, status, statusLabel,
      stageChecks, stageTasks, stageDesc, stageReady, stageStatus, stageLabel, canBuild, connections, cpDone, rowDone, currentRow, title };
  }
});
