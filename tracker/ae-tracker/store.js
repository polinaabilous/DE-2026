// Folder storage for the roadmap (File System Access API, Edge/Chrome).
// Layout of the data folder:
//   progress.json                    ratings, practice, resources, daily log, to dos, activity
//   notes/<track>.md                 your notes, one Markdown file per track (readable/editable in VS Code, Obsidian, GitHub)
//   notes/general.md                 notes not tied to a track
//   backups/ae-roadmap-<date>.json   daily full snapshot, newest 14 kept
window.AEStore = (() => {
  const GENERAL = "general";
  const KEEP_BACKUPS = 14;
  const { today, uid, slug, oneLine, norm } = globalThis.AEUtils;

  // ---------- markdown ----------
  // A body line starting with "## " would start a new note, so it is written as "\## " (outside code fences).
  function escHeads(text, add) {
    let fence = null;
    return text.split("\n").map(l => {
      if (fence) { if (new RegExp("^" + fence + "`*\\s*$").test(l)) fence = null; return l; }
      const f = l.match(/^(`{3,})/);
      if (f) { fence = f[1]; return l; }
      return add ? l.replace(/^(\\*##\s)/, "\\$1") : l.replace(/^\\(\\*##\s)/, "$1");
    }).join("\n");
  }
  // note = { id, track, text, topic?, c, u } — first line of text is the title
  function noteMd(n) {
    const [first, ...rest] = String(n.text || "").replace(/\s+$/, "").split("\n");
    const meta = [`id: ${n.id}`, n.c && `created: ${n.c}`, n.u && n.u !== n.c && `updated: ${n.u}`, n.topic && `topic: ${n.topic}`].filter(Boolean).join(" | ");
    const body = escHeads(rest.join("\n").replace(/^\s*\n/, ""), true).trim();
    return `## ${oneLine(first) || "(untitled)"}\n<!-- ${meta} -->\n${body ? "\n" + body + "\n" : ""}`;
  }
  function fileMd(track, title, notes) {
    return `---\ntrack: ${track}\ntitle: ${oneLine(title)}\n---\n\n# ${oneLine(title)} — notes\n\n` +
      `<!-- AE roadmap notes. Each "## " heading starts a note; keep the "<!-- id … -->" line under it. Edits here are picked up by the app. -->\n\n` +
      notes.map(noteMd).join("\n");
  }
  // split into front matter + "## " blocks (fence-aware); returns the text before the first block too
  function blocksOf(txt) {
    txt = norm(txt);
    const fm = {}, m = txt.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
    let body = txt;
    if (m) { m[1].split("\n").forEach(l => { const x = l.match(/^(\w+):\s*(.*)$/); if (x) fm[x[1]] = x[2].trim(); }); body = txt.slice(m[0].length); }
    const pre = [], blocks = []; let cur = null, fence = null;
    for (const l of body.split("\n")) {
      if (fence) { if (new RegExp("^" + fence + "`*\\s*$").test(l)) fence = null; (cur || pre).push(l); continue; }
      const f = l.match(/^(`{3,})/);
      if (f) { fence = f[1]; (cur || pre).push(l); continue; }
      if (/^##\s/.test(l)) { cur = [l]; blocks.push(cur); continue; }
      (cur || pre).push(l);
    }
    return { fm, pre, blocks };
  }
  function metaOf(lines) {
    const meta = {}; let rest = lines;
    const mi = lines.findIndex(l => l.trim() !== "");
    if (mi >= 0 && /^<!--[\s\S]*-->$/.test(lines[mi].trim())) {
      lines[mi].trim().slice(4, -3).split("|").forEach(part => {
        const [k, ...v] = part.split(":"); meta[k.trim().toLowerCase()] = v.join(":").trim();
      });
      rest = lines.slice(mi + 1);
    }
    return { meta, rest };
  }
  function parseMd(txt) {
    const { fm, pre, blocks } = blocksOf(txt);
    const notes = blocks.map(b => {
      const { meta, rest } = metaOf(b.slice(1));
      const head = b[0].replace(/^##\s+/, "").trim(), body = escHeads(rest.join("\n"), false).trim();
      const n = { id: meta.id || uid(), text: body ? head + "\n" + body : head, c: meta.created || today() };
      n.u = meta.updated || n.c;
      if (meta.topic) n.topic = meta.topic;
      return n;
    });
    // anything written above the first "## " (besides the title and the app's comment) becomes a note, so it isn't lost
    const loose = pre.filter(l => !/^#\s/.test(l) && !/^<!-- AE roadmap/.test(l.trim())).join("\n").trim();
    if (loose) notes.unshift({ id: uid(), text: loose, c: today(), u: today() });
    return { track: fm.track || null, title: fm.title || null, notes };
  }
  // Older versions kept typed entries per topic in knowledge/*.md — read them once so nothing is lost.
  function parseLegacy(txt) {
    const { fm, blocks } = blocksOf(txt);
    return {
      topic: fm.topic || null,
      entries: blocks.map(b => {
        const { meta, rest } = metaOf(b.slice(1));
        const h = b[0].replace(/^##\s+/, "").trim();
        const m = h.match(/^(?:\S+\s+)?(Insight|Gotcha|Q|Snippet|Link)(?:\s*\(([^)]*)\))?\s*:\s*(.*)$/i);
        const t = m ? { insight: "insight", gotcha: "gotcha", q: "qa", snippet: "snippet", link: "link" }[m[1].toLowerCase()] : "insight";
        const e = { id: meta.id || uid(), t, q: m ? m[3].trim() : h, a: rest.join("\n").trim(), c: meta.created, u: meta.updated || meta.created };
        if (m && m[2]) e.lang = m[2].trim();
        if (meta.tags) e.tags = meta.tags.split(",").map(s => s.trim()).filter(Boolean);
        if (t === "link") { const lm = e.a.match(/^<(\S+)>\s*/) || e.a.match(/^(https?:\/\/\S+)\s*/); if (lm) { e.url = lm[1]; e.a = e.a.slice(lm[0].length).trim(); } }
        if (t === "snippet") { const f = e.a.match(/^(`{3,})([^\n`]*)\n([\s\S]*?)\n?\1`*\s*$/); if (f) { e.lang = e.lang || f[2].trim(); e.a = f[3]; } }
        else e.a = escHeads(e.a, false);
        return e;
      }),
    };
  }
  const fileName = (track, title) => track === GENERAL ? "general.md" : `${slug(title)}.md`;

  // ---------- handle persistence (IndexedDB) ----------
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open("ae-roadmap", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const idbDo = (mode, fn) => idb().then(db => new Promise((res, rej) => {
    const tx = db.transaction("kv", mode), req = fn(tx.objectStore("kv"));
    tx.oncomplete = () => res(req.result); tx.onerror = () => rej(tx.error);
  }));
  const idbGet = k => idbDo("readonly", s => s.get(k));
  const idbSet = (k, v) => idbDo("readwrite", s => s.put(v, k));
  const idbDel = k => idbDo("readwrite", s => s.delete(k));

  // ---------- folder ----------
  const supported = typeof window.showDirectoryPicker === "function";
  let dir = null, state = supported ? "none" : "unsupported", name = "", err = "", lastSaved = null, lastBackup = "";
  let cache = new Map(), fileOf = {}, pending = null, timer = null, chain = Promise.resolve();
  const listeners = [];
  const info = () => ({ supported, state, name, err, lastSaved });
  const emit = () => listeners.forEach(f => f(info()));

  async function sub(n, create) {
    try { return await dir.getDirectoryHandle(n, { create }); }
    catch (e) { if (e.name === "NotFoundError") return null; throw e; }
  }
  async function readText(d, n) {
    try { return await (await (await d.getFileHandle(n)).getFile()).text(); }
    catch (e) { if (e.name === "NotFoundError" || e.name === "TypeMismatchError") return null; throw e; }
  }
  async function writeText(d, n, txt) {
    const w = await (await d.getFileHandle(n, { create: true })).createWritable();
    await w.write(txt); await w.close();
  }
  async function* mdFiles(d) {
    if (d) for await (const [n, h] of d.entries()) if (h.kind === "file" && n.toLowerCase().endsWith(".md")) yield [n, await (await h.getFile()).text()];
  }
  function reset() { cache = new Map(); fileOf = {}; pending = null; clearTimeout(timer); lastBackup = ""; }

  async function init() {
    if (!supported) return info();
    try {
      const h = await idbGet("dir");
      if (h) { dir = h; name = h.name; state = (await h.queryPermission({ mode: "readwrite" })) === "granted" ? "connected" : "locked"; }
    } catch { state = "none"; }
    emit(); return info();
  }
  async function use(h) {
    await flush();
    reset(); dir = h; name = h.name; state = "connected"; err = "";
    try { await idbSet("dir", h); } catch { /* handle can't be remembered; still usable this session */ }
    emit();
  }
  async function pick() {
    const h = await window.showDirectoryPicker({ id: "ae-roadmap", mode: "readwrite", startIn: "documents" });
    await use(h);
  }
  async function unlock() {
    if (!dir) return false;
    state = (await dir.requestPermission({ mode: "readwrite" })) === "granted" ? "connected" : "locked";
    emit(); return state === "connected";
  }
  async function disconnect() {
    await flush();
    reset(); dir = null; name = ""; state = supported ? "none" : "unsupported"; err = "";
    try { await idbDel("dir"); } catch { }
    emit();
  }

  // Read everything from the folder. trackOfFile(fileName) maps a file without front matter to a track.
  // Returns { progress, notes, kb (legacy, only when there is no notes/ yet), empty }.
  async function read(trackOfFile) {
    await chain;
    reset();
    const pj = await readText(dir, "progress.json");
    cache.set("progress.json", pj);
    let progress = null;
    if (pj) { try { progress = JSON.parse(pj); } catch { throw new Error("progress.json in the data folder isn't valid JSON — fix or delete it."); } }
    const notes = [], seen = new Set(); let md = 0, kb = null;
    const nd = await sub("notes", false);
    for await (const [n, txt] of mdFiles(nd)) {
      cache.set("notes/" + n, txt); md++;
      const p = parseMd(txt), track = p.track || (trackOfFile && trackOfFile(n)) || GENERAL;
      p.notes.forEach(x => { if (seen.has(x.id)) x.id = uid(); seen.add(x.id); notes.push(Object.assign(x, { track })); });
      (fileOf[track] = fileOf[track] || []).push(n);
    }
    if (!md) {
      kb = {};
      for await (const [n, txt] of mdFiles(await sub("knowledge", false))) {
        const p = parseLegacy(txt), topic = p.topic || (n.match(/^([A-Za-z0-9]+)\s+-\s/) || [])[1] || (n === "_general.md" ? "_general" : null);
        if (topic && p.entries.length) { kb[topic] = (kb[topic] || []).concat(p.entries); md++; }
      }
    }
    return { progress, notes, kb, empty: !pj && !md };
  }

  async function write(S, title) {
    const { notes = [], ...data } = S;
    const pj = JSON.stringify({ app: "ae-roadmap", version: 6, savedAt: S.savedAt, data }, null, 2);
    if (cache.get("progress.json") !== pj) { await writeText(dir, "progress.json", pj); cache.set("progress.json", pj); }
    const by = {};
    notes.forEach(n => (by[n.track || GENERAL] = by[n.track || GENERAL] || []).push(n));
    const nd = await sub("notes", true);
    for (const t of new Set([...Object.keys(by), ...Object.keys(fileOf)])) {
      const list = by[t] || [];
      const want = list.length ? fileName(t, title(t)) : null;
      for (const old of fileOf[t] || []) {
        if (old === want) continue;
        try { await nd.removeEntry(old); } catch (e) { if (e.name !== "NotFoundError") throw e; }
        cache.delete("notes/" + old);
      }
      if (!want) { delete fileOf[t]; continue; }
      const txt = fileMd(t, title(t), list);
      if (cache.get("notes/" + want) !== txt) { await writeText(nd, want, txt); cache.set("notes/" + want, txt); }
      fileOf[t] = [want];
    }
    if (lastBackup !== today()) await backup(S);
  }

  // One full snapshot per day; keeps the newest KEEP_BACKUPS.
  async function backup(S) {
    const day = today(), bd = await sub("backups", true), n = `ae-roadmap-${day}.json`;
    if (await readText(bd, n) === null) await writeText(bd, n, JSON.stringify(S, null, 2));
    lastBackup = day;
    const names = [];
    for await (const [k, h] of bd.entries()) if (h.kind === "file" && /^ae-roadmap-\d{4}-\d{2}-\d{2}\.json$/.test(k)) names.push(k);
    for (const k of names.sort().slice(0, -KEEP_BACKUPS)) { try { await bd.removeEntry(k); } catch { } }
  }

  function schedule(S, title) {
    if (state !== "connected") return;
    pending = { S, title };
    clearTimeout(timer); timer = setTimeout(flush, 500);
  }
  function flush() {
    clearTimeout(timer);
    if (!pending || state !== "connected") return chain;
    const p = pending; pending = null;
    chain = chain.then(() => write(p.S, p.title)).then(() => { lastSaved = new Date(); err = ""; emit(); }, e => {
      err = e.message || String(e);
      if (e.name === "NotAllowedError" || e.name === "SecurityError") state = "locked";
      if (!pending) pending = p;
      emit();
    });
    return chain;
  }

  // True when files in the folder differ from what this tab last read/wrote (edited elsewhere).
  async function changedOnDisk() {
    if (state !== "connected" || pending) return false;
    await chain;
    if (await readText(dir, "progress.json") !== cache.get("progress.json")) return true;
    const seen = new Set();
    for await (const [n, txt] of mdFiles(await sub("notes", false))) {
      seen.add(n);
      if (txt !== cache.get("notes/" + n)) return true;
    }
    for (const k of cache.keys()) if (k.startsWith("notes/") && !seen.has(k.slice(6))) return true;
    return false;
  }

  return {
    GENERAL, uid, today, slug, parseMd, fileMd, parseLegacy,
    init, pick, use, unlock, disconnect, read, schedule, flush, backup, changedOnDisk,
    info, on: f => listeners.push(f),
  };
})();
