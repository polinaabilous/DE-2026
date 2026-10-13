// Resource catalog and completion rules, independent of views and persistence.
globalThis.AEResources = Object.freeze({
  create(plan, roadmap, getState) {
    const P = plan, { order, it } = roadmap;
    const trackName = Object.fromEntries(P.tracks.map(t => [t.id, t.name]));
    function resolve(entry) {
      if (Array.isArray(entry)) return { key: entry[0], title: entry[0], url: entry[1], kind: entry[2] || "docs" };
      const [k, note] = entry.split("|");
      const r = P.L[k];
      if (!r) { console.error("Missing resource " + k); return { key: k, title: k, url: null, kind: "?" }; }
      return { key: k, title: r[0], url: r[1], kind: r[2], note };
    }

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
    const libDone = k => getState().lib[k] === "done" || Object.values(getState().rc).some(m => m && m[k]);
    const libLater = k => getState().lib[k] === "later" && !libDone(k);
    function setLibDone(k, on) {
      if (on) { getState().lib[k] = "done"; return; }
      delete getState().lib[k];
      Object.values(getState().rc).forEach(m => { if (m) delete m[k]; });
    }

    return { resolve, LIB, TIME, KINDS, libDone, libLater, setLibDone };
  }
});
