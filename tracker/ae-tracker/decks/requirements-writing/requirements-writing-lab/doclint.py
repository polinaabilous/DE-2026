"""doclint: small, opinionated checks for requirement and design documents written in Markdown.

Usage:
    python doclint.py KIND PATH [PATH ...]

    KIND  intake | definition | spec | design | adr | pr | readme | status | auto
    PATH  a Markdown file, or a folder (every *.md file inside is checked)

With KIND=auto the kind comes from the file name: intake-*.md, definition-*.md, spec-*.md,
design-*.md, adr-*.md, pr-*.md, status-*.md and README.md / readme-*.md.
Exit code 0 when every file passes, 1 when any file has a problem.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Words that hide a decision. Each one needs a number, a list or a definition instead.
VAGUE = [
    (r'\basap\b', 'name a date and a time zone'),
    (r'\bsoon\b', 'name a date'),
    (r'\breal[- ]?time\b', 'state the maximum data delay, e.g. "at most 15 minutes old"'),
    (r'\b(quickly|fast)\b', 'give a number (seconds, hours, days)'),
    (r'\brecent(ly)?\b', 'give the window, e.g. "the last 28 complete days"'),
    (r'\blast (week|month)\b', 'calendar or rolling? e.g. "calendar week Mon-Sun, America/Chicago"'),
    (r'\bactive\b', 'say which action, by whom, in which window makes a unit active'),
    (r'\bengage(d|ment)\b', 'name the event that counts'),
    (r'\betc\b|\band so on\b', 'list every item, or say "only these"'),
    (r'\b(various|several)\b', 'name them or give a number'),
]

REQUIRED = {
    'intake': ['question', 'decision', 'grain', 'deadline', 'owner', 'acceptance criteria', 'out of scope'],
    'definition': ['definition', 'includes', 'excludes', 'unit', 'time', 'source', 'owner', 'examples'],
    'spec': ['definition', 'decision', 'owner', 'population', 'grain', 'numerator', 'denominator',
             'time window', 'exclusions', 'missing data'],
    'design': ['context', 'goals', 'non-goals', 'proposal', 'alternatives', 'risks', 'test and rollout',
               'open questions'],
    'adr': ['status', 'context', 'decision', 'consequences'],
    'pr': ['what and why', 'how it was validated', 'impact', 'rollback', 'checklist'],
    'readme': ['quickstart', 'expected output', 'project layout', 'tests', 'data sources', 'decisions',
               'troubleshooting'],
    'status': ['status', 'done', 'next', 'risks', 'asks', 'next update'],
}

ISO_DATE = re.compile(r'\b\d{4}-\d{2}-\d{2}\b')
FENCE = re.compile(r'^```.*?^```[ \t]*$', re.S | re.M)


def strip_noise(text: str) -> str:
    """Remove what the vague-word check must ignore: code, comments, quotes of other people."""
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    text = FENCE.sub('', text)
    text = re.sub(r'`[^`\n]*`', '', text)
    text = re.sub(r'"[^"\n]*"|\u201c[^\u201d\n]*\u201d', '', text)
    return '\n'.join(line for line in text.splitlines() if not line.lstrip().startswith('>'))


def sections(text: str) -> dict[str, str]:
    """Map each '## Heading' (lower case) to the text under it."""
    out, current = {}, None
    for line in text.splitlines():
        m = re.match(r'^##\s+(.+?)\s*$', line)
        if m:
            current = m.group(1).strip().lower()
            out[current] = ''
        elif re.match(r'^#\s', line):
            current = None
        elif current is not None:
            out[current] += line + '\n'
    return out


def find(secs: dict[str, str], key: str) -> str | None:
    for title, body in secs.items():
        if title.startswith(key):
            return body
    return None


def bullets(body: str) -> list[str]:
    return [l.strip()[2:].strip() for l in body.splitlines() if re.match(r'^\s*[-*] ', l)]


def first_fence(body: str) -> list[str] | None:
    m = re.search(r'^```[^\n]*\n(.*?)^```', body, re.S | re.M)
    return None if m is None else m.group(1).splitlines()


def vague_terms(text: str) -> list[tuple[str, str]]:
    found, clean = [], strip_noise(text)
    for pattern, advice in VAGUE:
        for m in re.finditer(pattern, clean, re.I):
            found.append((m.group(0), advice))
    return found


def lint(kind: str, text: str) -> list[str]:
    """Return a list of problems; an empty list means the document passes."""
    problems = []
    no_comments = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    for ph in re.findall(r'<(?!https?:)[a-zA-Z][^<>\n]*>', FENCE.sub('', no_comments)):
        problems.append('placeholder left: ' + ph)
    for ph in re.findall(r'<(?!https?:)[a-zA-Z][^<>\n]*>', ''.join(FENCE.findall(no_comments))):
        problems.append('placeholder left in a code block: ' + ph)
    secs = {k: re.sub(r'<!--.*?-->', '', v, flags=re.S) for k, v in sections(text).items()}
    for key in REQUIRED[kind]:
        body = find(secs, key)
        if body is None:
            problems.append('missing section: ' + key)
        elif not body.strip():
            problems.append('empty section: ' + key)
    for term, advice in vague_terms(text):
        problems.append('vague: "%s" -> %s' % (term, advice))
    problems += RULES.get(kind, lambda t, s: [])(text, secs)
    return problems


# ---------- rules per document kind ----------
def _intake(text, secs):
    p = []
    q = (find(secs, 'question') or '').strip()
    if q and not q.endswith('?'):
        p.append('question: write one question that ends with "?"')
    if (find(secs, 'grain') or '').strip() and 'one row per' not in find(secs, 'grain').lower():
        p.append('grain: say "one row per ..."')
    d = find(secs, 'deadline') or ''
    if d.strip() and not ISO_DATE.search(d):
        p.append('deadline: give a date as YYYY-MM-DD')
    ac = bullets(find(secs, 'acceptance criteria') or '')
    if find(secs, 'acceptance criteria') is not None and len(ac) < 2:
        p.append('acceptance criteria: list at least 2 checks')
    if ac and not any(re.search(r'\d', b) for b in ac):
        p.append('acceptance criteria: at least one check needs an expected number')
    if find(secs, 'out of scope') is not None and not bullets(find(secs, 'out of scope')):
        p.append('out of scope: list what this version will not do')
    return p


def _definition(text, secs):
    ex = find(secs, 'examples') or ''
    return [] if 'non-example' in ex.lower() else ['examples: add at least one non-example']


def _spec(text, secs):
    g = find(secs, 'grain') or ''
    return ['grain: say "one row per ..."'] if g.strip() and 'one row per' not in g.lower() else []


def _design(text, secs):
    p = []
    words = len(re.findall(r"[A-Za-z0-9][\w'-]*", strip_noise(text)))
    if words > 700:
        p.append('longer than one page: %d words (limit 700); link details instead' % words)
    if find(secs, 'alternatives') is not None and len(bullets(find(secs, 'alternatives'))) < 2:
        p.append('alternatives: list at least 2 (include "do nothing" or the simplest option)')
    if find(secs, 'non-goals') is not None and not bullets(find(secs, 'non-goals')):
        p.append('non-goals: list at least one thing this design will not do')
    return p


def _adr(text, secs):
    p = []
    if not re.search(r'^# ADR-\d{4}: \S', text, re.M):
        p.append('title: use "# ADR-NNNN: <decision>"')
    st = (find(secs, 'status') or '').strip()
    if st and not re.match(r'(Proposed|Accepted|Rejected|Deprecated|Superseded by ADR-\d{4})\b', st):
        p.append('status: Proposed, Accepted, Rejected, Deprecated or Superseded by ADR-NNNN')
    c = (find(secs, 'consequences') or '').lower()
    for side in ('easier', 'harder'):
        if c.strip() and not re.search(r'\b' + side + r'\b\**:\**\s*\S', c):
            p.append('consequences: say what becomes %s ("%s: ...")' % (side, side.capitalize()))
    return p


def _pr(text, secs):
    p = []
    m = re.search(r'^# (.+)$', text, re.M)
    title = m.group(1).strip() if m else ''
    if not title:
        p.append('title: start with "# <verb> <what> <why>"')
    elif len(title) > 72:
        p.append('title: %d characters (limit 72)' % len(title))
    elif len(title.split()) < 4 or title.lower().split()[0] in {'update', 'updates', 'changes', 'wip', 'misc', 'fix'}:
        p.append('title: too generic; say what changed and why')
    v = find(secs, 'how it was validated') or ''
    if v.strip() and not re.search(r'`|\d', v):
        p.append('validation: show a command, a test name or a number')
    unticked = re.findall(r'^\s*- \[ \]', find(secs, 'checklist') or '', re.M)
    if unticked:
        p.append('checklist: %d unticked item(s)' % len(unticked))
    return p


def _readme(text, secs):
    p = []
    m = re.search(r'^# .+\n+(.+)', text, re.M)
    first = m.group(1).strip() if m else ''
    if not first or first.startswith('#'):
        p.append('purpose: put one sentence under the title saying what this is and who it is for')
    elif len(first.split()) > 40:
        p.append('purpose: first sentence has %d words (limit 40)' % len(first.split()))
    q = find(secs, 'quickstart')
    if q is not None:
        cmds = [l for l in (first_fence(q) or []) if l.strip() and not l.strip().startswith('#')]
        if not cmds:
            p.append('quickstart: add the commands in a code block')
        elif len(cmds) > 5:
            p.append('quickstart: %d commands (limit 5); script the rest' % len(cmds))
    e = find(secs, 'expected output')
    if e is not None and first_fence(e) is None:
        p.append('expected output: paste what a successful run prints, in a code block')
    return p


def _status(text, secs):
    p = []
    st = (find(secs, 'status') or '').strip()
    m = re.match(r'(On track|At risk|Off track)\b', st)
    if st and not m:
        p.append('status: start with On track, At risk or Off track')
    if m and m.group(1) != 'On track' and not re.search(r'new date|option', text, re.I):
        p.append('status is %s: give a new date or options to choose from' % m.group(1))
    nu = find(secs, 'next update') or ''
    if nu.strip() and not ISO_DATE.search(nu):
        p.append('next update: give a date as YYYY-MM-DD')
    return p


RULES = {'intake': _intake, 'definition': _definition, 'spec': _spec, 'design': _design,
         'adr': _adr, 'pr': _pr, 'readme': _readme, 'status': _status}


def kind_from_name(path: Path) -> str | None:
    name = path.name.lower()
    if name == 'readme.md':
        return 'readme'
    for k in REQUIRED:
        if name.startswith(k + '-'):
            return k
    return None


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[0] not in list(REQUIRED) + ['auto']:
        print(__doc__)
        return 2
    kind, failed = argv[0], 0
    files = []
    for a in argv[1:]:
        p = Path(a)
        files += sorted(p.glob('*.md')) if p.is_dir() else [p]
    for f in files:
        k = kind if kind != 'auto' else kind_from_name(f)
        if k is None:
            print('SKIP %s (kind unknown from the file name)' % f.as_posix())
            continue
        problems = lint(k, f.read_text(encoding='utf-8'))
        print('%s %s (%s)' % ('FAIL' if problems else 'PASS', f.as_posix(), k))
        for pr in problems:
            print('  - ' + pr)
        failed += bool(problems)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
