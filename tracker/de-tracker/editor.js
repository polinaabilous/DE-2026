// Shared Markdown rendering and text editing for notes and daily logs.
globalThis.AEEditor = (() => {
  const { esc } = globalThis.AEUtils;
  const NOTE_FORMAT = { bold: "**", italic: "*", code: "`" };
  const MOD = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || "") ? "⌘" : "Ctrl+";
  const safeLink = value => /^(?:https?:\/\/|mailto:)[^\s<>"'`]+$/i.test(value);
  function linkEnd(text, start) {
    let depth = 1;
    for (let i = start; i < text.length && text[i] !== "\n"; i++) {
      if (text[i] === "(") depth++;
      if (text[i] === ")" && --depth === 0) return i;
    }
    return -1;
  }
  function inl(value, links = true) {
    const text = String(value || ""), tokens = /[`*\[]|https?:\/\//gi;
    let out = "", cursor = 0, token;
    while ((tokens.lastIndex = cursor, token = tokens.exec(text))) {
      const at = token.index, rest = text.slice(at);
      out += esc(text.slice(cursor, at));
      const code = rest.match(/^`([^`\n]+)`/);
      if (code) { out += `<code>${esc(code[1])}</code>`; cursor = at + code[0].length; continue; }
      const format = rest.match(/^\*\*\*([^*]+)\*\*\*|^\*\*([^*]+)\*\*|^\*([^*\n]+)\*/);
      if (format) {
        const inner = inl(format[1] ?? format[2] ?? format[3], links);
        out += format[1] !== undefined ? `<b><em>${inner}</em></b>` : format[2] !== undefined ? `<b>${inner}</b>` : `<em>${inner}</em>`;
        cursor = at + format[0].length; continue;
      }
      const label = links && rest.match(/^\[([^\]\n]+)\]\(/);
      if (label) {
        const start = at + label[0].length, end = linkEnd(text, start);
        if (end >= 0) {
          const url = text.slice(start, end).trim();
          out += safeLink(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inl(label[1], false)}</a>` : esc(text.slice(at, end + 1));
          cursor = end + 1; continue;
        }
      }
      const bare = links && rest.match(/^https?:\/\/[^\s<>"'`]+/i);
      if (bare) {
        let url = bare[0].replace(/[.,;:!?]+$/, "");
        for (const [open, close] of [["(", ")"], ["[", "]"]]) {
          while (url.endsWith(close) && url.split(close).length > url.split(open).length) url = url.slice(0, -1);
        }
        out += `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
        cursor = at + url.length; continue;
      }
      out += esc(token[0]); cursor = at + token[0].length;
    }
    return out + esc(text.slice(cursor));
  }
  function formatLink(ta) {
    if (!ta) return;
    const from = ta.selectionStart, to = ta.selectionEnd, selected = ta.value.slice(from, to);
    const urlSelected = safeLink(selected), label = urlSelected ? "link text" : selected || "link text";
    const url = urlSelected ? selected : "https://", replacement = `[${label}](${url})`;
    const selectFrom = from + (urlSelected ? 1 : label.length + 3);
    replaceEditorText(ta, replacement, from, to, selectFrom, selectFrom + (urlSelected ? label.length : url.length));
  }
  function formatNote(ta, mark) {
    if (!ta || !mark) return;
    const value = ta.value, start = ta.selectionStart, end = ta.selectionEnd;
    const selected = value.slice(start, end), scroll = ta.scrollTop;
    let from = start, to = end, replacement, selectFrom, selectTo;
    const beforeStars = (value.slice(0, start).match(/\*+$/) || [""])[0].length;
    const afterStars = (value.slice(end).match(/^\*+/) || [""])[0].length;
    const around = start >= mark.length && value.slice(start - mark.length, start) === mark &&
      value.slice(end, end + mark.length) === mark &&
      (mark !== "*" || (beforeStars % 2 === 1 && afterStars % 2 === 1));
    const wrapped = line => line.length >= 2 * mark.length && line.startsWith(mark) && line.endsWith(mark) &&
      (mark !== "*" || (!line.startsWith("**") && !line.endsWith("**")) || (line.startsWith("***") && line.endsWith("***")));
    if (selected.includes("\n")) {
      const lines = selected.split("\n"), nonempty = lines.filter(l => l.trim());
      const remove = nonempty.length > 0 && nonempty.every(wrapped);
      replacement = lines.map(l => !l.trim() ? l : remove ? l.slice(mark.length, -mark.length) : mark + l + mark).join("\n");
      selectFrom = from; selectTo = from + replacement.length;
    } else if (around) {
      from -= mark.length; to += mark.length; replacement = selected;
      selectFrom = from; selectTo = from + selected.length;
    } else if (wrapped(selected)) {
      replacement = selected.slice(mark.length, -mark.length);
      selectFrom = from; selectTo = from + replacement.length;
    } else {
      replacement = mark + selected + mark;
      selectFrom = from + mark.length; selectTo = selectFrom + selected.length;
    }
    replaceEditorText(ta, replacement, from, to, selectFrom, selectTo, scroll);
  }
  function replaceEditorText(ta, replacement, from, to, selectFrom, selectTo, scroll = ta.scrollTop) {
    ta.focus({ preventScroll: true }); ta.setSelectionRange(from, to);
    let inserted = false;
    try { inserted = typeof document.execCommand === "function" && document.execCommand("insertText", false, replacement); } catch { }
    if (!inserted) ta.setRangeText(replacement, from, to, "end");
    ta.setSelectionRange(selectFrom, selectTo); ta.scrollTop = scroll;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const LIST_LINE = /^([ \t]*)([-*+]|\d+[.)])\s+(.*)$/;
  function listRange(ta) {
    const { value, selectionStart: start, selectionEnd: end } = ta;
    const from = start ? value.lastIndexOf("\n", start - 1) + 1 : 0;
    const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const next = value.indexOf("\n", last), to = next < 0 ? value.length : next;
    return { from, to, lines: value.slice(from, to).split("\n") };
  }
  function formatList(ta, ordered) {
    if (!ta) return;
    const { from, to, lines } = listRange(ta), start = ta.selectionStart, end = ta.selectionEnd;
    const nonempty = lines.filter(l => l.trim());
    const remove = nonempty.length > 0 && nonempty.every(l => { const m = l.match(LIST_LINE); return m && /^\d/.test(m[2]) === ordered; });
    let count = 0;
    const result = lines.map(line => {
      if (!line.trim() && lines.length > 1) return line;
      const m = line.match(LIST_LINE), indent = m ? m[1] : line.match(/^[ \t]*/)[0], text = m ? m[3] : line.slice(indent.length);
      return indent + (remove ? "" : ordered ? `${++count}. ` : "- ") + text;
    }).join("\n");
    const caret = Math.max(from, Math.min(from + result.length, start + result.length - (to - from)));
    replaceEditorText(ta, result, from, to, start === end ? caret : from, start === end ? caret : from + result.length);
  }
  function continueList(ta) {
    if (ta.selectionStart !== ta.selectionEnd) return false;
    const { from, to, lines } = listRange(ta), m = lines[0].match(LIST_LINE);
    if (!m) return false;
    if (!m[3].trim()) { replaceEditorText(ta, "", from, to, from, from); return true; }
    if (ta.selectionStart < from + m[1].length + m[2].length + 1) return false;
    const marker = /^\d/.test(m[2]) ? `${parseInt(m[2], 10) + 1}${m[2].slice(-1)}` : m[2];
    const next = `\n${m[1]}${marker} `, pos = ta.selectionStart;
    replaceEditorText(ta, next, pos, pos, pos + next.length, pos + next.length); return true;
  }
  function indentList(ta, outdent) {
    const { from, to, lines } = listRange(ta);
    if (!lines.some(l => LIST_LINE.test(l)) || lines.some(l => l.trim() && !LIST_LINE.test(l))) return false;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const result = lines.map(l => !l.trim() ? l : outdent ? l.replace(/^(?:\t| {1,2})/, "") : "  " + l).join("\n");
    const caret = Math.max(from, Math.min(from + result.length, start + result.length - (to - from)));
    replaceEditorText(ta, result, from, to, start === end ? caret : from, start === end ? caret : from + result.length); return true;
  }
  function mdBlock(s) {
    const item = line => {
      const m = line.match(LIST_LINE);
      return m && { indent: m[1].replace(/\t/g, "  ").length, ordered: /^\d/.test(m[2]), number: parseInt(m[2], 10), text: m[3] };
    };
    function list(lines, start) {
      const first = item(lines[start]), tag = first.ordered ? "ol" : "ul";
      let out = `<${tag}${first.ordered && first.number !== 1 ? ` start="${first.number}"` : ""}>`, i = start;
      while (i < lines.length) {
        const current = item(lines[i]);
        if (!current || current.indent !== first.indent || current.ordered !== first.ordered) break;
        out += `<li>${inl(current.text)}`; i++;
        while (i < lines.length && item(lines[i])?.indent > first.indent) {
          const [nested, next] = list(lines, i); out += nested; i = next;
        }
        out += "</li>";
      }
      return [out + `</${tag}>`, i];
    }
    return String(s || "").split(/(```[^\n]*\n[\s\S]*?\n```)/).map(p => {
      const f = p.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
      if (f) return `<pre class="code"><code>${esc(f[1])}</code></pre>`;
      const lines = p.split("\n"); let out = "", i = 0;
      while (i < lines.length) {
        if (!lines[i].trim()) { i++; continue; }
        if (item(lines[i])) { const [html, next] = list(lines, i); out += html; i = next; continue; }
        const paragraph = [];
        while (i < lines.length && lines[i].trim() && !item(lines[i])) paragraph.push(inl(lines[i++]));
        out += `<p>${paragraph.join("<br>")}</p>`;
      }
      return out;
    }).join("");
  }
  function formatToolbar(label = "Text formatting") {
    return `<div class="nformat" role="group" aria-label="${esc(label)}">
        <button type="button" class="btn sm" data-note-format="bold" title="Bold (${MOD}B)" aria-label="Bold"><b>B</b></button>
        <button type="button" class="btn sm" data-note-format="italic" title="Italic (${MOD}I)" aria-label="Italic"><em>I</em></button>
        <button type="button" class="btn sm mono" data-note-format="code" title="Inline code (${MOD}E)" aria-label="Inline code">&lt;/&gt;</button>
        <button type="button" class="btn sm" data-note-format="link" title="Insert link (${MOD}K)" aria-label="Insert link">↗ Link</button>
        <span class="toolbar-sep" aria-hidden="true"></span>
        <button type="button" class="btn sm list-button" data-list="bullet" title="Bulleted list" aria-label="Bulleted list">• List</button>
        <button type="button" class="btn sm list-button" data-list="number" title="Numbered list" aria-label="Numbered list">1. List</button>
      </div>`;
  }
  return Object.freeze({ NOTE_FORMAT, MOD, formatNote, formatLink, formatList, continueList, indentList, inl, mdBlock, formatToolbar });
})();
