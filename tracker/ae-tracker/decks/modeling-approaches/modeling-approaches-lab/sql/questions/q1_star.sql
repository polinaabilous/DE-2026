SELECT c.segment AS segment_at_order, p.category, sum(f.line_revenue) AS revenue
FROM fct_order_line AS f
JOIN dim_customer   AS c USING (customer_sk)
JOIN dim_product    AS p USING (product_sk)
GROUP BY ALL
ORDER BY segment_at_order, category;
