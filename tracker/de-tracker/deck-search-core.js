// Pure local retrieval over public study passages. No network, generated answers or user state.
globalThis.AEDeckSearch = (() => {
  const STOP = new Set(('a an and are as at be been being between but by can could difference differences do does for from had has have how i if in into is it its me my of on or our should so than that the their them then there these they this those to use used using versus vs was were what when where which why will with would you your s').split(' '));
  const normalize = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const stem = word => /^recurs(?:ion|ive|e)?$/.test(word) ? 'recursive' : word.length > 5 && word.endsWith('ies') ? word.slice(0, -3) + 'y' : word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
  const tokens = value => (normalize(value).replace(/\brow\s+number\b/g, 'row_number').match(/[\p{L}\p{N}]+(?:_[\p{L}\p{N}]+)*/gu) || []).map(stem).filter(t => !STOP.has(t));
  function oneEdit(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length >= b.length) i++;
      if (b.length >= a.length) j++;
    }
    return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
  }
  function createIndex(data) {
    if (data.version !== 1 || !Array.isArray(data.sources) || !Array.isArray(data.passages)) throw Error('Invalid study search index.');
    const sources = new Map(data.sources.map(s => [s.id, s]));
    const frequency = new Map();
    const docs = data.passages.map(p => {
      const source = sources.get(p.source); if (!source) throw Error('Unknown study source.');
      const body = tokens(p.text), counts = new Map();
      const add = (words, weight) => words.forEach(t => counts.set(t, (counts.get(t) || 0) + weight));
      add(body, 1); add(tokens(p.heading), 4); add(tokens(source.title), 1.5);
      counts.forEach((_, t) => frequency.set(t, (frequency.get(t) || 0) + 1));
      return { ...p, source, counts, headingTerms: new Set(tokens(p.heading)), length: Math.max(body.length, 1) };
    });
    const vocabulary = [...frequency.keys()], avg = docs.reduce((n, d) => n + d.length, 0) / Math.max(docs.length, 1);
    function search(query, limit = 12) {
      const terms = [...new Set(tokens(String(query).slice(0, 240)))].slice(0, 12);
      if (!terms.length) return { results: [], total: 0, terms };
      const groups = terms.map(t => {
        if (frequency.has(t)) return [t];
        const prefix = t.length >= 3 ? vocabulary.filter(v => v.startsWith(t)).slice(0, 12) : [];
        return prefix.length ? prefix : t.length >= 5 ? vocabulary.filter(v => oneEdit(t, v)).slice(0, 8) : [];
      });
      const hits = [];
      for (const doc of docs) {
        let score = 0, matched = 0;
        for (const group of groups) {
          let best = 0;
          for (const term of group) {
            const count = doc.counts.get(term) || 0;
            if (!count) continue;
            const df = frequency.get(term), idf = Math.log(1 + (docs.length - df + .5) / (df + .5));
            best = Math.max(best, idf * count * 2.2 / (count + 1.2 * (.25 + .75 * doc.length / avg)));
          }
          if (best) { matched++; score += best; }
        }
        if (matched < Math.ceil(terms.length * .6)) continue;
        const headingMatches = groups.filter(group => group.some(t => doc.headingTerms.has(t))).length;
        score += headingMatches * headingMatches * 1.7;
        if (terms.length > 1 && headingMatches === terms.length) score += 10;
        hits.push({ ...doc, score, matched });
      }
      hits.sort((a, b) => b.matched - a.matched || b.score - a.score || a.source.id.localeCompare(b.source.id));
      const shown = [], perSource = new Map(), sections = new Set();
      for (const hit of hits) {
        const section = hit.source.id + '|' + (hit.anchor || hit.heading);
        if (sections.has(section)) continue;
        if ((perSource.get(hit.source.id) || 0) >= 3) continue;
        sections.add(section);
        shown.push(hit); perSource.set(hit.source.id, (perSource.get(hit.source.id) || 0) + 1);
        if (shown.length >= limit) break;
      }
      return { results: shown, total: hits.length, terms: [...new Set(groups.flat())] };
    }
    return { search, sourceCount: sources.size, passageCount: docs.length };
  }
  function excerpt(text, terms, length = 280) {
    const flat = String(text).replace(/\s+/g, ' ').trim();
    const lower = normalize(flat), positions = terms.map(t => lower.indexOf(t)).filter(i => i >= 0);
    const first = positions.length ? Math.min(...positions) : 0;
    let start = Math.max(0, first - 65);
    if (start) { const space = flat.indexOf(' ', start); if (space < start + 30) start = space + 1; }
    return (start ? '… ' : '') + flat.slice(start, start + length) + (start + length < flat.length ? ' …' : '');
  }
  return Object.freeze({ createIndex, excerpt, tokens });
})();
