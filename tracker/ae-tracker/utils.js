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
