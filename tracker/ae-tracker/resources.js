// Resource catalog, per-lesson picks and completion rules, independent of views and persistence.
globalThis.AEResources = Object.freeze({
  create(plan, roadmap, getState) {
    const P = plan, { order, it, isLesson, areaOf, areaLessons } = roadmap;
    const trackName = Object.fromEntries(P.tracks.map(t => [t.id, t.name]));
    function resolve(entry) {
      if (Array.isArray(entry)) return { key: entry[0], title: entry[0], url: entry[1], kind: entry[2] || "docs" };
      const [k, note] = entry.split("|");
      const r = P.L[k] || P.LX[k];
      if (!r) { console.error("Missing resource " + k); return { key: k, title: k, url: null, kind: "?" }; }
      return { key: k, title: r[0], url: r[1], kind: r[2], note };
    }

    // ---------- per-lesson picks: deck first, then at most 3 resources ----------
    // Practice sites move to "Where to find more problems"; books and courses used by several lessons move to
    // the area reading list. Everything else stays in the Library, tagged with its lessons.
    const usage = {};
    Object.values(P.items).filter(x => isLesson(x.id)).forEach(x => x.learn.forEach(e => { const k = e.split("|")[0]; usage[k] = (usage[k] || 0) + 1; }));
    const kindOf = k => (P.L[k] || P.LX[k] || [])[2];
    const broad = k => kindOf(k) === "book" || (kindOf(k) === "course" && usage[k] > 1);
    const MAX = 3;
    const picks = {};
    function lessonRes(id) {
      if (picks[id]) return picks[id];
      const x = it(id), o = P.lessonResources[id] || {};
      const entries = x.learn.map(resolve);
      const sites = entries.filter(r => r.kind === "practice");
      (o.sites || []).map(resolve).forEach(r => { if (!sites.some(s => s.key === r.key)) sites.push(r); });
      let start, deeper;
      if (o.start !== undefined) {
        start = o.start ? resolve(o.start) : null;
        deeper = (o.deeper || []).map(resolve);
      } else {
        const cands = entries.filter(r => r.kind !== "practice" && !broad(r.key));
        start = cands[0] || null; deeper = cands.slice(1, MAX);
      }
      const shown = new Set([start, ...deeper].filter(Boolean).map(r => r.key));
      const reading = entries.filter(r => !shown.has(r.key) && r.kind !== "practice" && broad(r.key));
      const more = entries.filter(r => !shown.has(r.key) && r.kind !== "practice" && !broad(r.key));
      return (picks[id] = { start, deeper, sites, reading, more });
    }
    const areaReading = a => {
      const out = new Map(), id = typeof a === "string" ? a : a.id;
      areaLessons(a).forEach(l => lessonRes(l).reading.forEach(r => { if (!out.has(r.key)) out.set(r.key, Object.assign({ lessons: [] }, r)); out.get(r.key).lessons.push(l); }));
      (P.areaReadingExtra[id] || []).map(resolve).forEach(r => { if (!out.has(r.key)) out.set(r.key, Object.assign({ lessons: [] }, r)); });
      return [...out.values()];
    };

    // ---------- decks that exist in docs/ (never planned ones) ----------
    const deckUrl = (key, slide) => P.deckBase + P.decks[key].file + (slide ? "#slide-" + slide : "");
    function deckFor(id) {
      const d = P.lessonDecks[id] || {};
      const mk = ([key, slide, note, partial]) => ({ key, slide, note, partial: !!partial, title: P.decks[key].title, sub: P.decks[key].sub || "", url: deckUrl(key, slide) });
      return { decks: (d.deck || []).map(mk), labs: (d.lab || []).map(mk), planned: (P.lessonPlanned[id] || []).map(k => P.plannedDecks[k]) };
    }

    const TIME = { quick: ["⚡", "≤30 min"], hour: ["⏱", "~1 hour"], series: ["📺", "Pick a piece"], deep: ["📚", "Multi-session"], ref: ["🔎", "Reference"] };
    const KINDS = ["video", "podcast", "article", "newsletter", "course", "book", "practice", "docs", "tool"];
    const ORPHAN = { pgex: ["sql", "perf"], cmu: ["perf", "arch"], pyStdlib: ["py"], fluentPy: ["py"], realPython: ["py"], ghArchive: ["py", "sql"] };
    // every resource once: lessons and portfolio sources (areas = tracks of the topics that use it, in roadmap order) + extras to watch, read or listen to
    const LIB = (() => {
      const m = new Map();
      const ids = order.concat(Object.keys(P.items).filter(id => !order.includes(id)));
      ids.forEach(id => it(id).learn.map(resolve).forEach(r => {
        if (!m.has(r.key)) m.set(r.key, { key: r.key, title: r.title, url: r.url, kind: r.kind, areas: [], topics: [], why: "" });
        const x = m.get(r.key);
        if (!x.topics.includes(id)) x.topics.push(id);
        if (!x.areas.includes(it(id).track)) x.areas.push(it(id).track);
      }));
      Object.entries(P.L).forEach(([k, r]) => { if (!m.has(k)) m.set(k, { key: k, title: r[0], url: r[1], kind: r[2], areas: (ORPHAN[k] || []).slice(), topics: [], why: "" }); });
      Object.entries(P.LX).forEach(([k, r]) => {
        const used = m.get(k);
        m.set(k, { key: k, title: r[0], url: r[1], kind: r[2], areas: r[3].slice(), topics: used ? used.topics : [], time: r[4], why: r[5] || "" });
      });
      return [...m.values()].map(x => {
        if (!x.areas.length) x.areas = ["career"];
        x.time = TIME[x.time] ? x.time : P.LT[x.key] || ({ docs: "ref", tool: "ref", book: "deep", course: "deep" })[x.kind] || "series";
        x.text = [x.title, x.why, x.kind, ...x.areas.map(a => trackName[a]), ...x.topics.map(roadmap.title)].join(" ").toLowerCase();
        return x;
      });
    })();
    const libDone = k => getState().lib[k] === "done" || Object.values(getState().rc).some(m => m && m[k]);
    const libLater = k => getState().lib[k] === "later" && !libDone(k);
    function setLibDone(k, on) {
      if (on) { getState().lib[k] = "done"; return; }
      delete getState().lib[k];
      Object.values(getState().rc).forEach(m => { if (m) delete m[k]; });
    }

    return { resolve, lessonRes, areaReading, deckFor, deckUrl, broad, MAX, LIB, TIME, KINDS, libDone, libLater, setLibDone };
  }
});
