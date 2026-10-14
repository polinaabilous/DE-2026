"""Python session P1 (about 45 minutes, no AI): parse app events and count them by type.

Read prompts.md for the session rules. Say the restatement, the edge cases and the complexity
aloud before you write code. Check yourself with:  python -m pytest -q tests/test_p1.py
"""


def parse_events(lines):
    """Parse JSON Lines into event dicts.

    Input: an iterable of text lines (for example an open file).
    Return (events, rejects):
      events  - list of dicts with keys event_id, user_id (may be None), event_type,
                event_ts and ingested_at (timezone-aware datetimes) and line (1-based line number);
      rejects - list of (line_number, reason) for malformed JSON or a missing required field
                (event_id, event_type, event_ts, ingested_at). Blank lines are skipped silently.
    """
    raise NotImplementedError


def count_by_type(events):
    """Return [(event_type, count), ...] sorted by count descending, then event_type ascending."""
    raise NotImplementedError
