# ADR-0001: Use America/Chicago calendar days for every business date

## Status
Accepted · 2026-03-04

## Context
Leafy stores every timestamp in UTC. Two ad-hoc repeat-customer queries disagreed because one cut months at midnight UTC and the other at midnight in Chicago, where the company works. Orders placed on the evening of the last day of a month (Chicago time) fell into the next month in UTC. Finance closes the books in Chicago time.

## Decision
We will derive every business date, week and month from UTC timestamps converted to America/Chicago, with the shared macro `local_ts()`. Stored columns stay in UTC; derived date columns end in `_local_date`.

## Consequences
- Easier: numbers match Finance and the Marketing spreadsheet; one macro to review; the rule is written down once.
- Harder: every model must call the macro; days around daylight-saving changes have 23 or 25 hours; people in other time zones see days that differ from their own clock.
