# Intake: are Leafy repotting workshops worth keeping?

**Requester:** Events coordinator · **Received:** 2026-03-16 · **Priority:** P2

> Can you tell me if the workshops are worth it? People seem to love them.

## Question
For each Leafy repotting workshop from 2025-07 to 2026-02, how much did attendees spend on completed orders in the 60 days after the workshop, compared with the 60 days before it?

## Decision it supports
On 2026-04-01 the events coordinator decides whether to keep the monthly Denver workshop after June 2026. Keep it if attendee spend after minus before is at least the workshop's cost of $600 per session.

## Grain
One row per workshop (city, date). Population: attendees with a `customer_id` who checked in; staff and no-shows excluded.

## Deadline
2026-03-27 17:00 America/Chicago, one working day before the decision meeting.

## Owner
Builds it: data engineer. Owns the definition: analytics lead. Signs off: events coordinator.

## Acceptance criteria
- Windows are [workshop date - 60 days, workshop date) and [workshop date, workshop date + 60 days), in America/Chicago.
- A workshop with 0 checked-in attendees shows 0 attendees and an empty spend difference, not 0 dollars.
- The Denver workshop of 2026-01-17 matches a hand count from the sign-in sheet (12 attendees).

## Out of scope
- Proving that the workshop caused the spend: there is no control group; the table says "associated with".
- Austin workshops before 2025-07 (sign-in data missing).

## Data sources
`workshop_attendance` (sign-in app), `orders`, `customers.is_staff`.

## Open questions
- Should the comparison use non-attendees with similar order history as a baseline? (analytics lead, by 2026-03-20)
