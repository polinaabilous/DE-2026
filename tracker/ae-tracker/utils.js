// Shared text, date, identity and browser helpers.
globalThis.AEUtils = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = name => {
    const paths = {
      edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/>',
      trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
      moon: '<path d="M20 14a8.5 8.5 0 0 1-10-10 9 9 0 1 0 10 10Z"/>',
      arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/>',
      box: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V3h8v3M3 12h18M10 12v3h4v-3"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>',
      slides: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
      map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
      doc: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
      play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
      code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 6l-2 12"/>',
      cap: '<path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
      mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12h.01"/>',
      wrench: '<path d="M14 6a4 4 0 0 0 5 5l-8 8a2 2 0 0 1-3-3l8-8a4 4 0 0 0-2-2Z"/>',
      users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .5 3 2 3 5"/>',
      pause: '<path d="M8 5v14M16 5v14"/>',
      dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01"/>',
    };
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
  };
  const md = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  const pct = v => Math.round(v * 100) + "%";

  function dl(text, name, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const pad = n => String(n).padStart(2, "0");
  const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const uid = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "notes";
  const oneLine = s => String(s || "").replace(/\s*\n\s*/g, " ").trim();
  const norm = t => String(t ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  return Object.freeze({ $, esc, icon, md, pct, dl, today, uid, slug, oneLine, norm });
})();
