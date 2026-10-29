SELECT coalesce(cp.segment, 'unknown') AS segment_at_order,
       cat.category_name                 AS category,
       sum(l.quantity * l.unit_price)    AS revenue
FROM edw_sales_order_line AS l
JOIN edw_sales_order      AS o   ON o.order_id = l.order_id
LEFT JOIN edw_customer_profile AS cp
       ON cp.customer_id = o.customer_id
      AND o.ordered_at >= cp.valid_from AND o.ordered_at < cp.valid_to     -- the version valid at order time
JOIN edw_product          AS p   ON p.product_id = l.product_id
JOIN edw_product_category AS cat ON cat.category_id = p.category_id
GROUP BY ALL
ORDER BY segment_at_order, category;
