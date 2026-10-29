SELECT coalesce(s.segment, 'unknown') AS segment_at_order, v.category,
       sum(v.line_revenue) AS revenue
FROM vault_sales_lines AS v
ASOF LEFT JOIN sat_customer_shop AS s              -- last satellite row whose business date
       ON s.customer_hk = v.customer_hk            -- (updated_at) is at or before the order
      AND v.ordered_at >= s.updated_at
GROUP BY ALL
ORDER BY segment_at_order, category;
