// Resource catalog, per-lesson picks, decks, long-read status and completion rules, independent of views and persistence.
globalThis.AEResources = Object.freeze({
  create(plan, roadmap, getState) {
    const P = plan, { order, it, isLesson, areaLessons } = roadmap;
    const S = () => getState();
    const today = () => globalThis.AEUtils.today();
    const trackName = Object.fromEntries(P.tracks.map(t => [t.id, t.name]));

    // ---------- formats: one colour + icon each (styles.css .f-<format>) ----------
    const FORMATS = {
      deck: ["Deck", "slides"], article: ["Article", "doc"], video: ["Video", "play"], docs: ["Docs", "code"], course: ["Course", "cap"],
      book: ["Book", "book"], podcast: ["Podcast", "mic"], newsletter: ["Newsletter", "mail"], practice: ["Practice", "target"],
      tool: ["Tool", "wrench"], community: ["Community", "users"]
    };
    const FORMAT_ORDER = Object.keys(FORMATS);
    const TIME = { quick: ["⚡", "≤30 min"], hour: ["⏱", "~1 hour"], series: ["📺", "Pick a piece"], deep: ["📚", "Multi-session"], ref: ["🔎", "Reference"] };
    const raw = k => P.L[k] || P.LX[k];
    const meta = k => P.LM[k] || {};
    // Retired keys still resolve for old backups; no visible recommendation uses them.
    const isActive = k => !P.resourceReview?.retired?.[k];
    const production = new Map((P.productionReading || []).map(r => [r.key, r]));
    const active = entries => entries.filter(r => isActive(r.key));
    const formatOf = k => FORMATS[meta(k).f] ? meta(k).f : ({ docs: "docs", tool: "tool" })[(raw(k) || [])[2]] || (raw(k) || [])[2] || "article";
    const timeOf = k => meta(k).t || (P.LX[k] && P.LX[k][4]) || ({ docs: "ref", tool: "ref", book: "deep", course: "deep" })[formatOf(k)] || "series";
    // Long reads = books and courses: they get a Reading / Later / Done status instead of a quick tick.
    const LONG = new Set(["book", "course"]), LOOP = new Set(["newsletter", "community", "podcast"]);
    const shelfOf = format => LONG.has(format) ? "long" : LOOP.has(format) ? "loop" : "quick";

    function resolve(entry) {
      if (Array.isArray(entry)) return { key: entry[0], title: entry[0], url: entry[1], kind: entry[2] || "docs", format: entry[2] || "docs", time: "ref" };
      const [k, explicitNote] = entry.split("|");
      const r = raw(k);
      if (!r) { console.error("Missing resource " + k); return { key: k, title: k, url: null, kind: "?", format: "article", time: "ref" }; }
      const m = meta(k);
      const practical = production.get(k);
      const context = practical ? (practical.priority ? "Good first read. " : "") + m.why.replace(/^Production reading\. /, "") : undefined;
      const note = practical && explicitNote && !explicitNote.includes(practical.try) ? explicitNote + " " + context : explicitNote || context;
      return { key: k, title: r[0], url: r[1], kind: r[2], format: formatOf(k), time: timeOf(k), why: m.why || (P.LX[k] && P.LX[k][5]) || "", pw: m.pw, note, production: !!practical };
    }

    // ---------- per-lesson picks: deck(s) first, then at most 3 resources ----------
    // Lessons follow lessonResources (start / deeper / reading / sites / tools / more / drop). A lesson without an entry
    // falls back to its learn[] order: practice sites move to the problem directory, books and shared courses to the
    // area reading list. Everything else tagged to a lesson stays in "Also tagged" (By lesson view and Library).
    const usage = {};
    Object.values(P.items).filter(x => isLesson(x.id)).forEach(x => x.learn.forEach(e => { const k = e.split("|")[0]; usage[k] = (usage[k] || 0) + 1; }));
    const broad = k => (raw(k) || [])[2] === "book" || ((raw(k) || [])[2] === "course" && usage[k] > 1);
    const MAX = 3;
    const picks = {};
    const uniq = list => { const seen = new Set(); return list.filter(r => r && !seen.has(r.key) && seen.add(r.key)); };
    function lessonRes(id) {
      if (picks[id]) return picks[id];
      const x = it(id), o = P.lessonResources[id];
      const entries = active(x.learn.map(resolve));
      const resolveActive = list => active((list || []).map(resolve));
      let start, deeper, reading, sites, tools, extra, practical;
      if (o) {
        start = o.start ? resolveActive([o.start])[0] || null : null;
        deeper = resolveActive(o.deeper);
        reading = resolveActive(o.reading);
        sites = uniq([...resolveActive(o.sites), ...entries.filter(r => r.kind === "practice" && !(o.drop || []).includes(r.key))]);
        tools = resolveActive(o.tools);
        practical = resolveActive(o.production);
        extra = resolveActive([...(o.more || []), ...(o.drop || [])]);
      } else {
        const cands = entries.filter(r => r.kind !== "practice" && !broad(r.key));
        start = cands[0] || null; deeper = cands.slice(1, MAX);
        reading = entries.filter(r => r.kind !== "practice" && broad(r.key));
        sites = entries.filter(r => r.kind === "practice"); tools = []; extra = []; practical = [];
      }
      // One article may become a primary pick after review. Show it once and keep its
      // full exercise/caveat note, regardless of which section owns it.
      deeper = uniq(deeper).filter(r => r.key !== start?.key);
      const primary = new Set([start, ...deeper].filter(Boolean).map(r => r.key));
      practical = uniq(practical).filter(r => !primary.has(r.key));
      const placed = new Set([start, ...deeper, ...practical, ...reading, ...sites, ...tools].filter(Boolean).map(r => r.key));
      const more = uniq([...extra, ...entries]).filter(r => !placed.has(r.key));
      return (picks[id] = { start, deeper, production: practical, reading, sites, tools, more });
    }
    // Every resource tagged to a lesson, in display order.
    const tagged = id => { const r = lessonRes(id); return uniq([r.start, ...r.deeper, ...r.production, ...r.reading, ...r.sites, ...r.tools, ...r.more]); };
    const areaReading = a => {
      const out = new Map(), id = typeof a === "string" ? a : a.id;
      const add = (r, lesson) => {
        if (!out.has(r.key)) out.set(r.key, Object.assign({}, r, { note: undefined, lessons: [] }));
        if (lesson) out.get(r.key).lessons.push({ id: lesson, note: r.note || "" });
      };
      areaLessons(a).forEach(l => lessonRes(l).reading.forEach(r => add(r, l)));
      active((P.areaReadingExtra[id] || []).map(resolve)).forEach(r => add(r));
      return [...out.values()];
    };
    // Portfolio stages show the picks of the portfolio topics they carry (start, go deeper, datasets/tools).
    const stageRefs = s => {
      const seen = new Set(), out = [];
      s.from.forEach(id => { const r = lessonRes(id); [r.start, ...r.deeper, ...r.tools].filter(Boolean).forEach(x => { if (!seen.has(x.key)) { seen.add(x.key); out.push([id, x]); } }); });
      active((s.resources || []).map(resolve)).forEach(r => { if (!seen.has(r.key)) { seen.add(r.key); out.push([s.id, r]); } });
      return out;
    };

    // ---------- decks published with the app (de-tracker/decks/) ----------
    const deckUrl = (slug, slide) => P.deckBase + P.decks[slug].file + (slide ? "#slide-" + slide : "");
    const docUrl = path => path.startsWith("projects/") ? path : P.docsBase + path;
    const deckInfo = slug => {
      const d = P.decks[slug];
      return { slug, key: "deck:" + slug, title: d.title, sub: d.sub || "", slides: d.slides || 0, guide: !!d.guide, url: deckUrl(slug),
        mdUrl: d.md ? P.deckBase + d.md : null, extras: (d.extras || []).map(([title, file]) => ({ title, url: P.deckBase + file })) };
    };
    function deckFor(id) {
      const list = (P.lessonDecks[id] || []).map(([slug, coverage, partial]) => Object.assign(deckInfo(slug), { coverage, partial: !!partial }));
      list.sort((a, b) => a.partial - b.partial);
      const labs = (P.lessonLabs[id] || []).map(l => {
        const html = /\.html$/.test(l.file);
        return { title: l.title, url: P.deckBase + l.file + (html && l.slide ? "#slide-" + l.slide : ""), slide: l.slide || null, folder: !html && /README\.md$/.test(l.file),
          slideUrl: l.deck && l.slide ? deckUrl(l.deck, l.slide) : null };
      });
      return { decks: list, labs, planned: (P.lessonPlanned[id] || []).map(k => P.plannedDecks[k]) };
    }
    const deckLessons = slug => order.filter(id => (P.lessonDecks[id] || []).some(d => d[0] === slug));

    // ---------- the Library: every resource once, tagged with the lessons and areas that use it ----------
    const ORPHAN = { pgex: ["sql", "perf"], cmu: ["perf", "arch"], pyStdlib: ["py"], fluentPy: ["py"], realPython: ["py"], ghArchive: ["py", "sql"] };
    const LIB = (() => {
      const m = new Map();
      const entry = (k, r) => m.get(k) || m.set(k, { key: k, title: r.title, url: r.url, kind: r.kind, format: r.format, time: r.time, why: r.why || "", pw: r.pw, areas: [], topics: [] }).get(k);
      const ids = order.concat(Object.keys(P.items).filter(id => !order.includes(id)));
      ids.forEach(id => {
        const own = uniq([...active(it(id).learn.map(resolve)), ...tagged(id)]);
        own.forEach(r => {
          const x = entry(r.key, r);
          if (!x.topics.includes(id)) x.topics.push(id);
          if (!x.areas.includes(it(id).track)) x.areas.push(it(id).track);
        });
      });
      Object.keys(P.L).forEach(k => { if (isActive(k) && !m.has(k)) entry(k, resolve(k)).areas.push(...(ORPHAN[k] || [])); });
      Object.entries(P.LX).forEach(([k, r]) => {
        if (!isActive(k)) return;
        const x = entry(k, resolve(k));
        x.areas = [...new Set([...r[3], ...x.areas])];
      });
      const decks = Object.keys(P.decks).map(slug => {
        const d = deckInfo(slug), topics = deckLessons(slug);
        return { key: d.key, deck: slug, title: d.title, url: d.url, mdUrl: d.mdUrl, kind: "deck", format: "deck",
          time: d.guide ? "quick" : d.slides > 22 ? "deep" : "hour", why: d.sub, slides: d.slides, areas: [...new Set(topics.map(id => it(id).track))], topics };
      });
      return [...decks, ...m.values()].map(x => {
        if (!x.areas.length) x.areas = ["career"];
        if (!TIME[x.time]) x.time = "series";
        x.shelf = shelfOf(x.format);
        x.text = [x.title, x.why, x.format, ...x.areas.map(a => trackName[a]), ...x.topics.map(roadmap.title)].join(" ").toLowerCase();
        return x;
      });
    })();
    const libItem = Object.fromEntries(LIB.map(x => [x.key, x]));

    // ---------- completion ----------
    const reading = () => S().reading || {}, readingW = () => S().reading || (S().reading = {});
    const libDone = k => S().lib[k] === "done" || reading()[k]?.status === "done" || Object.values(S().rc).some(m => m && m[k]);
    const libLater = k => (S().lib[k] === "later" || reading()[k]?.status === "later") && !libDone(k);
    function clearDone(k) {
      if (S().lib[k] === "done") delete S().lib[k];
      Object.values(S().rc).forEach(m => { if (m) delete m[k]; });
    }
    function setLibDone(k, on) {
      const r = reading()[k];
      if (on) { S().lib[k] = "done"; if (r) Object.assign(r, { status: "done", updated: today() }); return; }
      clearDone(k);
      if (r && r.status === "done") delete readingW()[k];
    }

    // ---------- long reads: Reading / Paused / Later / Done, with a short progress note ----------
    const isLong = k => libItem[k]?.shelf === "long";
    const longStatus = k => reading()[k]?.status || (libDone(k) ? "done" : libLater(k) ? "later" : "");
    const readingNow = () => Object.keys(reading()).filter(k => reading()[k]?.status === "reading" && raw(k) && isActive(k));
    // Only one book or course at a time: starting another one needs the current one paused first.
    const readingConflicts = k => readingNow().filter(x => x !== k);
    function setLongStatus(k, status) {
      const prev = reading()[k] || {};
      if (!status) {
        delete readingW()[k];
        if (prev.status === "done" || S().lib[k] === "done") clearDone(k);
        if (S().lib[k] === "later") delete S().lib[k];
        return;
      }
      readingW()[k] = Object.assign({}, prev, { status, updated: today() });
      if (status === "done") { S().lib[k] = "done"; return; }
      if (libDone(k)) clearDone(k);
      if (status === "later") S().lib[k] = "later"; else if (S().lib[k] === "later") delete S().lib[k];
    }
    // Returns { confirm: [keys] } when another long read is in progress and pauseOthers is not set; otherwise starts it.
    function startReading(k, pauseOthers = false) {
      const others = readingConflicts(k);
      if (others.length && !pauseOthers) return { confirm: others };
      others.forEach(o => setLongStatus(o, "paused"));
      setLongStatus(k, "reading");
      return { paused: others };
    }
    function setProgress(k, { note, pct } = {}) {
      const r = readingW()[k] || (readingW()[k] = { status: longStatus(k) || "reading" });
      if (note !== undefined) { const t = String(note).trim().slice(0, 120); if (t) r.note = t; else delete r.note; }
      if (pct !== undefined) { const n = Math.round(Number(pct)); if (pct === "" || !Number.isFinite(n)) delete r.pct; else r.pct = Math.max(0, Math.min(100, n)); }
      r.updated = today();
    }
    // The book you are reading: what you marked as Reading, otherwise the book you told the tracker about (plan.currentBooks).
    const currentBooks = () => { const now = readingNow(); return new Set(now.length ? now : P.currentBooks || []); };

    // ---------- quick picks for a lesson: deck → article → video, short items only ----------
    function quickPicks(id) {
      const d = deckFor(id).decks.find(x => !x.guide) || deckFor(id).decks[0];
      const pool = tagged(id).filter(r => r.time === "quick" || r.time === "hour");
      const article = pool.find(r => r.format === "article" || r.format === "docs");
      const video = pool.find(r => r.format === "video");
      return [d && libItem[d.key], article && libItem[article.key], video && libItem[video.key]].filter(Boolean);
    }

    return { resolve, isActive, lessonRes, tagged, areaReading, stageRefs, deckFor, deckUrl, docUrl, broad, MAX, LIB, libItem, TIME, FORMATS, FORMAT_ORDER, formatOf, shelfOf,
      libDone, libLater, setLibDone, isLong, longStatus, readingNow, readingConflicts, setLongStatus, startReading, setProgress, currentBooks, quickPicks };
  }
});
