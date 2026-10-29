---
track: general
title: General
---

# General — notes

<!-- AE roadmap notes. Each "## " heading starts a note; keep the "<!-- id … -->" line under it. Edits here are picked up by the app. -->

## SQL Commands
<!-- id: nmuvw9px6szl9 | created: 2026-10-05 -->

**EXCEPT** — Returns distinct rows from the first query that are not in the second query. Both queries must return the same number of columns with compatible data types.

Example: find customers who have never placed an order.

```sql
SELECT customer_id
FROM customers
EXCEPT
SELECT customer_id
FROM orders;
```

**FILTER** — Limits the rows used by a specific aggregate, such as `COUNT` or `SUM`, without filtering the rows used by other aggregates in the same query.

Example (PostgreSQL): count all orders and completed orders per customer.

```sql
SELECT
    customer_id,
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders
FROM orders
GROUP BY customer_id;
```
