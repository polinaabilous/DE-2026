SELECT segment_at_order, category, sum(line_revenue) AS revenue
FROM obt_order_lines
GROUP BY ALL
ORDER BY segment_at_order, category;
