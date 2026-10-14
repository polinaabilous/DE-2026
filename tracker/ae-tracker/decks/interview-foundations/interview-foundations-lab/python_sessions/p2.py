"""Python session P2 (about 45 minutes, no AI): de-duplicate events and count daily active users.

Check yourself with:  python -m pytest -q tests/test_p2.py
"""


def dedupe_latest(events):
    """Keep one event per event_id: the copy with the latest ingested_at; on a tie, the later line wins.

    Input: event dicts as returned by p1.parse_events (each has 'ingested_at' and 'line').
    Return the surviving events sorted by line number.
    """
    raise NotImplementedError


def daily_active_users(events, tz="America/Chicago"):
    """Return {local_date_iso: number_of_distinct_users} for the time zone tz, sorted by date.

    Events without a user_id do not count as active users.
    """
    raise NotImplementedError
