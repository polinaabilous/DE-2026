"""bus_matrix: turn a BEAM event table (long-form CSV) into a bus matrix, using DuckDB.

Usage:
    python bus_matrix.py data/beam_events.csv

CSV columns: process, fact_table, grain, w, item
    w     who | what | when | where | why | how  (the item is a dimension)
          how many                               (the item is a measure)
Exit code 0 when the checks pass, 1 otherwise.
"""
import sys

import duckdb

DIM_WS = ('who', 'what', 'when', 'where', 'why', 'how')


def load(path):
    con = duckdb.connect()
    con.execute("CREATE TABLE beam AS SELECT * FROM read_csv(?, header = true, all_varchar = true)", [path])
    return con


def checks(con):
    """Problems that make a bus-matrix row unusable."""
    problems = []
    q = {
        'grain must start with "one row per"':
            "SELECT DISTINCT process FROM beam WHERE coalesce(lower(grain), '') NOT LIKE 'one row per %'",
        'no "when": every business event needs a date':
            "SELECT process FROM beam GROUP BY process HAVING count(*) FILTER (WHERE w = 'when') = 0",
        'unknown W (use who, what, when, where, why, how, how many)':
            "SELECT DISTINCT process FROM beam WHERE w NOT IN ('who','what','when','where','why','how','how many')",
        'more than one fact table or grain for one process':
            "SELECT process FROM beam GROUP BY process HAVING count(DISTINCT fact_table) > 1 OR count(DISTINCT grain) > 1",
    }
    for message, sql in q.items():
        for (p,) in con.execute(sql + " ORDER BY 1").fetchall():
            problems.append('%s: %s' % (p, message))
    return problems


def matrix(con):
    dims = con.execute("""
        SELECT item, count(DISTINCT process) AS n_processes
        FROM beam WHERE w <> 'how many'
        GROUP BY item ORDER BY n_processes DESC, item""").fetchall()
    procs = con.execute("""
        SELECT process, any_value(fact_table), any_value(grain),
               list(item ORDER BY item) FILTER (WHERE w = 'how many')
        FROM beam GROUP BY process ORDER BY min(rowid)""").fetchall()
    uses = set(con.execute("SELECT DISTINCT process, item FROM beam WHERE w <> 'how many'").fetchall())
    return dims, procs, uses


def render(dims, procs, uses):
    names = [d for d, _ in dims]
    width = max(len(p) for p, *_ in procs)
    lines = ['Bus matrix: %d processes x %d dimensions (most shared first)' % (len(procs), len(names)), '']
    for k, name in enumerate(names):
        lines.append(' ' * (width + 2) + '| ' * k + name)
    lines.append(' ' * (width + 2) + '| ' * len(names))
    for p, *_ in procs:
        lines.append(p.ljust(width + 2) + ''.join(('x ' if (p, d) in uses else '. ') for d in names))
    shared = ['%s (%d)' % (d, n) for d, n in dims if n > 1]
    lines += ['', 'Conform first (used by 2+ processes): ' + ', '.join(shared), '', 'Grain statements:']
    for p, fact, grain, measures in procs:
        lines.append('  %s: %s; measures: %s' % (fact, grain, ', '.join(measures or ['none (factless)'])))
    return '\n'.join(lines)


def main(argv):
    if len(argv) != 1:
        print(__doc__)
        return 2
    con = load(argv[0])
    print(render(*matrix(con)))
    problems = checks(con)
    print('')
    print('Checks: ' + ('OK' if not problems else 'FAILED'))
    for p in problems:
        print('  - ' + p)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
