-- S1a: each customer's most recent completed order (guests excluded); ties go to the higher order_id
SELECT customer_id, order_id, placed_at_utc, amount
FROM orders
WHERE status = 'completed'
  AND customer_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY customer_id ORDER BY placed_at_utc DESC, order_id DESC) = 1
ORDER BY customer_id;
