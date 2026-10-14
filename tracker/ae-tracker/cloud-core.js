// Each saved entry/check is independent: a phone edit cannot replace a laptop's whole tracker.
(() => {
  const MAPS = new Set(["r", "pc", "rc", "g", "lib", "act", "practice", "ck", "done", "built", "reading"]);
  const LISTS = new Set(["notes", "log", "todo", "attempts"]);
  const LOCAL = new Set(["ui", "savedAt"]);
  const safe = k => typeof k === "string" && !["__proto__", "constructor", "prototype"].includes(k);
  const key = parts => JSON.stringify(parts);
  const text = value => JSON.stringify(value ?? null);
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  function pack(state) {
    const out = {};
    for (const [section, value] of Object.entries(state)) {
      if (!safe(section) || LOCAL.has(section)) continue;
      if (LISTS.has(section)) {
        for (const entry of value || []) if (safe(entry.id)) out[key([section, entry.id])] = text(entry);
      } else if (MAPS.has(section)) {
        for (const [id, row] of Object.entries(value || {})) {
          if (!safe(id)) continue;
          if (Array.isArray(row) || object(row)) {
            for (const [index, cell] of Object.entries(row)) if (safe(index)) out[key([section, id, index])] = text(cell);
          } else out[key([section, id])] = text(row);
        }
      } else out[key(["extra", section])] = text(value);
    }
    return out;
  }
  function unpack(records, defaults) {
    const out = structuredClone(defaults);
    for (const section of MAPS) out[section] = {};
    for (const section of LISTS) out[section] = [];
    for (const [encoded, value] of Object.entries(records)) {
      if (value === null) continue;
      const parts = JSON.parse(encoded), v = JSON.parse(value);
      if (!Array.isArray(parts) || !parts.every(safe)) throw Error("Invalid cloud record key.");
      const [section, id, index] = parts;
      if (LISTS.has(section) && parts.length === 2 && object(v) && v.id === id) out[section].push(v);
      else if (MAPS.has(section) && parts.length === 2) out[section][id] = v;
      else if (MAPS.has(section) && parts.length === 3) {
        const array = section === "r" || section === "pc" || section === "ck";
        if (array && !/^(0|[1-9]\d{0,3})$/.test(index)) throw Error("Invalid checklist index.");
        (out[section][id] ||= array ? [] : {})[index] = v;
      } else if (section === "extra" && parts.length === 2 && !MAPS.has(id) && !LISTS.has(id) && !LOCAL.has(id)) out[id] = v;
      else throw Error("Unknown cloud record.");
    }
    // Firestore returns hashed document IDs; keep capture order deterministic across devices.
    out.todo.sort((a, b) => String(a.c || "").localeCompare(String(b.c || "")) || a.id.localeCompare(b.id));
    out.attempts.sort((a, b) => String(a.c || "").localeCompare(String(b.c || "")) || a.id.localeCompare(b.id));
    return out;
  }
  class Model {
    constructor(records = {}, pending = {}, uid = () => crypto.randomUUID()) {
      this.remote = {};
      this.pending = structuredClone(pending);
      this.view = { ...records };
      this.uid = uid;
    }
    // Only changes made on this device enter its durable outbox.
    edit(next) {
      for (const k of new Set([...Object.keys(this.view), ...Object.keys(next)])) {
        const before = this.view[k] ?? null, after = next[k] ?? null;
        if (before !== after) this.pending[k] = { value: after, mutation: this.uid() };
      }
      this.view = { ...next };
    }
    receive(remote, acknowledgements = {}) {
      this.remote = { ...remote };
      this.ack(acknowledgements);
      this.view = { ...remote };
      for (const [k, change] of Object.entries(this.pending)) this.view[k] = change.value;
      for (const k of Object.keys(this.view)) if (this.view[k] === null) delete this.view[k];
      return this.view;
    }
    ack(sent) {
      for (const [k, mutation] of Object.entries(sent)) if (this.pending[k]?.mutation === mutation) delete this.pending[k];
    }
    count() { return Object.keys(this.pending).length; }
  }
  globalThis.AECloudCore = { pack, unpack, Model };
})();
