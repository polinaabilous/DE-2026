"""Reference solution for the Leafy Box scorecards. Compare with your scorecard.py only after trying."""
import os

import duckdb

LAB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(LAB, 'leafy_box.duckdb')
LAST_MONTH = "DATE '2026-03-01'"          # last complete billing month
CUTOFF = "TIMESTAMP '2026-04-01'"         # data complete up to here (end of Q1 2026)


def connect(path=DB):
    return duckdb.connect(path)


def _rows(con, sql):
    cur = con.execute(sql)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _base_views(con):
    con.execute("""
        CREATE OR REPLACE TEMP VIEW box_margin AS
        SELECT b.customer_id, c.channel, date_trunc('month', c.signup_date)::DATE AS cohort_month, b.bill_month,
               date_diff('month', date_trunc('month', c.signup_date), b.bill_month) AS month_index,
               b.list_price, b.revenue - b.refund AS net_revenue,
               b.revenue - b.refund - b.product_cost - b.shipping_cost - b.payment_fee AS contribution
        FROM billing b JOIN customers c USING (customer_id)
        WHERE b.status = 'paid' AND NOT c.is_test;

        CREATE OR REPLACE TEMP VIEW incident_clock AS
        SELECT i.*, a.asset_name,
               date_diff('minute', i.started_at, i.mitigated_at) / 60 AS hours_to_recover,
               date_diff('minute', i.detected_at, i.resolved_at) / 60 AS hours_to_resolve
        FROM incidents i JOIN assets a USING (asset_id)
        WHERE i.merged_into IS NULL;
    """)


def channel_scorecard(con):
    """One row per paid channel: MRR -> ARPA -> formula LTV, cohort LTV, CAC, LTV/CAC and payback."""
    _base_views(con)
    return _rows(con, """
    WITH spend AS (SELECT channel, SUM(spend) AS spend FROM marketing_spend GROUP BY channel),
    acquired AS (
        SELECT channel, date_trunc('month', signup_date)::DATE AS cohort_month, COUNT(*) AS customers
        FROM customers WHERE NOT is_test GROUP BY ALL),
    cac AS (
        SELECT a.channel, SUM(a.customers) AS new_customers, MAX(s.spend) AS spend,
               MAX(s.spend) / SUM(a.customers) AS cac
        FROM acquired a JOIN spend s USING (channel) GROUP BY a.channel),
    months AS (
        SELECT *, LEAD(bill_month) OVER (PARTITION BY customer_id ORDER BY bill_month) AS next_bill_month
        FROM box_margin),
    formula AS (
        SELECT channel,
               SUM(list_price) FILTER (WHERE bill_month = """ + LAST_MONTH + """) AS mrr,
               AVG(list_price) FILTER (WHERE bill_month = """ + LAST_MONTH + """) AS arpa,
               SUM(contribution) FILTER (WHERE month_index > 0 AND bill_month >= DATE '2025-10-01')
                 / SUM(net_revenue) FILTER (WHERE month_index > 0 AND bill_month >= DATE '2025-10-01') AS cm_pct,
               AVG(CASE WHEN next_bill_month = bill_month + INTERVAL 1 MONTH THEN 0 ELSE 1 END)
                 FILTER (WHERE bill_month BETWEEN DATE '2025-09-01' AND DATE '2026-02-01') AS monthly_churn
        FROM months GROUP BY channel),
    eligible AS (
        SELECT a.*, h.k FROM acquired a CROSS JOIN (SELECT UNNEST(range(0, 15)) AS k) h
        WHERE a.cohort_month + to_months(h.k::INTEGER) <= """ + LAST_MONTH + """),
    cum AS (
        SELECT e.channel, e.k, e.cohort_month, e.customers, COALESCE(SUM(b.contribution), 0) AS cm
        FROM eligible e LEFT JOIN box_margin b
          ON b.channel = e.channel AND b.cohort_month = e.cohort_month AND b.month_index <= e.k
        GROUP BY ALL),
    ltv AS (SELECT channel, k, SUM(cm) / SUM(customers) AS ltv FROM cum GROUP BY channel, k)
    SELECT c.channel, c.new_customers, c.spend, ROUND(c.cac, 2) AS cac,
           f.mrr, ROUND(f.arpa, 2) AS arpa, ROUND(f.cm_pct, 4) AS cm_pct, ROUND(f.monthly_churn, 4) AS monthly_churn,
           ROUND(f.arpa * f.cm_pct / f.monthly_churn, 2)                AS formula_ltv,
           ROUND(MAX(l.ltv) FILTER (WHERE l.k = 5), 2)                   AS ltv_6m,
           ROUND(MAX(l.ltv) FILTER (WHERE l.k = 11), 2)                  AS ltv_12m,
           ROUND(MAX(l.ltv) FILTER (WHERE l.k = 11) / c.cac, 2)          AS ltv12_to_cac,
           MIN(l.k) FILTER (WHERE l.ltv >= c.cac) + 1                    AS payback_months
    FROM cac c JOIN formula f USING (channel) JOIN ltv l USING (channel)
    GROUP BY c.channel, c.new_customers, c.spend, c.cac, f.mrr, f.arpa, f.cm_pct, f.monthly_churn
    ORDER BY ltv12_to_cac DESC""")


def ops_scorecard(con):
    """One row per asset for Q1 2026: incidents, MTTR, MTBF, availability, SLA attainment."""
    _base_views(con)
    return _rows(con, """
    WITH d AS (
        SELECT c.asset_id, COUNT(*) AS failures,
               COUNT(*) FILTER (WHERE c.resolved_at IS NULL) AS open_incidents,
               SUM(date_diff('second', c.started_at, LEAST(COALESCE(c.mitigated_at, """ + CUTOFF + """), """ + CUTOFF + """))) / 3600 AS down_h,
               MEDIAN(c.hours_to_recover) AS median_recover_h,
               COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL AND c.hours_to_resolve <= t.target_hours) AS met,
               COUNT(*) FILTER (WHERE (c.resolved_at IS NOT NULL AND c.hours_to_resolve > t.target_hours)
                                   OR (c.resolved_at IS NULL
                                       AND date_diff('minute', c.detected_at, """ + CUTOFF + """) / 60 > t.target_hours)) AS breached
        FROM incident_clock c JOIN sla_targets t USING (severity)
        GROUP BY c.asset_id)
    SELECT a.asset_name,
           COALESCE(d.failures, 0) AS failures,
           COALESCE(d.open_incidents, 0) AS open_incidents,
           ROUND(d.down_h / NULLIF(d.failures, 0), 2) AS mttr_recover_h,
           ROUND(d.median_recover_h, 2) AS median_recover_h,
           ROUND((2160 - COALESCE(d.down_h, 0)) / NULLIF(d.failures, 0), 1) AS mtbf_h,
           ROUND(1 - COALESCE(d.down_h, 0) / 2160, 4) AS availability,
           ROUND(d.met / NULLIF(d.met + d.breached, 0), 3) AS sla_attainment
    FROM assets a LEFT JOIN d USING (asset_id)
    ORDER BY availability, a.asset_name""")


def checkout_slo(con, slo=0.995):
    """Monthly availability of web_checkout against an SLO, with outages clipped to month boundaries."""
    return _rows(con, """
    WITH months AS (
        SELECT m AS m_start, m + INTERVAL 1 MONTH AS m_end
        FROM (SELECT UNNEST(generate_series(TIMESTAMP '2026-01-01', TIMESTAMP '2026-03-01', INTERVAL 1 MONTH)) AS m)),
    pieces AS (
        SELECT mo.m_start,
               date_diff('second', GREATEST(i.started_at, mo.m_start),
                         LEAST(COALESCE(i.mitigated_at, """ + CUTOFF + """), mo.m_end)) / 60 AS down_min
        FROM months mo
        JOIN (SELECT i.* FROM incidents i JOIN assets a USING (asset_id)
              WHERE a.asset_name = 'web_checkout' AND i.merged_into IS NULL) i
          ON i.started_at < mo.m_end AND COALESCE(i.mitigated_at, """ + CUTOFF + """) > mo.m_start)
    SELECT mo.m_start::DATE AS month,
           ROUND(1 - COALESCE(SUM(p.down_min), 0) / date_diff('minute', mo.m_start, mo.m_end), 5) AS availability,
           ROUND(COALESCE(SUM(p.down_min), 0) / ((1 - %s) * date_diff('minute', mo.m_start, mo.m_end)), 2) AS budget_used,
           availability >= %s AS slo_met
    FROM months mo LEFT JOIN pieces p USING (m_start)
    GROUP BY mo.m_start, mo.m_end
    ORDER BY month""" % (slo, slo))


def flow_scorecard(con):
    """March 2026 warehouse flow: throughput, productivity, cycle time, and a Little's law check."""
    return _rows(con, """
    WITH days AS (SELECT UNNEST(generate_series(DATE '2026-03-01', DATE '2026-03-31', INTERVAL 1 DAY))::DATE AS day),
    shipped AS (SELECT shipped_at::DATE AS day, COUNT(*) AS boxes FROM box_jobs WHERE shipped_at IS NOT NULL GROUP BY 1),
    daily AS (SELECT d.day, COALESCE(s.boxes, 0) AS boxes, COALESCE(h.labour_hours, 0) AS labour_hours
              FROM days d LEFT JOIN shipped s USING (day) LEFT JOIN shifts h ON h.work_day = d.day),
    jobs AS (SELECT released_at, COALESCE(shipped_at, """ + CUTOFF + """) AS left_at FROM box_jobs),
    hours AS (SELECT UNNEST(generate_series(TIMESTAMP '2026-03-01 00:30', TIMESTAMP '2026-03-31 23:30', INTERVAL 1 HOUR)) AS h),
    wip AS (SELECT h, COUNT(j.released_at) AS n FROM hours LEFT JOIN jobs j ON j.released_at <= h AND j.left_at > h GROUP BY h)
    SELECT (SELECT SUM(boxes) FROM daily) AS boxes_shipped,
           (SELECT ROUND(SUM(boxes) / COUNT(*) FILTER (WHERE labour_hours > 0), 1) FROM daily) AS per_working_day,
           (SELECT ROUND(SUM(boxes) / SUM(labour_hours), 3) FROM daily) AS boxes_per_labour_hour,
           (SELECT ROUND(AVG(date_diff('second', released_at, left_at) / 3600), 1) FROM jobs) AS avg_cycle_h,
           (SELECT ROUND(COUNT(*) / 744.0 * AVG(date_diff('second', released_at, left_at) / 3600), 1) FROM jobs) AS little_wip,
           (SELECT ROUND(AVG(n), 1) FROM wip) AS measured_wip""")[0]


def _print(title, rows):
    rows = rows if isinstance(rows, list) else [rows]
    cols = list(rows[0])
    width = {c: max(len(c), *(len(str(r[c])) for r in rows)) for c in cols}
    print(title)
    print('  ' + '  '.join(c.rjust(width[c]) for c in cols))
    for r in rows:
        print('  ' + '  '.join(str(r[c]).rjust(width[c]) for c in cols))
    print()


def main():
    con = connect()
    sc = channel_scorecard(con)
    _print('Channel scorecard', [{k: r[k] for k in ('channel', 'cac', 'mrr', 'arpa', 'formula_ltv', 'ltv_6m', 'ltv_12m',
                                                  'ltv12_to_cac', 'payback_months')} for r in sc])
    _print('Ops scorecard, Q1 2026', ops_scorecard(con))
    _print('Checkout availability SLO (99.5 %)', checkout_slo(con))
    _print('Warehouse flow, March 2026', flow_scorecard(con))


if __name__ == '__main__':
    main()
