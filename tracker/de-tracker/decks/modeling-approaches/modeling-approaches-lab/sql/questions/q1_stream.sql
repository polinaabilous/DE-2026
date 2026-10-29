SELECT coalesce(seg.feature_json ->> 'segment', 'unknown') AS segment_at_order,
       p.category, sum(i.revenue_impact) AS revenue
FROM customer_stream AS i
ASOF LEFT JOIN (SELECT customer, ts, feature_json FROM customer_stream
                WHERE activity = 'updated_segment') AS seg
       ON seg.customer = i.customer AND i.ts >= seg.ts        -- "last before"
JOIN stg_products AS p ON p.product_id = (i.feature_json ->> 'product_id')
WHERE i.activity = 'ordered_item'
GROUP BY ALL
ORDER BY segment_at_order, category;
