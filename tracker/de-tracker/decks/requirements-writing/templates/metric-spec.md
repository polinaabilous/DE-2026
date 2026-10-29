# Metric spec: <metric name>

<!-- The fields are explained in the "Metric design" deck, lesson 5 (the metric spec card).
     python doclint.py spec spec-<metric>.md -->

## Definition
<one sentence a stakeholder would agree with>

## Decision
<the decision that changes when this number moves>

## Owner
<role>

## Population
<units eligible to be counted>

## Grain
<unit counted; one row per ... in the output>

## Numerator
<what is counted on top>

## Denominator
<what it is divided by; the numerator is a subset of it>

## Time window and time zone
<calendar or rolling, time zone, half-open interval [start, end)>

## Exclusions
- <rows removed, and why>

## Missing data and late rows
<what happens to NULL keys and to rows that arrive late>
