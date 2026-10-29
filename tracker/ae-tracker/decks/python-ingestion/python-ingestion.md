# Reliable Python ingestion: APIs and files to Parquet

*Companion to `python-ingestion.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Lesson:** *Ingestion engineering* (httpx, pagination, retries with backoff, rate limits, streaming gzip JSON Lines, PyArrow/Parquet, idempotent writes, secrets, and when dlt would be the better choice).

**Tested with:** CPython 3.12.10 on Windows 11 (64-bit), httpx 0.28.1, RESPX 0.23.1, PyArrow 25.0.1, DuckDB 1.5.6 and pytest 9.1.1 in one virtual environment; dlt 1.30.0 (with its DuckDB extra) in a second virtual environment. Every Python block was executed while building this document: in-process blocks inside the build, and blocks shown with a `$ python …` line as separate processes. Timings are labelled as measured on the build machine; yours will differ.

**Offline by design:** every HTTP call in the lessons goes to a local fake server (`fakeapi.py`, started in a thread on 127.0.0.1) that simulates pagination, 429 with `Retry-After`, 500/503, timeouts, dropped connections, truncated downloads and malformed bodies. GH Archive is replaced by a synthetic 24-hour fixture with the real event schema. One real GH Archive hour (2026-03-02, 15:00 UTC) was downloaded once and cached; the optional slide that uses it is skipped if the cache is missing.

**Prerequisites:** the two decks of the lesson *Python for data engineering* (*Python foundations for data engineering* and *Python files, generators, and practical data scripts*). The files-and-streams deck showed a simple retry decorator and left real HTTP retry engineering to this deck. New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note.

**Additions beyond the original brief** are marked *(added)*: testing HTTP code offline with `httpx.MockTransport` and RESPX; the `Idempotency-Key` pattern for retrying POSTs; a ceiling on how long a `Retry-After` may make you wait; `iter_raw` versus automatic decompression, and ETag/MD5 checks on downloads; byte-for-byte deterministic gzip (`mtime=0`); duplicates as their own audit category; a quarantine-rate threshold that fails the run; restoring the last good partition after an interrupted swap; a check of the real GH Archive schema on one downloaded hour; interview talking points.

## Contents

1. [Reliable Python ingestion: APIs and files to Parquet](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was tested](#slide-2)
3. [Two kinds of ingestion: a paginated API and hourly files](#slide-3)
4. [The offline lab: a fake API you can break on purpose](#slide-4)
5. [HTTP in ten minutes: requests, responses, status codes](#slide-5)
6. [httpx: one Client per job, not one connection per request](#slide-6)
7. [Timeouts: connect, read, write, pool, and the total you actually care about](#slide-7)
8. [Pagination: page numbers versus cursors](#slide-8)
9. [Following Link headers](#slide-9)
10. [Cursor pagination: stable under change](#slide-10)
11. [Which failures to retry, and which never to retry](#slide-11)
12. [Exponential backoff with full jitter](#slide-12)
13. [Retry-After: when the server tells you how long to wait](#slide-13)
14. [Putting it together: a retry loop you can trust](#slide-14)
15. [Rate limits: read the headers, and limit yourself](#slide-15)
16. [httpkit.py: the pieces as one reusable module](#slide-16)
17. [Checkpointing the cursor: crash, then resume](#slide-17)
18. [The API lab end to end: chaos in, exact counts out](#slide-18)
19. [Testing HTTP code offline: MockTransport and RESPX](#slide-19)
20. [GH Archive: the public GitHub timeline as hourly files](#slide-20)
21. [An offline fixture with the real schema, and every trap planted](#slide-21)
22. [Streaming downloads: temp file, verify, then rename](#slide-22)
23. [Parsing gzip JSON Lines: validate every line, classify every outcome](#slide-23)
24. [Quarantine: keep the bad lines, with reasons](#slide-24)
25. [Deterministic identifiers: keys, content hashes, file names](#slide-25)
26. [PyArrow: explicit schemas instead of guessed ones](#slide-26)
27. [Batched Parquet writes with ParquetWriter](#slide-27)
28. [Partitions: folders a query can skip, and the small-files problem](#slide-28)
29. [Idempotent publication: stage, then swap](#slide-29)
30. [Manifests and audit counts: prove what you published](#slide-30)
31. [Secrets: environment variables, redaction, and Key Vault](#slide-31)
32. [Project: a bounded GH Archive ingester](#slide-32)
33. [Project: the ingester code](#slide-33)
34. [Project: first run, through injected failures](#slide-34)
35. [Project: the manifest, the quarantine file, and the run log](#slide-35)
36. [Project: verify the Parquet with PyArrow and DuckDB](#slide-36)
37. [Project: the cap, truncation, and its alternatives](#slide-37)
38. [Project: safe reruns produce identical bytes](#slide-38)
39. [Project: a crash during landing, then resume](#slide-39)
40. [Project: crashes while writing and while publishing](#slide-40)
41. [Optional: the same parser on one real GH Archive hour](#slide-41)
42. [Manual ingestion versus dlt](#slide-42)
43. [A small dlt pipeline, offline, twice](#slide-43)
44. [Interview talking points](#slide-44)
45. [Bug clinic: ingestion failures and their fixes](#slide-45)
46. [Exercises 1–4: retries and pagination](#slide-46)
47. [Exercises 5–8: rate limits, checkpoints, verification, validation](#slide-47)
48. [Exercises 9–11: caps, Parquet, publication](#slide-48)
49. [Cheat sheet](#slide-49)
50. [Glossary](#slide-50)
51. [What to remember, and what comes next](#slide-51)
52. [References and how this deck was tested](#slide-52)
53. [Appendix A · Hints](#appendix-a)
54. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Reliable Python ingestion: APIs and files to Parquet

**

The files-and-streams deck loaded files that were already on disk. This deck covers how data gets there: from HTTP APIs that page, throttle and fail, and from file servers that drop connections halfway through a download, and how to publish the result so nobody ever sees half of it.

- **Part A, HTTP and APIs:** HTTP basics, `httpx`, timeouts, page/offset versus cursor pagination, `Link` headers.
- **Part B, failure handling (the paginated API lab):** which failures to retry, exponential backoff with full jitter, `Retry-After`, rate limits and a token bucket, checkpointing a cursor, crash and resume.
- **Part C, files to Parquet:** GH Archive, an offline fixture, streaming downloads with verification, gzip JSONL parsing, quarantine, deterministic identifiers, PyArrow schemas, batched Parquet writes, partitions, idempotent publication, manifests and audit counts, secrets.
- **Part D, the project:** a bounded GH Archive ingester for a fixed 24-hour UTC window, three repositories and a deterministic cap of 100,000 events, with safe reruns and interrupted-run recovery proven by real runs. Then a short comparison with dlt, a bug clinic, 11 exercises, a cheat sheet and a glossary.

Everything runs offline against a local fake server, and every example ran while this deck was built.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Ingestion is the first step of every data platform, and the most failure-prone: APIs time out, rate-limit and paginate; files arrive late, compressed, or truncated. Reliable ingestion means you can prove what you loaded, re-run safely, recover from crashes, and never publish half a dataset.

#### Where you will use it

- Pulling data from SaaS and internal REST APIs into Bronze.
- Downloading hourly/daily dumps (like GH Archive) into a lake.
- Writing Parquet with explicit schemas and sensible partitions.
- Manifests and audit counts that downstream jobs and auditors rely on.

#### What goes wrong without it

- Jobs that hammer an API, get throttled, and fail every night.
- Missing pages or duplicated records after a retry or restart.
- Partial partitions visible to readers after a crash.
- Silent schema drift: a field changes type and breaks Silver days later.

#### Who expects you to know it

- Data engineers (ingestion is usually the first pipeline you own).
- Platform and security teams: secrets handling, rate limits, audit trails.
- Interviews: “design an ingestion job for API X”, retries and backoff, idempotency, late data, exactly-once vs at-least-once.

> **On the job:** A typical first project: “ingest this vendor API daily into the lakehouse”. Interviewers and reviewers will ask how you handle pagination, 429s, restarts and duplicates; this deck builds an ingester that answers each with a mechanism and a test.

> **The main idea:** reliable ingestion is about guarantees: bounded retries, checkpoints, deterministic IDs, atomic publication, and counts that add up.

*Read more:* [httpx](https://www.python-httpx.org/), [PyArrow: Parquet](https://arrow.apache.org/docs/python/parquet/parquet.html).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Paginated REST API, moderate volume | httpx + retries with jitter + cursor checkpoint | Full control; testable offline |
| Bulk hourly/daily dump files | Streaming download + gzip JSONL parse + Parquet | Fewer calls; verify size/hash |
| Standard SaaS source with a ready connector | Fabric/ADF Copy activity, dlt, Airbyte/Fivetran | Less code; accept their conventions |
| Need schema evolution and incremental state handled for you | dlt | Library that automates loading patterns |
| Real-time events | Event Hubs/Kafka + streaming engine | Batch ingestion is the wrong shape |

#### How interviews test it

- “What do you retry, and how?” (transient errors only, exponential backoff with jitter, Retry-After).
- “The job died halfway. What happens on restart?” (checkpoints, idempotent publication).
- “How do you know you loaded everything?” (manifest, audit counts, reconciliation).

#### Where it sits in your learning path

- Builds on: the Python for data engineering decks (streams, transactions), the pandas & Polars deck, and the data-formats deck (Parquet, partitions).
- Next: dbt turns the ingested Parquet/Bronze data into tested marts.

> **The main idea:** write custom ingestion when you need control and proof; use connectors or dlt when a standard source and conventions are enough.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was tested

*Start here · two virtual environments, everything offline*

| Item | Detail |
|---|---|
| Tested with | **CPython 3.12.10** on Windows 11; **httpx 0.28.1**, **RESPX 0.23.1**, **PyArrow 25.0.1**, **DuckDB 1.5.6**, **pytest 9.1.1** in one virtual environment; **dlt 1.30.0** with its DuckDB extra in a second one (dlt pins many dependencies, so it gets its own environment). |
| Install | Main environment: `python -m pip install httpx respx pyarrow duckdb pytest`. dlt environment: `python -m pip install "dlt[duckdb]"`. The files-and-streams deck showed how to create virtual environments and how to do the same with `uv`. |
| Minimum Python | **3.11** for everything shown (the walrus operator and `dataclasses` are older; nothing here needs 3.12). |
| Network | None at build time. A local fake server (next slides) plays the API and the GH Archive file server. One real GH Archive hour was downloaded once, cached, and is used only by an optional slide. |
| How outputs were produced | In-process blocks ran inside the build; blocks labelled `$ python file.py` ran as separate processes, as you would run them. Retry delays come from seeded random generators, so they are the same on every build. Timings are labelled as measured. |

#### Check the main environment

```python
import sys, httpx, respx, pyarrow, duckdb
print("Python ", sys.version.split()[0])
for m in (httpx, respx, pyarrow, duckdb):
    print(f"{m.__name__:<8}", m.__version__)
```

Output:

```text
Python  3.12.10
httpx    0.28.1
respx    0.23.1
pyarrow  25.0.1
duckdb   1.5.6
```

> **On the job:** Pin these versions in `pyproject.toml`/`uv.lock` (files-and-streams deck). HTTP client and Arrow upgrades change defaults (timeouts, compression, type mapping) more often than you would expect.

#### Check the dlt environment

Terminal:

```text
$ <dlt-venv>\Scripts\python -c "import dlt; print(dlt.__version__)"
1.30.0
```

dlt sends anonymous usage telemetry by default. Every dlt run in this deck sets `RUNTIME__DLTHUB_TELEMETRY=false` and keeps its working files inside the project folder.

> **The main idea:** one pinned environment per tool chain, and an offline lab: every failure in this deck is produced on purpose by a local server, so the results are repeatable.

*Read more:* [HTTPX](https://www.python-httpx.org/), [PyArrow](https://arrow.apache.org/docs/python/), [DuckDB: Parquet](https://duckdb.org/docs/stable/data/parquet/overview), [dlt docs](https://dlthub.com/docs/intro), [dlt telemetry](https://dlthub.com/docs/reference/telemetry).

---

<a id="slide-3"></a>
## 3. Two kinds of ingestion: a paginated API and hourly files

*Start here · the two labs in this deck*

**Ingestion** means copying data from a system you don’t control into storage you do, usually a **landing zone** (raw files kept as received) and then a typed table. The two most common sources need different designs, so the deck has two labs.

| Question | Paginated API lab (Part B) | GH Archive lab (Parts C–D) |
|---|---|---|
| What is the source? | A REST API returning JSON one page at a time | Static files: one gzip JSON Lines file per UTC hour, at a predictable URL |
| Unit of work | A page (tens to hundreds of records) | An hourly file (tens of MB, ~150,000 events) |
| How do you know you are done? | The API stops returning a “next” link or cursor | You have all 24 files of the day |
| Typical failures | 429 throttling, 5xx, timeouts, malformed pages, data changing while you page | Connection dropped mid-download, missing hour, corrupt gzip, malformed lines |
| Checkpoint (resume point) | The last cursor that was fully saved | Each hourly file downloaded and verified |
| Ordering and completeness | Defined by the API (and only if the cursor is stable) | You define it: a fixed window, a sort key, a cap |
| Credentials | Usually a token | None (public files) |
| Typical tools | httpx + your retry policy, or dlt’s REST source | httpx streaming, gzip, PyArrow, Parquet |

> **On the job:** In an interview, “how would you ingest from X?” is really “which of these two shapes is it, and how do you checkpoint, retry, and prove completeness?” Saying that out loud early structures the whole answer.

> **The main idea:** APIs are pulled page by page with a cursor; archives are pulled file by file with a window. Both need retries, checkpoints, idempotent writes and counts that add up.

*Read more:* [GH Archive](https://www.gharchive.org/), [GitHub REST: pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api).

---

<a id="slide-4"></a>
## 4. The offline lab: a fake API you can break on purpose

*Start here · fakeapi.py runs in a thread on 127.0.0.1*

Testing failure handling against a real API is slow, rude and unrepeatable. Instead, `fakeapi.py` uses the standard library’s `http.server` to serve a page-numbered list, a cursor-paginated feed, a slow endpoint, a private endpoint that needs a token, and the GH Archive files. `inject()` makes the next requests to a path fail in a chosen way. A **thread** lets the server answer while the same Python process acts as the client.

<details><summary>Show fakeapi.py (about 200 lines)</summary>

```python
# fakeapi.py
"""fakeapi.py: a local, offline stand-in for a paginated REST API and for GH Archive's file server.

Start it with `start()`. It runs in a background thread on 127.0.0.1.
Use `inject(path_prefix, *actions)` to make the next requests to that path fail on purpose.
Actions: 500, 503, (429, "2"), (429, "http-date"), "timeout", "reset", "malformed", "truncate".
"""
import base64, email.utils, hashlib, json, os, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

STATE = {"items": [], "events": [], "plans": {}, "log": [], "gha_dir": None,
         "rate_limit": 60, "rate_used": 0, "clock": 1_772_460_000}     # fixed fake epoch for headers
LOCK = threading.Lock()
BASE = None
FAKE_TOKEN_ENV = "FAKE_API_TOKEN"


def reset():
    """Fresh data: 23 items (page API) and 57 events (cursor API), no injected failures."""
    with LOCK:
        STATE["items"] = [{"id": i, "name": f"item-{i:02d}"} for i in range(23, 0, -1)]   # newest first
        STATE["events"] = [{"id": i, "kind": ("click", "view", "buy")[i % 3],
                            "updated_at": f"2026-03-02T{(i // 6):02d}:{(i * 7) % 60:02d}:00Z"} for i in range(1, 58)]
        STATE["plans"].clear(); STATE["log"].clear(); STATE["rate_used"] = 0


def add_item():
    """Simulate a new record arriving while a client is paging (it goes to the top)."""
    with LOCK:
        new_id = max(x["id"] for x in STATE["items"]) + 1
        STATE["items"].insert(0, {"id": new_id, "name": f"item-{new_id:02d}"})
        return new_id


def touch_events(new=3, update_ids=()):
    """Simulate source changes for incremental loads: append new events and update some old ones."""
    with LOCK:
        for i in update_ids:
            e = STATE["events"][i - 1]
            e.update(kind="refund", updated_at="2026-03-02T12:00:00Z")
        start = STATE["events"][-1]["id"] + 1
        for i in range(start, start + new):
            STATE["events"].append({"id": i, "kind": "view", "updated_at": f"2026-03-02T12:{i % 60:02d}:00Z"})


def inject(path_prefix, *actions):
    """Queue failures for the next requests whose path starts with path_prefix."""
    with LOCK:
        STATE["plans"].setdefault(path_prefix, []).extend(actions)


def requests_log(clear=True):
    with LOCK:
        out = list(STATE["log"])
        if clear:
            STATE["log"].clear()
        return out


def _cursor(n):
    return base64.urlsafe_b64encode(f"after:{n}".encode()).decode().rstrip("=")


def _uncursor(c):
    raw = base64.urlsafe_b64decode(c + "=" * (-len(c) % 4)).decode()
    return int(raw.split(":")[1])


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "FakeAPI/1.0"
    sys_version = ""

    def log_message(self, *args):          # keep the build output quiet
        pass

    def date_time_string(self, timestamp=None):   # the Date header uses the fixed fake clock
        return email.utils.formatdate(STATE["clock"], usegmt=True)

    def _send(self, status, body=b"", ctype="application/json", headers=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status, obj, headers=None):
        self._send(status, json.dumps(obj).encode(), headers=headers)

    def _next_action(self, path):
        with LOCK:
            for prefix in sorted(STATE["plans"], key=len, reverse=True):
                if path.startswith(prefix) and STATE["plans"][prefix]:
                    return STATE["plans"][prefix].pop(0)
        return None

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        self.do_GET()

    def do_GET(self):
        url = urlsplit(self.path)
        q = {k: v[-1] for k, v in parse_qs(url.query).items()}
        action = self._next_action(url.path)
        with LOCK:
            STATE["log"].append(f"{self.command} {self.path} -> {action if action is not None else 'ok'}")
        try:
            self._truncate = action == "truncate"
            if action is not None and self._fail(action, url.path):
                return
            self._route(url.path, q)
        except (ConnectionError, OSError):
            pass

    def _fail(self, action, path):
        """Return True if the failure fully handled the request."""
        if action == "timeout":
            time.sleep(1.0)                      # longer than the clients' read timeouts in the demos
            self._json(200, {"data": [], "note": "too late"})
            return True
        if action == "reset":                    # drop the connection without any response
            self.close_connection = True
            self.connection.shutdown(2)
            return True
        if action == "malformed":
            self._send(200, b'{"data": [{"id": 1, "kind": "cli', headers={"X-Fake": "malformed"})
            return True
        if action == "truncate":
            return False                         # handled by the file route
        if isinstance(action, tuple):
            status, ra = action
            if ra == "http-date":
                ra = email.utils.formatdate(STATE["clock"] + 3, usegmt=True)
            self._json(status, {"message": "slow down"}, headers={"Retry-After": ra})
            return True
        self._json(int(action), {"message": f"fake {action}"})
        return True

    def _rate_headers(self):
        with LOCK:
            STATE["rate_used"] += 1
            used = STATE["rate_used"]
        return {"x-ratelimit-limit": str(STATE["rate_limit"]),
                "x-ratelimit-remaining": str(max(STATE["rate_limit"] - used, 0)),
                "x-ratelimit-used": str(used), "x-ratelimit-reset": str(STATE["clock"] + 3600)}

    def _route(self, path, q):
        if path == "/api/items":
            page, per_page = int(q.get("page", 1)), min(int(q.get("per_page", 10)), 100)
            items = STATE["items"]
            last = max(1, -(-len(items) // per_page))
            chunk = items[(page - 1) * per_page: page * per_page]
            links = []
            mk = lambda p: f'<{BASE}/api/items?page={p}&per_page={per_page}>'
            if page < last:
                links.append(mk(page + 1) + '; rel="next"')
                links.append(mk(last) + '; rel="last"')
            if page > 1:
                links.append(mk(1) + '; rel="first"')
                links.append(mk(page - 1) + '; rel="prev"')
            h = self._rate_headers()
            if links:
                h["Link"] = ", ".join(links)
            return self._json(200, chunk, headers=h)
        if path == "/api/events":
            limit = min(int(q.get("limit", 20)), 50)
            after = _uncursor(q["cursor"]) if q.get("cursor") else 0
            since = q.get("since", "")
            match = [e for e in STATE["events"] if e["updated_at"] > since]
            rows = [e for e in match if e["id"] > after][:limit]
            more = bool(rows) and rows[-1]["id"] < match[-1]["id"]
            return self._json(200, {"data": rows, "next_cursor": _cursor(rows[-1]["id"]) if more else None},
                              headers=self._rate_headers())
        if path == "/api/private":
            auth = self.headers.get("Authorization", "")
            expected = "Bearer " + os.environ.get(FAKE_TOKEN_ENV, "\x00")
            if auth != expected:
                return self._json(401, {"message": "Bad credentials"})
            return self._json(200, {"ok": True})
        if path == "/slow":
            time.sleep(float(q.get("seconds", 1)))
            return self._json(200, {"slept": float(q.get("seconds", 1))})
        if path.startswith("/gharchive/"):
            return self._file(path.rsplit("/", 1)[-1])
        self._json(404, {"message": "Not Found"})

    def _file(self, name):
        p = os.path.join(STATE["gha_dir"] or "", name)
        if not STATE["gha_dir"] or not os.path.isfile(p):
            return self._send(404, b"<Error>NoSuchKey</Error>", ctype="application/xml")
        data = open(p, "rb").read()
        headers = {"ETag": '"' + hashlib.md5(data).hexdigest() + '"',
                   "Last-Modified": email.utils.formatdate(STATE["clock"], usegmt=True)}
        truncated = any(a == "truncate" for a in [])
        self.send_response(200)
        self.send_header("Content-Type", "application/gzip")
        self.send_header("Content-Length", str(len(data)))
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()
        if self.command == "HEAD":
            return
        if getattr(self, "_truncate", False):
            self.wfile.write(data[: len(data) // 2])
            self.wfile.flush()
            self.close_connection = True
            self.connection.shutdown(2)
            return
        self.wfile.write(data)


class _Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):   # client hung up early: not our problem
        pass


def start(port=8765):
    """Start the fake server in a daemon thread and return its base URL."""
    global BASE
    if BASE:                                           # already running: reuse it
        return BASE
    reset()
    try:
        srv = _Server(("127.0.0.1", port), Handler)
    except OSError:
        srv = _Server(("127.0.0.1", 0), Handler)       # port busy: take any free port
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    BASE = f"http://127.0.0.1:{srv.server_address[1]}"
    return BASE
```

</details>

```python
import httpx, fakeapi

BASE = fakeapi.start()                      # http://127.0.0.1:8765
print("server:", BASE)
r = httpx.get(BASE + "/api/items", params={"per_page": 3})
print(r.status_code, r.json())

fakeapi.inject("/api/items", 503, (429, "2"))   # the next two requests will fail
for _ in range(3):
    r = httpx.get(BASE + "/api/items", params={"per_page": 3})
    print(r.status_code, r.headers.get("Retry-After"), r.json() if r.status_code == 200 else r.json()["message"])
print(*fakeapi.requests_log(), sep="\n")
```

Output:

```text
server: http://127.0.0.1:8765
200 [{'id': 23, 'name': 'item-23'}, {'id': 22, 'name': 'item-22'}, {'id': 21, 'name': 'item-21'}]
503 None fake 503
429 2 slow down
200 None [{'id': 23, 'name': 'item-23'}, {'id': 22, 'name': 'item-22'}, {'id': 21, 'name': 'item-21'}]
GET /api/items?per_page=3 -> ok
GET /api/items?per_page=3 -> 503
GET /api/items?per_page=3 -> (429, '2')
GET /api/items?per_page=3 -> ok
```

| Injected action | What the client sees |
|---|---|
| `500`, `503` | An error status with a JSON message |
| `(429, "2")` / `(429, "http-date")` | 429 with `Retry-After: 2` or a date 3 seconds after the server’s fixed clock |
| `"timeout"` | The server waits 1 s before answering (longer than the demos’ read timeouts) |
| `"reset"` | The connection closes with no response at all |
| `"malformed"` | HTTP 200 with a truncated JSON body |
| `"truncate"` | A file download that stops halfway, although `Content-Length` promised the full size |

> **The main idea:** make failures reproducible: a local fake server plus an injection switch turns “it sometimes fails in production” into a test you can run in a second.

*Read more:* [http.server](https://docs.python.org/3/library/http.server.html), [HTTPX quickstart](https://www.python-httpx.org/quickstart/).

---

<a id="slide-5"></a>
## 5. HTTP in ten minutes: requests, responses, status codes

*Part A · the vocabulary every API conversation uses*

**HTTP** is a request–response protocol. A **client** (your script) sends a **request**: a **method** (what to do), a **URL** (which resource, plus **query parameters** after `?`), **headers** (name–value metadata such as `Accept` or `Authorization`) and an optional **body**. The **server** answers with a **response**: a three-digit **status code**, headers, and a body (here JSON).

```python
import httpx

req = httpx.Request("GET", BASE + "/api/items", params={"page": 2, "per_page": 5},
                    headers={"Accept": "application/json"})
print(req.method, req.url)
print("request headers:", dict(req.headers))

with httpx.Client() as client:
    resp = client.send(req)
print(resp.http_version, resp.status_code, resp.reason_phrase)
for name in ("content-type", "content-length", "date", "x-ratelimit-remaining"):
    print(f"  {name}: {resp.headers.get(name)}")
print("  link:", resp.headers["link"][:75], "...")
print("body:", resp.text)
```

Output:

```text
GET http://127.0.0.1:8765/api/items?page=2&per_page=5
request headers: {'host': '127.0.0.1:8765', 'accept': 'application/json'}
HTTP/1.1 200 OK
  content-type: application/json
  content-length: 155
  date: Mon, 02 Mar 2026 14:00:00 GMT
  x-ratelimit-remaining: 57
  link: <http://127.0.0.1:8765/api/items?page=3&per_page=5>; rel="next", <http://12 ...
body: [{"id": 18, "name": "item-18"}, {"id": 17, "name": "item-17"}, {"id": 16, "name": "item-16"}, {"id": 15, "name": "item-15"}, {"id": 14, "name": "item-14"}]
```

#### Status code classes

| Class | Meaning | Codes you will meet |
|---|---|---|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Go elsewhere | 301/302/307/308 redirects (httpx does **not** follow them unless `follow_redirects=True`), 304 Not Modified |
| 4xx | Your request is wrong | 400 bad request, 401 not authenticated, 403 forbidden (GitHub also uses it for rate limits), 404, 408 request timeout, 409 conflict, 422 invalid, 429 too many requests |
| 5xx | The server failed | 500 internal error, 502 bad gateway, 503 unavailable, 504 gateway timeout |

#### Safe and idempotent methods

| Method | Safe | Idempotent |
|---|---|---|
| GET, HEAD, OPTIONS | yes | yes |
| PUT, DELETE | no | yes |
| POST, PATCH | no | no |

**Safe**: the request doesn’t change anything on the server. **Idempotent**: sending it twice has the same effect as sending it once (RFC 9110 §9.2). Idempotency decides what you may retry blindly.

> **On the job:** Ingestion code is mostly GETs, which are safe to repeat. The dangerous calls are the rare POSTs: “start an export job”, “acknowledge these messages”. Before you add a retry, ask “what happens if the server did it and I do it again?”

> **The main idea:** learn to read a request and a response line by line: method, URL, query, headers, status, body. Every bug in this deck shows up in one of those fields.

*Read more:* [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110), [RFC 9110 §9.2 safe and idempotent methods](https://www.rfc-editor.org/rfc/rfc9110#section-9.2), [RFC 9110 §15 status codes](https://www.rfc-editor.org/rfc/rfc9110#section-15), [MDN: HTTP status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status).

---

<a id="slide-6"></a>
## 6. httpx: one Client per job, not one connection per request

*Part A · base URL, default headers, pooling, raise_for_status, hooks*

`httpx` is a modern HTTP client for Python with the same API for synchronous and `async` code (the files-and-streams deck introduced asyncio). Use an `httpx.Client` for anything more than one request: it keeps a **connection pool**, reusing open TCP connections (**keep-alive**) instead of opening a new one per request, and holds shared settings such as `base_url`, headers and timeouts. It is the Python counterpart of reusing one `HttpClient` in C#.

```python
seen = []

def log_request(request):                          # an event hook: runs before every request
    seen.append(f"{request.method} {request.url.path}?{request.url.query.decode()}")

with httpx.Client(base_url=BASE, headers={"User-Agent": "deck4-ingest/1.0"}, timeout=5.0,
                  event_hooks={"request": [log_request]}) as client:
    r = client.get("/api/items", params={"page": 1, "per_page": 4})
    r.raise_for_status()                           # httpx never raises for 4xx/5xx by itself
    print(r.status_code, [x["id"] for x in r.json()], r.request.headers["user-agent"])
    r = client.get("/api/missing")
    print("no exception yet, status", r.status_code)
    try:
        r.raise_for_status()
    except httpx.HTTPStatusError as e:
        print(type(e).__name__, e.response.status_code, e.request.url.path)
print(seen)
```

Output:

```text
200 [23, 22, 21, 20] deck4-ingest/1.0
no exception yet, status 404
HTTPStatusError 404 /api/missing
['GET /api/items?page=1&per_page=4', 'GET /api/missing?']
```

```python
import time

def timed(fn, n=10):
    start = time.perf_counter()
    for _ in range(n):
        fn()
    return (time.perf_counter() - start) / n * 1000

per_call = timed(lambda: httpx.get(BASE + "/api/items", params={"per_page": 1}))
with httpx.Client(base_url=BASE) as client:
    pooled = timed(lambda: client.get("/api/items", params={"per_page": 1}))
print(f"new connection each time: {per_call:.2f} ms/request")
print(f"pooled Client:            {pooled:.2f} ms/request")
```

Output (timings measured on the build machine, localhost):

```text
new connection each time: 384.05 ms/request
pooled Client:            2.93 ms/request
```

- `raise_for_status()` turns 4xx/5xx into `httpx.HTTPStatusError`; without it, a 404 page is happily parsed as data. In httpx it returns the response, so `client.get(…).raise_for_status().json()` works.
- Set a descriptive **User-Agent**. GitHub rejects API requests without one, and providers contact owners of misbehaving agents.
- Close the client (`with` block). Leaked clients leak sockets.

> **On the job:** Most of the per-call cost above is building a new client every time (each top-level `httpx.get` creates one and loads the CA certificate bundle) plus a new TCP connection. Over the internet the gap grows again, because each new HTTPS connection also costs a TLS handshake (often 50–200 ms). A notebook that calls `httpx.get` in a loop over 10,000 pages pays that 10,000 times.

> **The main idea:** create one Client per job with base_url, User-Agent and timeouts, reuse it for every request, and call raise_for_status (or check the status) on every response.

*Read more:* [HTTPX quickstart](https://www.python-httpx.org/quickstart/), [HTTPX clients](https://www.python-httpx.org/advanced/clients/), [HTTPX event hooks](https://www.python-httpx.org/advanced/event-hooks/), [GitHub REST: best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

---

<a id="slide-7"></a>
## 7. Timeouts: connect, read, write, pool, and the total you actually care about

*Part A · a request without a timeout can hang a job forever*

A **timeout** is the longest you will wait before giving up. httpx has four, all 5 seconds by default: **connect** (establishing the TCP/TLS connection), **read** (waiting for the *next chunk* of the response), **write** (sending the next chunk of the request) and **pool** (waiting for a free connection from the pool). There is no **total** timeout: a server that sends one byte every 4 seconds never trips a 5-second read timeout.

```python
import socket

t = httpx.Timeout(2.0, read=0.3)                  # 2 s for connect/write/pool, 0.3 s per read
with httpx.Client(base_url=BASE, timeout=t) as client:
    start = time.perf_counter()
    try:
        client.get("/slow", params={"seconds": 1})
    except httpx.ReadTimeout as e:
        print(f"ReadTimeout after {time.perf_counter() - start:.1f} s")
    print(client.get("/slow", params={"seconds": 0.1}).json())

s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()   # a closed port
try:
    httpx.get(f"http://127.0.0.1:{port}/", timeout=httpx.Timeout(5.0))
except httpx.ConnectError as e:
    print("ConnectError: nothing listening, refused")

for exc in (httpx.ReadTimeout, httpx.ConnectError, httpx.RemoteProtocolError):
    print(" -> ".join(c.__name__ for c in exc.__mro__[:4]))
```

Output (timings measured on the build machine):

```text
ReadTimeout after 0.3 s
{'slept': 0.1}
ConnectError: nothing listening, refused
ReadTimeout -> TimeoutException -> TransportError -> RequestError
ConnectError -> NetworkError -> TransportError -> RequestError
RemoteProtocolError -> ProtocolError -> TransportError -> RequestError
```

#### Choosing values

| Timeout | Typical setting | Why |
|---|---|---|
| connect | 3–10 s | A healthy server accepts quickly; a long connect means it is down or unreachable |
| read | 30–120 s for APIs; 60+ s for big files | Must exceed the slowest legitimate gap between chunks (a slow query behind the API) |
| pool | a few seconds | Long waits here mean you run more concurrent requests than connections |
| total (yours) | per request and per job | Check a deadline in loops; the scheduler’s job timeout is the last line of defence |

#### Never `timeout=None`

`httpx.Timeout(None)` disables all timeouts. One stuck TCP connection then holds the job, its lock, and its scheduler slot until someone notices. The `requests` library has *no* default timeout at all, which is a classic cause of hung jobs.

> **On the job:** When a scheduled extract “runs for 9 hours instead of 10 minutes”, the usual cause is a missing or huge read timeout on a server that stopped sending. Put timeouts in config and log them at start-up.

> **The main idea:** set connect and read timeouts explicitly on the Client, never disable them, and add your own total deadline for loops and long downloads.

*Read more:* [HTTPX timeouts](https://www.python-httpx.org/advanced/timeouts/), [HTTPX exceptions](https://www.python-httpx.org/exceptions/).

---

<a id="slide-8"></a>
## 8. Pagination: page numbers versus cursors

*Part A · why offset paging loses and duplicates records*

APIs return big collections in **pages**. With **page/offset pagination** you ask for “page 3 of size 10” (the server skips 20 rows). With **cursor pagination** the server returns an opaque **cursor** (a token that encodes “where you stopped”) and you send it back for the next page. A cursor is usually **keyset** pagination underneath: “rows after id 40, ordered by id”.

| Style | Request | Strength | Weakness |
|---|---|---|---|
| Page / offset | `?page=3&per_page=10` or `?offset=20&limit=10` | Simple; random access; easy to parallelise | Inserts/deletes during paging shift rows: duplicates and gaps. Deep offsets get slow (the server still scans skipped rows) |
| Cursor (keyset) | `?cursor=YWZ0ZXI6MjA&limit=20` | Stable under inserts; fast at any depth | Sequential only; a cursor may expire |
| Time window | `?since=2026-03-02T00:00Z&until=…` | Natural for incremental loads | Needs a reliable updated_at; ties and late updates at window edges |
| Link header | `Link: <…page=2>; rel="next"` | Client just follows URLs (works with either style) | Must parse a header; don’t build URLs yourself |

```python
with httpx.Client(base_url=BASE) as client:
    page1 = client.get("/api/items", params={"page": 1, "per_page": 5}).json()
    new_id = fakeapi.add_item()                    # a record arrives between our two calls
    page2 = client.get("/api/items", params={"page": 2, "per_page": 5}).json()
ids = [x["id"] for x in page1 + page2]
print("page 1:", [x["id"] for x in page1])
print("page 2:", [x["id"] for x in page2])
print("new item", new_id, "missed; duplicated:", sorted({i for i in ids if ids.count(i) > 1}))
fakeapi.reset()
```

Output:

```text
page 1: [23, 22, 21, 20, 19]
page 2: [19, 18, 17, 16, 15]
new item 24 missed; duplicated: [19]
```

> **On the job:** Offset paging over a table that changes during the extract is a classic silent-duplicate bug. If the API offers cursors, use them. If it only offers offsets, page over a frozen filter (`updated_before=<run start>`) and deduplicate on the key afterwards.

> **The main idea:** new records at the top shift every later page: offset paging duplicates (or, with deletes, skips) rows. Cursor/keyset pagination is stable under change.

*Read more:* [GitHub REST: pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api).

---

<a id="slide-9"></a>
## 9. Following Link headers

*Part A · let the server tell you the next URL*

Many APIs, GitHub’s REST API included, put pagination URLs in a **Link header** (RFC 8288): a comma-separated list of `<URL>; rel="next"` entries with relations `next`, `prev`, `first` and `last`. httpx parses it into `response.links`. The rule: follow `rel="next"` until it is missing; never construct page URLs yourself.

```python
with httpx.Client(base_url=BASE) as client:
    r = client.get("/api/items", params={"per_page": 10})
print(r.headers["link"].replace(BASE, ""))
print({rel: v["url"].replace(BASE, "") for rel, v in r.links.items()})

def paginate_links(client, path, params):
    """Yield every record, following rel="next" until the server stops sending it."""
    url, pages = path, 0
    while url:
        r = client.get(url, params=params).raise_for_status()
        pages += 1
        yield from r.json()
        url, params = r.links.get("next", {}).get("url"), None   # next URL already has the query
    print(f"  ({pages} pages)")

with httpx.Client(base_url=BASE) as client:
    items = list(paginate_links(client, "/api/items", {"per_page": 10}))
print(len(items), "items:", items[0], "...", items[-1])
```

Output:

```text
</api/items?page=2&per_page=10>; rel="next", </api/items?page=3&per_page=10>; rel="last"
{'next': '/api/items?page=2&per_page=10', 'last': '/api/items?page=3&per_page=10'}
  (3 pages)
23 items: {'id': 23, 'name': 'item-23'} ... {'id': 1, 'name': 'item-01'}
```

- `params=None` after the first page matters: the next URL already carries `page` and `per_page`; passing params again would merge or duplicate them.
- GitHub: ask for the maximum page size (`per_page=100`) to cut the number of requests; some endpoints switch to cursor parameters (`before`/`after`) inside the Link URLs, which this code handles unchanged.
- A generator (files-and-streams deck) keeps memory flat: the caller decides whether to collect, batch or stream the records.

> **On the job:** “Follow the next link until it disappears” is also how you page through Microsoft Graph (`@odata.nextLink` in the body) and many Azure REST APIs (`nextLink`). Same loop, different field.

> **The main idea:** treat pagination URLs as opaque: follow rel="next" (or the body’s next link) until it is absent, and yield records lazily.

*Read more:* [RFC 8288 Web Linking (Link header)](https://www.rfc-editor.org/rfc/rfc8288), [GitHub REST: pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api), [HTTPX quickstart](https://www.python-httpx.org/quickstart/).

---

<a id="slide-10"></a>
## 10. Cursor pagination: stable under change

*Part A · send back what the server gave you*

The fake `/api/events` endpoint returns `{"data": [...], "next_cursor": "..."}`. Records are ordered by a unique key (`id`), and the cursor means “after the last id you saw”. New records land after the cursor, so nothing shifts.

```python
def paginate_cursor(client, path, limit=20, on_page=None):
    cursor = None
    while True:
        params = {"limit": limit} | ({"cursor": cursor} if cursor else {})
        body = client.get(path, params=params).raise_for_status().json()
        yield from body["data"]
        if on_page:
            on_page(body)
        cursor = body["next_cursor"]
        if not cursor:
            return

def after_first_page(body, _done=[]):
    if not _done:
        _done.append(1)
        fakeapi.touch_events(new=2)                # two events arrive while we are paging

with httpx.Client(base_url=BASE) as client:
    events = list(paginate_cursor(client, "/api/events", limit=20, on_page=after_first_page))
ids = [e["id"] for e in events]
print(len(ids), "events, unique:", len(set(ids)), "| last ids:", ids[-3:])

import base64
c = "YWZ0ZXI6MjA"
print("a cursor is just encoded state:", base64.urlsafe_b64decode(c + "=").decode(), "(don't rely on that)")
fakeapi.reset()
```

Output:

```text
59 events, unique: 59 | last ids: [57, 58, 59]
a cursor is just encoded state: after:20 (don't rely on that)
```

#### Rules for cursors

- Treat the cursor as opaque: store it and send it back unchanged; its format can change any day.
- The order must be by a **unique, immutable** key (or a tuple ending in one, such as `(updated_at, id)`); otherwise ties at a page boundary are skipped.
- Cursors can expire. A long pause (or a resume the next day) may need a restart from a **watermark** instead (the highest `updated_at` already saved, from the files-and-streams deck).

#### Why it matters for resume

> **On the job:** The cursor is exactly what you checkpoint (slide 17): after a crash you resume from the last cursor whose page is safely stored, instead of starting over or guessing an offset.

> **The main idea:** cursor pagination survives inserts during the extract because it remembers a key, not a position. Keep cursors opaque and checkpoint them.

*Read more:* [GitHub REST: pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api), [dlt incremental loading](https://dlthub.com/docs/general-usage/incremental-loading).

---

<a id="slide-11"></a>
## 11. Which failures to retry, and which never to retry

*Part B · classify first, then retry*

A **transient** failure (files-and-streams deck) may succeed if you simply try again: a timeout, a dropped connection, a 503 during a deployment, a 429 from a rate limiter. A **permanent** failure will fail again: a 404, a 401 with a bad token, a 422 for an invalid request. Retrying permanent failures wastes time and hides bugs; retrying a non-idempotent request that might have succeeded creates duplicates.

| Failure | Retry a GET? | Retry a POST? | Why |
|---|---|---|---|
| `ConnectError`, `ConnectTimeout`, `PoolTimeout` | yes | yes | The request never reached the server |
| 429 Too Many Requests | yes, after `Retry-After` | yes | Rejected by the rate limiter before processing (RFC 6585) |
| 408, 425, 500, 502, 503, 504 | yes, with backoff | only with an idempotency key | The server may have done the work before failing |
| `ReadTimeout`, `ReadError`, `RemoteProtocolError` | yes | only with an idempotency key | Sent, but the answer was lost |
| 200 with a truncated or invalid body | yes (a few times) | no | A proxy or the server cut the response short |
| 400, 401, 403 (not rate limit), 404, 409, 422 | no | no | Fix the request, the token or the code; then rerun |
| Your own bug (KeyError, TypeError) | no | no | Retrying code bugs only delays the failure |

```python
import httpx

RETRYABLE_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})
IDEMPOTENT_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "PUT", "DELETE"})


class RetryableBody(Exception):
    """The response arrived but its body was unusable (truncated, malformed)."""


def is_retryable(method, status=None, exc=None):
    """Decide whether one failed attempt may be repeated."""
    if isinstance(exc, (httpx.ConnectError, httpx.ConnectTimeout, httpx.PoolTimeout)):
        return True                     # the request never reached the server
    if status == 429:
        return True                     # rejected by the rate limiter, not processed
    if method.upper() not in IDEMPOTENT_METHODS:
        return False                    # a POST may already have been applied
    if exc is not None:
        return isinstance(exc, (httpx.TimeoutException, httpx.NetworkError,
                                httpx.RemoteProtocolError, RetryableBody))
    return status in RETRYABLE_STATUS

cases = [("GET", 503, None), ("GET", 404, None), ("GET", 429, None), ("POST", 503, None),
         ("POST", 429, None), ("GET", None, httpx.ReadTimeout("read")),
         ("POST", None, httpx.ReadTimeout("read")), ("POST", None, httpx.ConnectError("refused")),
         ("GET", None, httpx.RemoteProtocolError("disconnected")), ("GET", 401, None)]
for method, status, exc in cases:
    what = str(status) if status else type(exc).__name__
    print(f"{method:<5} {what:<20} retry={is_retryable(method, status, exc)}")
```

Output:

```text
GET   503                  retry=True
GET   404                  retry=False
GET   429                  retry=True
POST  503                  retry=False
POST  429                  retry=True
GET   ReadTimeout          retry=True
POST  ReadTimeout          retry=False
POST  ConnectError         retry=True
GET   RemoteProtocolError  retry=True
GET   401                  retry=False
```

#### Idempotency keys (added)

Some APIs accept an `Idempotency-Key` header (an IETF draft, used by payment APIs): the client generates a unique key per logical operation and sends the *same* key on every retry; the server stores the first result and returns it again instead of repeating the work. That makes a POST safe to retry. Without such a key, don’t retry POSTs after the request was sent.

#### Write the policy down

> **On the job:** Write the retry rules down as a table like the one above and review it with whoever owns the API. “We retry everything 3 times” is how duplicate orders and doubled exports happen.

> **The main idea:** retry only transient failures of operations that are safe to repeat: GETs on timeouts, connection errors, 429 and 5xx; never 4xx client errors or your own bugs; POSTs only with an idempotency key.

*Read more:* [RFC 9110 §9.2 safe and idempotent methods](https://www.rfc-editor.org/rfc/rfc9110#section-9.2), [RFC 6585 §4: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585#section-4), [HTTPX exceptions](https://www.python-httpx.org/exceptions/), [IETF draft: Idempotency-Key header](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), [Azure: transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults).

---

<a id="slide-12"></a>
## 12. Exponential backoff with full jitter

*Part B · wait longer each time, and not all at once*

**Backoff** is waiting between retries so a struggling server can recover. **Exponential** backoff doubles the ceiling each attempt: 0.5 s, 1 s, 2 s, 4 s… up to a **cap**. **Jitter** adds randomness so that many clients that failed at the same moment don’t all retry at the same moment again (the **thundering herd**). With **full jitter** the delay is a uniform random number between 0 and the ceiling.

```python
import random


def full_jitter(attempt, base=0.5, cap=30.0, rng=random):
    """Delay before retry number attempt+1: uniform between 0 and min(cap, base * 2**attempt)."""
    return rng.uniform(0, min(cap, base * 2 ** attempt))

rng = random.Random(42)                    # seeded: the same delays on every run of this demo
print("attempt  ceiling  delay")
for attempt in range(7):
    ceiling = min(30.0, 0.5 * 2 ** attempt)
    print(f"{attempt + 1:>7}  {ceiling:>7.1f}  {full_jitter(attempt, rng=rng):>5.2f}")
```

Output:

```text
attempt  ceiling  delay
      1      0.5   0.32
      2      1.0   0.03
      3      2.0   0.55
      4      4.0   0.89
      5      8.0   5.89
      6     16.0  10.83
      7     30.0  26.77
```

```python
from collections import Counter

def peak_per_100ms(delays):
    return max(Counter(int(d * 10) for d in delays).values())

rng = random.Random(7)
ceiling = 4.0                                   # 1,000 clients all failed at t=0; this is attempt 4
strategies = {
    "no jitter (sleep 4 s)": [ceiling] * 1000,
    "equal jitter (2 s + 0..2 s)": [ceiling / 2 + rng.uniform(0, ceiling / 2) for _ in range(1000)],
    "full jitter (0..4 s)": [rng.uniform(0, ceiling) for _ in range(1000)],
}
for name, delays in strategies.items():
    print(f"{name:<28} peak retries in any 100 ms: {peak_per_100ms(delays):>4}")
```

Output:

```text
no jitter (sleep 4 s)        peak retries in any 100 ms: 1000
equal jitter (2 s + 0..2 s)  peak retries in any 100 ms:   61
full jitter (0..4 s)         peak retries in any 100 ms:   42
```

#### Settings that work

- **base** 0.5–1 s, **cap** 30–60 s, **max attempts** 5–8 for batch jobs.
- Also cap the *total* time spent retrying: a job that sleeps an hour on one page is worse than one that fails and alerts.
- Make the random generator injectable (`rng=`), and seed it in tests: deterministic tests, random production.

#### Who already does this

> **On the job:** Azure SDKs, the AWS SDKs and most cloud clients already back off with jitter. Your own loop is needed for plain REST APIs and for code that sits above an SDK, such as a whole file download.

> **The main idea:** double the ceiling each attempt, cap it, and pick a uniformly random delay below it. Full jitter spreads a herd of retries so the recovering server isn’t knocked over again.

*Read more:* [AWS: Exponential backoff and jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/), [Azure: Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry), [random](https://docs.python.org/3/library/random.html).

---

<a id="slide-13"></a>
## 13. Retry-After: when the server tells you how long to wait

*Part B · seconds or an HTTP-date*

A server sends `Retry-After` with 429 (too many requests) and 503 (unavailable), and sometimes with 3xx. The value is either **delay-seconds** (`120`) or an **HTTP-date** (`Mon, 02 Mar 2026 14:00:03 GMT`, always GMT). When present, honour it instead of your own backoff: the server knows when its limit resets.

```python
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


def parse_retry_after(value, now=None):
    """Seconds to wait from a Retry-After header: delay-seconds or an HTTP-date. None if absent or invalid."""
    if value is None:
        return None
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    return max(0.0, (when - now).total_seconds())

import fakeapi; BASE = fakeapi.BASE                 # the fake server from slide 4
now = datetime(2026, 3, 2, 14, 0, 0, tzinfo=timezone.utc)
for value in ["120", "Mon, 02 Mar 2026 14:00:30 GMT", "Mon, 02 Mar 2026 13:59:00 GMT", "soon", None]:
    print(f"{value!r:<34} -> {parse_retry_after(value, now)}")

fakeapi.inject("/api/items", (429, "http-date"))
r = httpx.get(BASE + "/api/items")
server_now = parsedate_to_datetime(r.headers["Date"])          # compare with the server's clock
print(r.status_code, "Retry-After:", r.headers["Retry-After"], "| Date:", r.headers["Date"])
print("wait", parse_retry_after(r.headers["Retry-After"], server_now), "s")
```

Output:

```text
'120'                              -> 120.0
'Mon, 02 Mar 2026 14:00:30 GMT'    -> 30.0
'Mon, 02 Mar 2026 13:59:00 GMT'    -> 0.0
'soon'                             -> None
None                               -> None
429 Retry-After: Mon, 02 Mar 2026 14:00:03 GMT | Date: Mon, 02 Mar 2026 14:00:00 GMT
wait 3.0 s
```

- A date in the past means “now”: clamp to zero, never sleep a negative time.
- Compute a date relative to the response’s own `Date` header when you can, so that a wrong clock on your machine doesn’t turn 3 seconds into an hour.
- Put a ceiling on it (added): if a server asks for 6 hours, fail the run and alert rather than holding a scheduler slot asleep.
- Rate limiters may also send provider headers instead (`x-ratelimit-reset`, next slide but one).

> **On the job:** Microsoft Graph, Azure Resource Manager and GitHub all send `Retry-After` on throttling. Ignoring it and retrying sooner usually extends the throttling window, so the job gets slower, not faster.

> **The main idea:** if the response carries Retry-After, wait exactly that long (seconds or HTTP-date, never negative, never beyond your ceiling); otherwise fall back to jittered backoff.

*Read more:* [RFC 9110 §10.2.3 Retry-After](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3), [RFC 9110 §5.6.7 HTTP-date](https://www.rfc-editor.org/rfc/rfc9110#section-5.6.7), [MDN: Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After), [RFC 6585 §4: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585#section-4), [email.utils.parsedate_to_datetime](https://docs.python.org/3/library/email.utils.html#email.utils.parsedate_to_datetime).

---

<a id="slide-14"></a>
## 14. Putting it together: a retry loop you can trust

*Part B · classify, back off or obey Retry-After, give up cleanly*

`send_with_retries(send)` takes a function that performs one attempt, so the same loop serves a JSON GET and, later, a whole streamed file download. Sleep, clock, random generator and logger are injected through a `RetryPolicy`, so tests run instantly and deterministically. `get_json` adds one rule: an HTTP 200 whose body isn’t valid JSON counts as a retryable failure.

<details><summary>Show the code (RetryPolicy, send_with_retries, get_json)</summary>

```python
import time
from dataclasses import dataclass, field


@dataclass
class RetryPolicy:
    max_attempts: int = 5
    base: float = 0.5                  # first backoff ceiling, seconds
    cap: float = 30.0                  # largest backoff ceiling, seconds
    max_retry_after: float = 120.0     # refuse to wait longer than this for one Retry-After
    rng: random.Random = field(default_factory=random.Random)
    sleep: object = time.sleep         # injectable, so tests don't really sleep
    now: object = None                 # injectable clock for HTTP-date Retry-After
    log: object = print


class RetryAfterTooLong(Exception):
    pass


def send_with_retries(send, *, method="GET", policy=None):
    """Call send() until it returns a response below 400, retrying only transient failures."""
    policy = policy or RetryPolicy()
    for attempt in range(1, policy.max_attempts + 1):
        last = attempt == policy.max_attempts
        try:
            resp = send()
            if resp.status_code < 400:
                return resp
            if last or not is_retryable(method, status=resp.status_code):
                resp.raise_for_status()
            reason = f"HTTP {resp.status_code}"
            wait = parse_retry_after(resp.headers.get("Retry-After"), policy.now() if policy.now else None)
        except (httpx.TransportError, RetryableBody) as exc:
            if last or not is_retryable(method, exc=exc):
                raise
            reason, wait = type(exc).__name__, None
        if wait is not None and wait > policy.max_retry_after:
            raise RetryAfterTooLong(f"server asked for {wait:.0f}s; limit is {policy.max_retry_after:.0f}s")
        delay = wait if wait is not None else full_jitter(attempt - 1, policy.base, policy.cap, policy.rng)
        source = "Retry-After" if wait is not None else "backoff"
        policy.log(f"attempt {attempt}/{policy.max_attempts} failed ({reason}); {source} {delay:.2f}s")
        policy.sleep(delay)


def get_json(client, url, *, policy=None, **kwargs):
    """GET with retries; a 200 whose body is not valid JSON counts as a retryable failure."""
    box = {}

    def send():
        resp = client.get(url, **kwargs)
        if resp.status_code < 400:
            try:
                box["data"] = resp.json()
            except ValueError as exc:
                raise RetryableBody(f"invalid JSON in {resp.url.path}") from exc
        return resp

    resp = send_with_retries(send, method="GET", policy=policy)
    return box["data"], resp
```

</details>

```python
fakeapi.inject("/api/items", 503, "reset", "timeout", "malformed", (429, "1"))
sleeps = []
policy = RetryPolicy(max_attempts=6, rng=random.Random(1), sleep=sleeps.append)
with httpx.Client(base_url=BASE, timeout=httpx.Timeout(2.0, read=0.3)) as client:
    data, resp = get_json(client, "/api/items", policy=policy, params={"per_page": 3})
print("result:", resp.status_code, [x["id"] for x in data], "| slept:", [round(s, 2) for s in sleeps])
print(*fakeapi.requests_log(), sep="\n")
```

Output:

```text
attempt 1/6 failed (HTTP 503); backoff 0.07s
attempt 2/6 failed (RemoteProtocolError); backoff 0.85s
attempt 3/6 failed (ReadTimeout); backoff 1.53s
attempt 4/6 failed (RetryableBody); backoff 1.02s
attempt 5/6 failed (HTTP 429); Retry-After 1.00s
result: 200 [23, 22, 21] | slept: [0.07, 0.85, 1.53, 1.02, 1.0]
GET /api/items -> (429, 'http-date')
GET /api/items?per_page=3 -> 503
GET /api/items?per_page=3 -> reset
GET /api/items?per_page=3 -> timeout
GET /api/items?per_page=3 -> malformed
GET /api/items?per_page=3 -> (429, '1')
GET /api/items?per_page=3 -> ok
```

```python
def attempt_count(status_plan, method="GET", attempts=3):
    fakeapi.inject("/api/items", *status_plan)
    policy = RetryPolicy(max_attempts=attempts, rng=random.Random(1), sleep=lambda s: None, log=lambda m: None)
    with httpx.Client(base_url=BASE) as client:
        try:
            send_with_retries(lambda: client.request(method, "/api/items"), method=method, policy=policy)
            outcome = "ok"
        except (httpx.HTTPStatusError, RetryAfterTooLong) as e:
            outcome = type(e).__name__
    n = len(fakeapi.requests_log())
    fakeapi.reset()
    return f"{outcome} after {n} request(s)"

print("404 on GET:          ", attempt_count([404]))
print("503 on POST:         ", attempt_count([503], method="POST"))
print("503 x5 on GET:       ", attempt_count([503] * 5))
print("429 Retry-After 600: ", attempt_count([(429, "600")]))
```

Output:

```text
404 on GET:           HTTPStatusError after 1 request(s)
503 on POST:          HTTPStatusError after 1 request(s)
503 x5 on GET:        HTTPStatusError after 3 request(s)
429 Retry-After 600:  RetryAfterTooLong after 1 request(s)
```

> **On the job:** In production, log every retry at WARNING with the reason and delay (as here), and count them. A job that “succeeds” after 400 retries is a problem you want on a dashboard before it becomes an outage.

> **The main idea:** one loop, three outcomes: success, a retry with a logged reason and a bounded delay, or a clean failure that raises the real error. Inject sleep, clock and randomness so the loop can be tested.

*Read more:* [HTTPX exceptions](https://www.python-httpx.org/exceptions/), [Azure: Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry), [MDN: 429](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429).

---

<a id="slide-15"></a>
## 15. Rate limits: read the headers, and limit yourself

*Part B · server-side quotas and a client-side token bucket*

A **rate limit** is a quota on requests per time window. GitHub’s REST API allows 60 requests per hour unauthenticated and 5,000 per hour for an authenticated user, reports the budget in `x-ratelimit-limit`, `-remaining`, `-used` and `-reset` (epoch seconds) headers, and also enforces **secondary** limits (concurrency, bursts) answered with 403 or 429 and often a `Retry-After`. Being polite on your side is cheaper than recovering from throttling.

```python
r = httpx.get(BASE + "/api/items")
rate = {k: r.headers[k] for k in r.headers if k.startswith("x-ratelimit")}
print(rate)

def seconds_until_allowed(headers, now_epoch):
    """0 if budget remains, else seconds until the window resets."""
    if int(headers.get("x-ratelimit-remaining", "1")) > 0:
        return 0.0
    return max(0.0, int(headers["x-ratelimit-reset"]) - now_epoch)

print(seconds_until_allowed(rate, now_epoch=fakeapi.STATE["clock"]))
print(seconds_until_allowed({**rate, "x-ratelimit-remaining": "0"}, now_epoch=fakeapi.STATE["clock"]))
```

Output:

```text
{'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '59', 'x-ratelimit-used': '1', 'x-ratelimit-reset': '1772463600'}
0.0
3600
```

A **token bucket** is the usual client-side limiter: a bucket holds up to *capacity* tokens and refills at *rate* tokens per second; each request takes one token and waits if the bucket is empty. It allows short bursts but caps the average rate.

```python
class TokenBucket:
    """Client-side rate limiter: at most `rate` requests per second on average, bursts up to `capacity`."""

    def __init__(self, rate, capacity, clock=time.monotonic, sleep=time.sleep):
        self.rate, self.capacity = rate, capacity
        self.clock, self.sleep = clock, sleep
        self.tokens, self.updated = float(capacity), clock()

    def acquire(self):
        while True:
            now = self.clock()
            self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
            self.updated = now
            if self.tokens >= 1:
                self.tokens -= 1
                return
            self.sleep((1 - self.tokens) / self.rate)


class FakeClock:                                  # time that only moves when we "sleep"
    def __init__(self):
        self.t = 0.0
    def __call__(self):
        return self.t
    def sleep(self, seconds):
        self.t += seconds

clock = FakeClock()
bucket = TokenBucket(rate=2, capacity=3, clock=clock, sleep=clock.sleep)
times = []
for _ in range(8):
    bucket.acquire()
    times.append(round(clock.t, 2))
print("request start times (s):", times)
```

Output:

```text
request start times (s): [0.0, 0.0, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5]
```

> **On the job:** Share one bucket per API credential across all threads (protect it with a `threading.Lock`), and set its rate a little below the published limit. For GitHub, also cap concurrency (a semaphore from the files-and-streams deck) and fetch with conditional requests (`If-None-Match`), which don’t count against the limit when nothing changed.

> **The main idea:** respect the server’s budget (remaining/reset headers, Retry-After) and enforce your own with a token bucket, so throttling is the exception, not the steady state.

*Read more:* [GitHub REST: rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [GitHub REST: best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api), [RFC 6585 §4: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585#section-4).

---

<a id="slide-16"></a>
## 16. httpkit.py: the pieces as one reusable module

*Part B · the paginated API lab and the project both import it*

The functions from the last five slides, unchanged, saved as `httpkit.py`: about 140 lines, standard library plus httpx. The cursor extractor on the next slide and the GH Archive ingester in Part D import it.

<details><summary>Show httpkit.py</summary>

```python
# httpkit.py
"""httpkit.py: retries, backoff with full jitter, Retry-After, and a token bucket for httpx clients."""

import httpx

RETRYABLE_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})
IDEMPOTENT_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "PUT", "DELETE"})


class RetryableBody(Exception):
    """The response arrived but its body was unusable (truncated, malformed)."""


def is_retryable(method, status=None, exc=None):
    """Decide whether one failed attempt may be repeated."""
    if isinstance(exc, (httpx.ConnectError, httpx.ConnectTimeout, httpx.PoolTimeout)):
        return True                     # the request never reached the server
    if status == 429:
        return True                     # rejected by the rate limiter, not processed
    if method.upper() not in IDEMPOTENT_METHODS:
        return False                    # a POST may already have been applied
    if exc is not None:
        return isinstance(exc, (httpx.TimeoutException, httpx.NetworkError,
                                httpx.RemoteProtocolError, RetryableBody))
    return status in RETRYABLE_STATUS


import random


def full_jitter(attempt, base=0.5, cap=30.0, rng=random):
    """Delay before retry number attempt+1: uniform between 0 and min(cap, base * 2**attempt)."""
    return rng.uniform(0, min(cap, base * 2 ** attempt))


from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


def parse_retry_after(value, now=None):
    """Seconds to wait from a Retry-After header: delay-seconds or an HTTP-date. None if absent or invalid."""
    if value is None:
        return None
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    return max(0.0, (when - now).total_seconds())


import time
from dataclasses import dataclass, field


@dataclass
class RetryPolicy:
    max_attempts: int = 5
    base: float = 0.5                  # first backoff ceiling, seconds
    cap: float = 30.0                  # largest backoff ceiling, seconds
    max_retry_after: float = 120.0     # refuse to wait longer than this for one Retry-After
    rng: random.Random = field(default_factory=random.Random)
    sleep: object = time.sleep         # injectable, so tests don't really sleep
    now: object = None                 # injectable clock for HTTP-date Retry-After
    log: object = print


class RetryAfterTooLong(Exception):
    pass


def send_with_retries(send, *, method="GET", policy=None):
    """Call send() until it returns a response below 400, retrying only transient failures."""
    policy = policy or RetryPolicy()
    for attempt in range(1, policy.max_attempts + 1):
        last = attempt == policy.max_attempts
        try:
            resp = send()
            if resp.status_code < 400:
                return resp
            if last or not is_retryable(method, status=resp.status_code):
                resp.raise_for_status()
            reason = f"HTTP {resp.status_code}"
            wait = parse_retry_after(resp.headers.get("Retry-After"), policy.now() if policy.now else None)
        except (httpx.TransportError, RetryableBody) as exc:
            if last or not is_retryable(method, exc=exc):
                raise
            reason, wait = type(exc).__name__, None
        if wait is not None and wait > policy.max_retry_after:
            raise RetryAfterTooLong(f"server asked for {wait:.0f}s; limit is {policy.max_retry_after:.0f}s")
        delay = wait if wait is not None else full_jitter(attempt - 1, policy.base, policy.cap, policy.rng)
        source = "Retry-After" if wait is not None else "backoff"
        policy.log(f"attempt {attempt}/{policy.max_attempts} failed ({reason}); {source} {delay:.2f}s")
        policy.sleep(delay)


def get_json(client, url, *, policy=None, **kwargs):
    """GET with retries; a 200 whose body is not valid JSON counts as a retryable failure."""
    box = {}

    def send():
        resp = client.get(url, **kwargs)
        if resp.status_code < 400:
            try:
                box["data"] = resp.json()
            except ValueError as exc:
                raise RetryableBody(f"invalid JSON in {resp.url.path}") from exc
        return resp

    resp = send_with_retries(send, method="GET", policy=policy)
    return box["data"], resp


class TokenBucket:
    """Client-side rate limiter: at most `rate` requests per second on average, bursts up to `capacity`."""

    def __init__(self, rate, capacity, clock=time.monotonic, sleep=time.sleep):
        self.rate, self.capacity = rate, capacity
        self.clock, self.sleep = clock, sleep
        self.tokens, self.updated = float(capacity), clock()

    def acquire(self):
        while True:
            now = self.clock()
            self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
            self.updated = now
            if self.tokens >= 1:
                self.tokens -= 1
                return
            self.sleep((1 - self.tokens) / self.rate)
```

</details>

```python
import importlib, inspect, httpkit
importlib.reload(httpkit)
print([name for name, obj in inspect.getmembers(httpkit)
       if (inspect.isfunction(obj) or inspect.isclass(obj)) and obj.__module__ == "httpkit"])
print(sorted(httpkit.RETRYABLE_STATUS))
```

Output:

```text
['RetryAfterTooLong', 'RetryPolicy', 'RetryableBody', 'TokenBucket', 'full_jitter', 'get_json', 'is_retryable', 'parse_retry_after', 'send_with_retries']
[408, 425, 429, 500, 502, 503, 504]
```

| Name | Responsibility | Slide |
|---|---|---|
| `is_retryable`, `RETRYABLE_STATUS` | the classification table as code | 11 |
| `full_jitter` | exponential ceiling, uniform random delay | 12 |
| `parse_retry_after` | seconds or HTTP-date → seconds, clamped | 13 |
| `RetryPolicy`, `send_with_retries`, `get_json` | the loop and its injectable dependencies | 14 |
| `TokenBucket` | client-side rate limit | 15 |

> **The main idea:** keep retry logic in one small, tested module with injectable sleep/clock/randomness, instead of copying a different loop into every script.

*Read more:* [HTTPX clients](https://www.python-httpx.org/advanced/clients/).

---

<a id="slide-17"></a>
## 17. Checkpointing the cursor: crash, then resume

*Part B · the paginated API lab*

A **checkpoint** is saved progress that lets a restarted job continue instead of starting over. For a cursor API, the checkpoint is “the cursor after the last page that is safely stored”. The order matters: **write the page, then save the checkpoint**, both atomically (temp file + `os.replace`, files-and-streams deck). A crash between the two only means one page is fetched again, and because the page file has a deterministic name it is simply overwritten: no duplicates.

```python
import json, os
from pathlib import Path
from httpkit import RetryPolicy, get_json

class SimulatedCrash(Exception):
    pass

def write_atomic(path, text):
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)

def extract_events(client, out_dir, *, limit=20, policy=None, crash_after_page=None):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ckpt = out_dir / "_checkpoint.json"
    state = json.loads(ckpt.read_text()) if ckpt.exists() else {"cursor": None, "pages": 0, "done": False}
    if state["done"]:
        return state
    while True:
        params = {"limit": limit} | ({"cursor": state["cursor"]} if state["cursor"] else {})
        body, _ = get_json(client, "/api/events", params=params, policy=policy)
        page = state["pages"] + 1
        write_atomic(out_dir / f"page-{page:05d}.jsonl", "".join(json.dumps(e) + "\n" for e in body["data"]))
        if page == crash_after_page:
            raise SimulatedCrash(f"after writing page {page}, before its checkpoint")
        state = {"cursor": body["next_cursor"], "pages": page, "done": body["next_cursor"] is None}
        write_atomic(ckpt, json.dumps(state))
        if state["done"]:
            return state
```

```python
fakeapi.requests_log()                                  # clear the server's request log
quiet = RetryPolicy(log=lambda m: None, sleep=lambda s: None)
with httpx.Client(base_url=BASE) as client:
    try:
        extract_events(client, "api_lab/events", policy=quiet, crash_after_page=2)
    except SimulatedCrash as e:
        print("crash:", e)
    print("after crash:", sorted(p.name for p in Path("api_lab/events").iterdir()),
          json.loads(Path("api_lab/events/_checkpoint.json").read_text()))
    print("resume:", extract_events(client, "api_lab/events", policy=quiet))
    print("rerun: ", extract_events(client, "api_lab/events", policy=quiet))
print(*fakeapi.requests_log(), sep="\n")
ids = [json.loads(l)["id"] for p in sorted(Path("api_lab/events").glob("page-*.jsonl")) for l in p.open()]
print(len(ids), "records,", len(set(ids)), "unique; source has", len(fakeapi.STATE["events"]))
```

Output:

```text
crash: after writing page 2, before its checkpoint
after crash: ['_checkpoint.json', 'page-00001.jsonl', 'page-00002.jsonl'] {'cursor': 'YWZ0ZXI6MjA', 'pages': 1, 'done': False}
resume: {'cursor': None, 'pages': 3, 'done': True}
rerun:  {'cursor': None, 'pages': 3, 'done': True}
GET /api/events?limit=20 -> ok
GET /api/events?limit=20&cursor=YWZ0ZXI6MjA -> ok
GET /api/events?limit=20&cursor=YWZ0ZXI6MjA -> ok
GET /api/events?limit=20&cursor=YWZ0ZXI6NDA -> ok
57 records, 57 unique; source has 57
```

> **On the job:** This is **at-least-once** delivery (a page may be fetched twice) made **effectively-once** by an idempotent write (same page, same file name). Message queues, Kafka consumers and CDC tools work on exactly the same principle: commit the offset only after the data is durable.

> **The main idea:** store the data first and the checkpoint second, both atomically, with deterministic file names. A crash at any point then costs at most one repeated page and never a duplicate.

*Read more:* [os.replace](https://docs.python.org/3/library/os.html#os.replace), [GitHub REST: pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api).

---

<a id="slide-18"></a>
## 18. The API lab end to end: chaos in, exact counts out

*Part B · every failure type at once, then reconcile*

Run the extractor from scratch while the server injects one of each failure. Sleeps are recorded instead of slept, with a seeded generator, so the run is fast and repeatable. At the end, **reconcile**: compare what you stored with what the source has. Here the fake server can tell us its true count; real APIs sometimes return a `total_count`, and otherwise you reconcile against a later re-count or a downstream system.

```python
fakeapi.reset()
fakeapi.inject("/api/events", "malformed", 503, (429, "1"), "reset", "timeout", 502)
log_lines, sleeps = [], []
policy = RetryPolicy(max_attempts=8, rng=random.Random(3), sleep=sleeps.append, log=log_lines.append)
with httpx.Client(base_url=BASE, timeout=httpx.Timeout(2.0, read=0.3)) as client:
    state = extract_events(client, "api_lab/run2", limit=20, policy=policy)
print(*log_lines, sep="\n")
print("state:", state, "| total sleep:", round(sum(sleeps), 2), "s")
stored = [json.loads(l) for p in sorted(Path("api_lab/run2").glob("page-*.jsonl")) for l in p.open()]
source = fakeapi.STATE["events"]
print(f"stored {len(stored)} | unique {len({e['id'] for e in stored})} | source {len(source)} | "
      f"identical: {stored == source}")
```

Output:

```text
attempt 1/8 failed (RetryableBody); backoff 0.12s
attempt 2/8 failed (HTTP 503); backoff 0.54s
attempt 3/8 failed (HTTP 429); Retry-After 1.00s
attempt 4/8 failed (RemoteProtocolError); backoff 1.48s
attempt 5/8 failed (ReadTimeout); backoff 4.83s
attempt 6/8 failed (HTTP 502); backoff 10.01s
state: {'cursor': None, 'pages': 3, 'done': True} | total sleep: 17.99 s
stored 57 | unique 57 | source 57 | identical: True
```

#### What this proves

- Six different failures, zero lost or duplicated records, and the stored data equals the source exactly.
- Each failure is logged with its reason and delay, so a reviewer can see what happened without a debugger.
- The recorded sleeps are bounded by `cap` and `max_attempts`; in production they would really be slept, so set both with the job’s time budget in mind.

#### Make it a habit

> **On the job:** This exact test (chaos in, reconcile out) is worth writing for every connector you own. Run it in CI against a fake, and run the reconcile half against production after every load.

> **The main idea:** a reliable extractor is one whose output you can reconcile with the source after a run full of failures: same records, no duplicates, and a log that explains every retry.

*Read more:* [Azure: transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults).

---

<a id="slide-19"></a>
## 19. Testing HTTP code offline: MockTransport and RESPX

*Part B · unit tests that never touch the network (added)*

The fake server is good for demos and integration tests. For unit tests, httpx can swap its network layer: `httpx.MockTransport(handler)` calls your function instead of opening a socket, and the **RESPX** library patches httpx so that routes return canned responses or raise exceptions. Tests run in milliseconds and can produce failures that are hard to trigger for real.

```python
# test_httpkit.py
"""test_httpkit.py: offline tests for retry behaviour, with httpx.MockTransport and RESPX."""
import random
import httpx
import pytest
import respx
from httpkit import RetryPolicy, get_json, send_with_retries


def policy(sleeps):
    return RetryPolicy(max_attempts=4, rng=random.Random(0), sleep=sleeps.append, log=lambda m: None)


def test_retries_503_then_succeeds():
    calls = []
    def handler(request):                          # a function that plays the server
        calls.append(request.url.path)
        return httpx.Response(503) if len(calls) < 3 else httpx.Response(200, json={"ok": True})
    sleeps = []
    with httpx.Client(transport=httpx.MockTransport(handler), base_url="https://api.test") as c:
        data, resp = get_json(c, "/things", policy=policy(sleeps))
    assert data == {"ok": True} and len(calls) == 3 and len(sleeps) == 2


def test_honours_retry_after_and_never_retries_404():
    replies = iter([httpx.Response(429, headers={"Retry-After": "7"}), httpx.Response(404)])
    sleeps = []
    with httpx.Client(transport=httpx.MockTransport(lambda r: next(replies))) as c:
        with pytest.raises(httpx.HTTPStatusError) as err:
            send_with_retries(lambda: c.get("https://api.test/x"), policy=policy(sleeps))
    assert sleeps == [7.0] and err.value.response.status_code == 404


def test_post_is_not_retried_after_503():
    calls = []
    def handler(request):
        calls.append(request.method)
        return httpx.Response(503)
    with httpx.Client(transport=httpx.MockTransport(handler)) as c:
        with pytest.raises(httpx.HTTPStatusError):
            send_with_retries(lambda: c.post("https://api.test/jobs"), method="POST", policy=policy([]))
    assert calls == ["POST"]


@respx.mock
def test_timeout_then_success_with_respx():
    route = respx.get("https://api.test/items").mock(
        side_effect=[httpx.ReadTimeout("slow"), httpx.Response(200, json=[1, 2, 3])])
    sleeps = []
    with httpx.Client() as c:
        data, _ = get_json(c, "https://api.test/items", policy=policy(sleeps))
    assert data == [1, 2, 3] and route.call_count == 2 and len(sleeps) == 1
```

Terminal (duration measured on the build machine):

```text
$ python -m pytest -q -p no:cacheprovider test_httpkit.py
....                                                                     [100%]
4 passed in 0.60s
```

| Tool | Use it for |
|---|---|
| `httpx.MockTransport` | Built in. A handler function returns responses; good for sequences of replies and checking the requests made |
| RESPX | Route-based mocking (`respx.get(url)`), side effects that raise httpx exceptions, call counting; works for sync and async clients |
| A local fake server | End-to-end tests of real sockets, timeouts and truncated bodies (this deck’s `fakeapi.py`) |

> **On the job:** Tests for “no retry on POST” and “honours Retry-After” are the ones reviewers ask for. They encode the retry policy so a future refactor can’t silently change it.

> **The main idea:** test retry behaviour without a network: MockTransport or RESPX for unit tests, a local fake server for end-to-end failure tests, and seeded randomness everywhere.

*Read more:* [HTTPX transports (MockTransport)](https://www.python-httpx.org/advanced/transports/), [RESPX](https://lundberg.github.io/respx/).

---

<a id="slide-20"></a>
## 20. GH Archive: the public GitHub timeline as hourly files

*Part C · the second lab’s source*

**GH Archive** records GitHub’s public event stream (pushes, pull requests, issues, stars…) and publishes it as one file per hour: `https://data.gharchive.org/YYYY-MM-DD-H.json.gz`. Each file is gzip-compressed **JSON Lines**, one event per line, and hours are **UTC** with **no zero-padding** (`-3`, not `-03`). No account or token is needed. This deck’s window is the UTC day **2026-03-02**: 24 files, from `00:00` inclusive to `2026-03-03T00:00` exclusive.

```python
from datetime import datetime, timedelta, timezone

start = datetime(2026, 3, 2, tzinfo=timezone.utc)
end = start + timedelta(days=1)                                   # [start, end): end is exclusive
names = [f"{h:%Y-%m-%d}-{h.hour}.json.gz" for h in (start + timedelta(hours=i) for i in range(24))]
print(len(names), "files:", names[:3], "...", names[-2:])
print("one URL:", "https://data.gharchive.org/" + names[15])
print("window:", start.isoformat(), "->", end.isoformat())
```

Output:

```text
24 files: ['2026-03-02-0.json.gz', '2026-03-02-1.json.gz', '2026-03-02-2.json.gz'] ... ['2026-03-02-22.json.gz', '2026-03-02-23.json.gz']
one URL: https://data.gharchive.org/2026-03-02-15.json.gz
window: 2026-03-02T00:00:00+00:00 -> 2026-03-03T00:00:00+00:00
```

| Field | Type in the JSON | Notes for ingestion |
|---|---|---|
| `id` | string of digits | Unique event id. A *string*; compare numerically, not as text. Not ordered by time |
| `type` | string | `PushEvent`, `PullRequestEvent`, `IssuesEvent`, `WatchEvent`, … |
| `actor` | object | `id`, `login`, `display_login`, `gravatar_id`, `url`, `avatar_url` |
| `repo` | object | `id`, `name` (`owner/repo`), `url`. Names can change; ids don’t |
| `payload` | object | Different shape per `type`: keep it as raw JSON in the first layer |
| `public` | boolean | Always true in GH Archive |
| `created_at` | string | UTC, second precision, e.g. `2026-03-02T15:00:02Z` |
| `org` | object, *optional* | Only when the repository belongs to an organisation |

> **On the job:** Hourly archive files are the batch-friendly face of an event stream. The same shape appears as daily exports from SaaS tools, cloud billing exports, or a vendor’s SFTP drop: a predictable name per period, immutable once published, and “did we get all of them?” as the main question.

> **The main idea:** GH Archive is 24 immutable, predictable gzip JSONL files per UTC day with a nested, partly optional schema. Define the window in UTC with an exclusive end.

*Read more:* [GH Archive](https://www.gharchive.org/), [GitHub event types](https://docs.github.com/en/rest/using-the-rest-api/github-event-types).

---

<a id="slide-21"></a>
## 21. An offline fixture with the real schema, and every trap planted

*Part C · synthetic GH Archive hours, deterministic bytes*

A **fixture** is fixed test data. This one mimics GH Archive exactly in file names, compression and event schema, but every value is synthetic and seeded. It is deliberately large (about 132,000 events) so that the three chosen repositories, **microsoft/vscode**, **apache/iceberg** and **astral-sh/ruff**, exceed the 100,000-event cap. The fake server serves these files as if it were `data.gharchive.org`.

<details><summary>Show make_fixture.py</summary>

```python
# make_fixture.py
"""make_fixture.py: synthetic GH Archive hours with the real event schema, for offline tests.

Writes 24 files named like GH Archive's (YYYY-MM-DD-H.json.gz, hour not zero-padded).
Volumes are inflated on purpose so that the three target repositories exceed the 100,000-event cap.
Every value is synthetic; ids, logins and SHAs come from a seeded random generator.
"""
import argparse, gzip, json, random
from datetime import datetime, timedelta, timezone
from pathlib import Path

TARGETS = [("microsoft/vscode", 1001, 0.50), ("apache/iceberg", 1002, 0.20), ("astral-sh/ruff", 1003, 0.30)]
NOISE = [("microsoft/vscode-docs", 2001), ("octo-org/website", 2002), ("example/data-tools", 2003),
         ("someone/dotfiles", 2004), ("acme/etl", 2005)]
ORGS = {"microsoft": 9001, "apache": 9002, "astral-sh": 9003, "octo-org": 9004, "acme": 9005}
TYPES = ["PushEvent", "CreateEvent", "PullRequestEvent", "IssueCommentEvent", "IssuesEvent",
         "PullRequestReviewEvent", "WatchEvent", "ForkEvent", "ReleaseEvent", "DeleteEvent"]
WEIGHTS = [60, 9, 6, 6, 4, 4, 5, 2, 1, 3]


def payload(rng, etype, repo_id):
    if etype == "PushEvent":
        return {"repository_id": repo_id, "push_id": rng.randrange(10**10), "ref": "refs/heads/main",
                "head": "%040x" % rng.getrandbits(160)}
    if etype in ("PullRequestEvent", "IssuesEvent"):
        return {"action": rng.choice(["opened", "closed", "reopened"]), "number": rng.randrange(1, 30000)}
    if etype == "IssueCommentEvent":
        return {"action": "created", "issue": {"number": rng.randrange(1, 30000)}}
    if etype in ("CreateEvent", "DeleteEvent"):
        return {"ref": f"feature-{rng.randrange(1000)}", "ref_type": "branch"}
    return {"action": "started"} if etype == "WatchEvent" else {}


def make_event(rng, eid, ts, repo, repo_id):
    user = rng.randrange(1, 5000)
    login = f"user-{user:04d}"
    etype = rng.choices(TYPES, WEIGHTS)[0]
    e = {"id": str(eid), "type": etype,
         "actor": {"id": 100000 + user, "login": login, "display_login": login, "gravatar_id": "",
                   "url": f"https://api.github.com/users/{login}",
                   "avatar_url": f"https://avatars.githubusercontent.com/u/{100000 + user}?"},
         "repo": {"id": repo_id, "name": repo, "url": f"https://api.github.com/repos/{repo}"},
         "payload": payload(rng, etype, repo_id), "public": True,
         "created_at": ts.strftime("%Y-%m-%dT%H:%M:%SZ")}
    owner = repo.split("/")[0]
    if owner in ORGS:
        e["org"] = {"id": ORGS[owner], "login": owner, "gravatar_id": "",
                    "url": f"https://api.github.com/orgs/{owner}",
                    "avatar_url": f"https://avatars.githubusercontent.com/u/{ORGS[owner]}?"}
    return e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default="2026-03-02")
    ap.add_argument("--out", type=Path, default=Path("fixture/gharchive"))
    ap.add_argument("--target-per-hour", type=int, default=4500)
    ap.add_argument("--noise-per-hour", type=int, default=1000)
    ap.add_argument("--seed", type=int, default=20260302)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    day = datetime.fromisoformat(a.date).replace(tzinfo=timezone.utc)
    a.out.mkdir(parents=True, exist_ok=True)
    used_ids, previous_hour_targets, totals = set(), [], {"events": 0, "planted": 0}

    def new_id(hour):
        while True:
            eid = 50_000_000_000 + hour * 4_000_000 + rng.randrange(8_000_000)   # not monotonic in time
            if eid not in used_ids:
                used_ids.add(eid)
                return eid

    for hour in range(24):
        start = day + timedelta(hours=hour)
        events = []
        for repo, rid, share in TARGETS:
            for _ in range(int(a.target_per_hour * share)):
                events.append(make_event(rng, new_id(hour), start + timedelta(seconds=rng.randrange(3600)), repo, rid))
        for _ in range(a.noise_per_hour):
            repo, rid = rng.choice(NOISE)
            events.append(make_event(rng, new_id(hour), start + timedelta(seconds=rng.randrange(3600)), repo, rid))
        events.sort(key=lambda e: e["created_at"])            # roughly time-ordered, ids are not
        lines = [json.dumps(e, separators=(",", ":")) for e in events]
        planted = []
        if hour == 0:                                          # late events from the previous UTC day
            for k in range(2):
                e = make_event(rng, new_id(hour), day - timedelta(seconds=2 - k), "microsoft/vscode", 1001)
                planted.append(json.dumps(e, separators=(",", ":")))
        if hour == 6:                                          # redelivered: copies of 3 target events of hour 5
            planted += previous_hour_targets[:3]
        if hour == 7:                                          # truncated JSON lines
            planted += [lines[10][:57], lines[20][:31]]
        if hour == 11:                                         # empty repo object (seen in real GH Archive data)
            for k in range(3):
                e = make_event(rng, new_id(hour), start + timedelta(minutes=5 + k), "microsoft/vscode", 1001)
                e["repo"] = {}
                planted.append(json.dumps(e, separators=(",", ":")))
        if hour == 13:                                         # missing created_at
            e = make_event(rng, new_id(hour), start, "apache/iceberg", 1002)
            del e["created_at"]
            planted.append(json.dumps(e, separators=(",", ":")))
        if hour == 17:                                         # non-numeric id
            e = make_event(rng, new_id(hour), start, "astral-sh/ruff", 1003)
            e["id"] = "x" + e["id"]
            planted.append(json.dumps(e, separators=(",", ":")))
        if hour == 19:                                         # valid JSON, but not an object
            planted.append('["not", "an", "event"]')
        for k, line in enumerate(planted):                     # spread planted lines through the file
            lines.insert(50 + 97 * k, line)
        previous_hour_targets = [l for l in lines[200:260] if '"name":"apache/iceberg"' in l]
        path = a.out / f"{start:%Y-%m-%d}-{hour}.json.gz"
        with open(path, "wb") as raw, gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=6, mtime=0) as gz:
            gz.write(("\n".join(lines) + "\n").encode("utf-8"))    # mtime=0: identical bytes on every run
        totals["events"] += len(lines)
        totals["planted"] += len(planted)
    files = sorted(a.out.glob("*.json.gz"), key=lambda p: int(p.name.rsplit("-", 1)[1].split(".")[0]))
    print(f"{len(files)} files, {totals['events']:,} lines ({totals['planted']} planted problems), "
          f"{sum(p.stat().st_size for p in files) / 1e6:.1f} MB compressed")
    for p in files[:2] + files[-1:]:
        print(f"  {p.name:<22} {p.stat().st_size:>9,} bytes")


if __name__ == "__main__":
    main()
```

Output:

```text
$ python make_fixture.py
24 files, 132,013 lines (13 planted problems), 7.6 MB compressed
  2026-03-02-0.json.gz     312,722 bytes
  2026-03-02-1.json.gz     314,753 bytes
  2026-03-02-23.json.gz    314,653 bytes
```

</details>

| Planted problem | Where | Expected outcome |
|---|---|---|
| 2 events from 23:59:58–59 on the *previous* day | hour 0 | filtered (outside the window) |
| 3 lines repeated from hour 5 (a redelivery) | hour 6 | counted as duplicates, kept once |
| 2 lines cut off mid-JSON | hour 7 | quarantined: `invalid_json` |
| 3 events with `"repo": {}` (seen in real data: see the optional real-hour slide) | hour 11 | quarantined: `bad_repo` |
| 1 event without `created_at` | hour 13 | quarantined: `bad_created_at` |
| 1 event with id `x5…` | hour 17 | quarantined: `bad_id` |
| 1 line that is a JSON array | hour 19 | quarantined: `not_an_object` |
| `microsoft/vscode-docs`, a name that *starts with* a target | every hour | filtered (not one of the three repos) |
| Many events sharing the same second | every hour | ordered by the tie-breaker (event id) |

```python
import gzip, json
with gzip.open("fixture/gharchive/2026-03-02-0.json.gz", "rt", encoding="utf-8") as f:
    first = json.loads(next(f))
print(json.dumps(first, indent=1)[:900])
```

Output:

```text
{
 "id": "50006384123",
 "type": "PushEvent",
 "actor": {
  "id": 104004,
  "login": "user-4004",
  "display_login": "user-4004",
  "gravatar_id": "",
  "url": "https://api.github.com/users/user-4004",
  "avatar_url": "https://avatars.githubusercontent.com/u/104004?"
 },
 "repo": {
  "id": 2003,
  "name": "example/data-tools",
  "url": "https://api.github.com/repos/example/data-tools"
 },
 "payload": {
  "repository_id": 2003,
  "push_id": 902294211,
  "ref": "refs/heads/main",
  "head": "abf50ab6b0b196aa9b1e3bf91bb72dd03951e25e"
 },
 "public": true,
 "created_at": "2026-03-02T00:00:00Z"
}
```

> **On the job:** Writing gzip with `mtime=0` (added) makes the fixture byte-for-byte identical on every run (gzip otherwise stores the current time in its header), so file hashes in tests and manifests are stable.

> **The main idea:** build a fixture that copies the real format and plants every known problem with a known expected outcome. It is the test oracle for everything that follows.

*Read more:* [GH Archive](https://www.gharchive.org/), [gzip](https://docs.python.org/3/library/gzip.html).

---

<a id="slide-22"></a>
## 22. Streaming downloads: temp file, verify, then rename

*Part C · never hold a 30 MB file in memory, never trust a half download*

`client.stream("GET", url)` opens the response without reading the body; you then pull it in chunks and write each chunk to disk, so memory stays flat. The download goes to `name.part`; only after the size matches `Content-Length` and the MD5 matches the **ETag** (an identifier the server sends for this exact content; GH Archive’s is the file’s MD5) is it renamed into place with `os.replace`. A **sidecar** `.meta.json` with the SHA-256 is written last: it is this file’s checkpoint.

```python
import random
from pathlib import Path
import fakeapi, httpx
from httpkit import RetryAfterTooLong, RetryableBody, RetryPolicy, send_with_retries
fakeapi.STATE["gha_dir"] = str(Path("fixture/gharchive").resolve())   # the fake server now serves the fixture
import hashlib, json, os, re
from pathlib import Path


def sha256_file(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(chunk):
            h.update(block)
    return h.hexdigest()


def download_verified(client, url, dest, *, policy=None):
    """Stream url into dest via dest.part, verify size and checksum, then rename atomically.
    A verified file with a matching .meta.json sidecar is a checkpoint: it is not downloaded again."""
    dest = Path(dest)
    meta_path = dest.with_name(dest.name + ".meta.json")
    if dest.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta["bytes"] == dest.stat().st_size and sha256_file(dest) == meta["sha256"]:
            return {**meta, "status": "cached"}
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + ".part")
    meta = {}

    def attempt():
        with client.stream("GET", url) as resp:
            if resp.status_code >= 400:
                resp.read()
                return resp
            sha, md5, n = hashlib.sha256(), hashlib.md5(), 0
            with open(part, "wb") as f:
                for chunk in resp.iter_raw(1 << 16):        # raw bytes: never auto-decompressed
                    f.write(chunk); sha.update(chunk); md5.update(chunk); n += len(chunk)
            expected = resp.headers.get("Content-Length")
            if expected is not None and int(expected) != n:
                raise RetryableBody(f"got {n} of {expected} bytes")
            etag = resp.headers.get("ETag", "").strip('"')
            if re.fullmatch(r"[0-9a-f]{32}", etag) and etag != md5.hexdigest():
                raise RetryableBody("MD5 does not match ETag")
            meta.update(url=url, bytes=n, sha256=sha.hexdigest(), etag=etag)
            return resp

    try:
        send_with_retries(attempt, method="GET", policy=policy)
    except BaseException:
        part.unlink(missing_ok=True)
        raise
    os.replace(part, dest)                                   # atomic: dest is complete or absent
    tmp = meta_path.with_name(meta_path.name + ".tmp")
    tmp.write_text(json.dumps(meta, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, meta_path)                               # the checkpoint is written last
    return {**meta, "status": "downloaded"}
```

```python
fakeapi.requests_log()                                   # clear the server's request log
fakeapi.inject("/gharchive/2026-03-02-0.json.gz", "truncate", 503)
policy = RetryPolicy(rng=random.Random(5), sleep=lambda s: None)
landing = Path("landing")
with httpx.Client(base_url=fakeapi.BASE + "/gharchive/", timeout=httpx.Timeout(10, read=60)) as client:
    for _ in range(2):
        meta = download_verified(client, "2026-03-02-0.json.gz", landing / "2026-03-02-0.json.gz", policy=policy)
        print(meta["status"], f"{meta['bytes']:,} bytes", "sha256", meta["sha256"][:16])
    print(*fakeapi.requests_log(), sep="\n")
    quiet = RetryPolicy(log=lambda m: None, sleep=lambda s: None)
    statuses = [download_verified(client, f"2026-03-02-{h}.json.gz", landing / f"2026-03-02-{h}.json.gz",
                                  policy=quiet)["status"] for h in range(24)]
from collections import Counter
print(dict(Counter(statuses)))
print(sorted(p.name for p in landing.iterdir())[:4], "... no .part files:", not list(landing.glob("*.part")))
```

Output:

```text
attempt 1/5 failed (RemoteProtocolError); backoff 0.31s
attempt 2/5 failed (HTTP 503); backoff 0.74s
downloaded 312,722 bytes sha256 51e711d17fdb252a
cached 312,722 bytes sha256 51e711d17fdb252a
GET /gharchive/2026-03-02-0.json.gz -> truncate
GET /gharchive/2026-03-02-0.json.gz -> 503
GET /gharchive/2026-03-02-0.json.gz -> ok
{'cached': 1, 'downloaded': 23}
['2026-03-02-0.json.gz', '2026-03-02-0.json.gz.meta.json', '2026-03-02-1.json.gz', '2026-03-02-1.json.gz.meta.json'] ... no .part files: True
```

```python
import gzip as gz
body = gz.compress(b'{"id": "1"}\n', mtime=0)
handler = lambda request: httpx.Response(200, stream=httpx.ByteStream(body), headers={"Content-Encoding": "gzip"})
with httpx.Client(transport=httpx.MockTransport(handler)) as c:
    with c.stream("GET", "https://files.test/a.json.gz") as r:
        print("iter_bytes:", b"".join(r.iter_bytes()))      # decoded: no longer a .gz file!
    with c.stream("GET", "https://files.test/a.json.gz") as r:
        print("iter_raw:  ", b"".join(r.iter_raw())[:3], "... (gzip magic bytes, as sent)")
```

Output:

```text
iter_bytes: b'{"id": "1"}\n'
iter_raw:   b'\x1f\x8b\x08' ... (gzip magic bytes, as sent)
```

> **On the job:** If a server labels a `.gz` download with `Content-Encoding: gzip` (added), `iter_bytes()` silently decompresses it and you save plain JSON under a `.gz` name. Use `iter_raw()` when you want the file exactly as published, and verify a checksum whenever the source provides one.

> **The main idea:** stream to a .part file, verify size and checksum, rename atomically, then write the checkpoint sidecar. A verified file is never downloaded twice; a broken one is never visible.

*Read more:* [HTTPX quickstart](https://www.python-httpx.org/quickstart/), [hashlib](https://docs.python.org/3/library/hashlib.html), [os.replace](https://docs.python.org/3/library/os.html#os.replace).

---

<a id="slide-23"></a>
## 23. Parsing gzip JSON Lines: validate every line, classify every outcome

*Part C · a pure parse function and four outcomes*

Reading is the files-and-streams deck’s generator pattern: `gzip.open(…, "rt")` decompresses as you iterate, one line at a time. Each line then gets exactly one **outcome**: a *candidate* (valid, in the window, one of our repos), *quarantined* (malformed, with a reason), *filtered_window* or *filtered_repo*. `parse_event` is **pure** (no I/O, same input → same output), so it is trivial to test.

```python
import gzip
from datetime import datetime, timezone


def read_lines(path):
    """Yield (line_number, text) from a gzip JSONL file, streaming."""
    with gzip.open(path, "rt", encoding="utf-8", newline="\n") as f:
        for line_no, line in enumerate(f, start=1):
            yield line_no, line.rstrip("\n")


def parse_event(line):
    """Pure function: one JSONL line -> (event, created_at, None) or (None, None, reason)."""
    try:
        e = json.loads(line)
    except json.JSONDecodeError:
        return None, None, "invalid_json"
    if not isinstance(e, dict):
        return None, None, "not_an_object"
    if not (isinstance(e.get("id"), str) and e["id"].isdigit()):
        return None, None, "bad_id"
    if not isinstance(e.get("type"), str):
        return None, None, "bad_type"
    repo, actor = e.get("repo"), e.get("actor")
    if not (isinstance(repo, dict) and isinstance(repo.get("id"), int) and isinstance(repo.get("name"), str)):
        return None, None, "bad_repo"
    if not (isinstance(actor, dict) and isinstance(actor.get("id"), int) and isinstance(actor.get("login"), str)):
        return None, None, "bad_actor"
    if not isinstance(e.get("payload"), dict):
        return None, None, "bad_payload"
    try:
        ts = datetime.strptime(e["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (KeyError, TypeError, ValueError):
        return None, None, "bad_created_at"
    return e, ts, None


def classify(line, start, end, repos):
    """-> (outcome, reason, event, ts). outcome: candidate | quarantined | filtered_window | filtered_repo."""
    e, ts, reason = parse_event(line)
    if reason:
        return "quarantined", reason, None, None
    if not (start <= ts < end):
        return "filtered_window", None, None, None
    if e["repo"]["name"].lower() not in repos:
        return "filtered_repo", None, None, None
    return "candidate", None, e, ts


from collections import Counter
REPOS = {"microsoft/vscode", "apache/iceberg", "astral-sh/ruff"}
for hour in (0, 7, 11, 19):
    c = Counter()
    for line_no, line in read_lines(f"landing/2026-03-02-{hour}.json.gz"):
        outcome, reason, e, ts = classify(line, start, end, REPOS)
        c[f"{outcome}:{reason}" if reason else outcome] += 1
    print(f"hour {hour:>2}", dict(sorted(c.items())))
```

Output:

```text
hour  0 {'candidate': 4500, 'filtered_repo': 1000, 'filtered_window': 2}
hour  7 {'candidate': 4500, 'filtered_repo': 1000, 'quarantined:invalid_json': 2}
hour 11 {'candidate': 4500, 'filtered_repo': 1000, 'quarantined:bad_repo': 3}
hour 19 {'candidate': 4500, 'filtered_repo': 1000, 'quarantined:not_an_object': 1}
```

- Validate the fields you will use, with types: `isinstance(repo.get("id"), int)` catches `{}`, `null` and strings in one go.
- Parse timestamps with an explicit format and attach UTC; reject anything else instead of guessing.
- Repository names are compared lower-cased (GitHub treats them case-insensitively), and by *equality*: `startswith("microsoft/vscode")` would also match `microsoft/vscode-docs`.
- The window check uses the event’s `created_at`, not the file name: an hour file can contain events stamped a moment before the hour.

> **On the job:** Writing the outcome rules as one pure function is what makes the audit counts later possible: every line passes through the same classifier, so the counts must add up to the lines read.

> **The main idea:** stream lines with gzip.open in text mode, run every line through one pure classifier, and give every line exactly one outcome with a reason.

*Read more:* [gzip](https://docs.python.org/3/library/gzip.html), [json](https://docs.python.org/3/library/json.html), [GitHub event types](https://docs.github.com/en/rest/using-the-rest-api/github-event-types).

---

<a id="slide-24"></a>
## 24. Quarantine: keep the bad lines, with reasons

*Part C · malformed records are data, not log noise*

**Quarantine** (the files-and-streams deck called it a dead-letter or reject file) is where malformed records go so the good ones can continue. A quarantine record keeps *where* (source file, line number), *why* (reason code) and *what* (the raw text, truncated to a safe length), so that someone can fix the source or replay the lines later. A **quarantine-rate threshold** (added) stops the run when too much is bad: a few broken lines are normal, 30% means the format changed.

```python
def quarantine_record(source_file, line_no, reason, raw, limit=2000):
    return json.dumps({"source_file": source_file, "line": line_no, "reason": reason, "raw": raw[:limit]},
                      sort_keys=True, ensure_ascii=False)

records, read = [], 0
for hour in range(24):
    name = f"2026-03-02-{hour}.json.gz"
    for line_no, line in read_lines(landing / name):
        read += 1
        outcome, reason, e, ts = classify(line, start, end, REPOS)
        if outcome == "quarantined":
            records.append(quarantine_record(name, line_no, reason, line))
Path("quarantine_demo.jsonl").write_text("\n".join(records) + "\n", encoding="utf-8")
print(Counter(json.loads(r)["reason"] for r in records))
for r in records[:2]:
    print(r[:150])
rate, limit = len(records) / read, 0.01
print(f"quarantine rate {rate:.5%} of {read:,} lines -> {'FAIL' if rate > limit else 'ok'} (limit {limit:.0%})")
```

Output:

```text
Counter({'bad_repo': 3, 'invalid_json': 2, 'bad_created_at': 1, 'bad_id': 1, 'not_an_object': 1})
{"line": 51, "raw": "{\"id\":\"50031163633\",\"type\":\"PushEvent\",\"actor\":{\"id\":1010", "reason": "invalid_json", "source_file": "2026-03-02-7.js
{"line": 148, "raw": "{\"id\":\"50035425119\",\"type\":\"Pul", "reason": "invalid_json", "source_file": "2026-03-02-7.json.gz"}
quarantine rate 0.00606% of 132,013 lines -> ok (limit 1%)
```

| Design choice | Recommendation |
|---|---|
| Where | Next to the output it belongs to (the project writes `_quarantine.jsonl` inside the partition), or a `quarantine/` area with the same partitioning |
| What to keep | Source file, line, reason code, raw text (truncated), run id. Never only a count |
| When to fail | Above a rate threshold, or on any quarantine in a source that has never had one |
| Sensitive data | Quarantine holds raw input: give it the same access controls and retention as the raw zone |
| Replay | Fix the parser or the source, then rerun the partition: idempotent publication makes that safe |

> **On the job:** Alert on the quarantine *rate* per source and trend it. A slow rise usually means an upstream schema change that nobody announced.

> **The main idea:** quarantine malformed lines with file, line, reason and raw text; count them; and fail the run when the rate crosses a threshold.

*Read more:* [json](https://docs.python.org/3/library/json.html).

---

<a id="slide-25"></a>
## 25. Deterministic identifiers: keys, content hashes, file names

*Part C · same input, same identifiers, on every run*

Reruns are only safe if everything you generate is **deterministic**: the same input always produces the same identifiers. Three kinds matter. The **natural key** is the source’s own unique id (`event.id`); it detects duplicates. A **content hash** (SHA-256 of a **canonical** JSON form: sorted keys, fixed separators) identifies the exact content and detects changes. **Output names** (`part-00000.parquet`, `dt=2026-03-02`) come from the data and the window, never from a clock or a random UUID.

```python
def canonical_json(obj):
    """One byte-for-byte representation per value: sorted keys, no spaces, UTF-8."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_hash(event):
    return hashlib.sha256(canonical_json(event).encode("utf-8")).hexdigest()


def order_key(event, ts):
    """The deterministic ordering rule: created_at, then numeric event id."""
    return (ts, int(event["id"]))


a = {"id": "7", "type": "PushEvent", "payload": {"ref": "main", "size": 1}}
b = {"payload": {"size": 1, "ref": "main"}, "type": "PushEvent", "id": "7"}   # same event, keys reordered
print("json.dumps equal:", json.dumps(a) == json.dumps(b), "| canonical hashes equal:", record_hash(a) == record_hash(b))
print("record_hash:", record_hash(a)[:16], "...")

ids = ["9", "10", "100"]
print("text order:", sorted(ids), "| numeric order:", sorted(ids, key=int))
t = datetime(2026, 3, 2, 9, 0, tzinfo=timezone.utc)
tied = [({"id": "50000000123"}, t), ({"id": "50000000099"}, t), ({"id": "7"}, t - timedelta(seconds=1))]
print("ordered:", [e["id"] for e, ts in sorted(tied, key=lambda p: order_key(*p))])
```

Output:

```text
json.dumps equal: False | canonical hashes equal: True
record_hash: 4f1d262fd8fcd1f7 ...
text order: ['10', '100', '9'] | numeric order: ['9', '10', '100']
ordered: ['7', '50000000099', '50000000123']
```

| Identifier | Deterministic choice | Avoid |
|---|---|---|
| Row key | Source id (`event_id`), or a hash of the business key if the source has none | Auto-increment numbers assigned at load time |
| Ordering | `(created_at, int(id))`: a total order with a unique tie-breaker | Sorting by a timestamp alone (ties), or by id as text |
| File names | `part-00000.parquet` numbered in write order | `uuid4()` or timestamps (a rerun adds files beside the old ones) |
| Partition | `dt=2026-03-02` from the window | The run date |
| Run id | A sequence (`r0001`) kept in the run log, not in the rows | Putting run time into every row (rows then differ on each rerun) |

> **On the job:** “Can you prove the rerun produced the same data?” is answered by comparing content hashes, not by eyeballing counts. The same canonical-hash trick detects changed records in CDC and slowly changing dimensions (the dimensional modelling deck).

> **The main idea:** use the source’s key for identity, a canonical content hash for change detection, a total ordering with a unique tie-breaker, and names derived from data, never from clocks or random UUIDs.

*Read more:* [hashlib](https://docs.python.org/3/library/hashlib.html), [json](https://docs.python.org/3/library/json.html).

---

<a id="slide-26"></a>
## 26. PyArrow: explicit schemas instead of guessed ones

*Part C · decide every column’s type once*

**Apache Arrow** is a standard columnar in-memory format; **PyArrow** is its Python library and the engine behind Parquet in pandas and Polars. A **schema** lists every field: name, type, and whether it is **nullable** (may be null). A **Table** is columns that follow a schema; a **RecordBatch** is one chunk of rows. If you let PyArrow *infer* types from each batch, the types depend on the data in that batch, and they drift.

```python
import pyarrow as pa
import pyarrow.parquet as pq

batch1 = [{"event_id": 1, "org_login": None}, {"event_id": 2, "org_login": None}]
batch2 = [{"event_id": 3, "org_login": "apache"}]
t1, t2 = pa.Table.from_pylist(batch1), pa.Table.from_pylist(batch2)
print("inferred:", t1.schema.field("org_login").type, "then", t2.schema.field("org_login").type)
writer = pq.ParquetWriter("inferred.parquet", t1.schema)
writer.write_table(t1)
try:
    writer.write_table(t2)
except ValueError as e:
    print("ValueError:", str(e).splitlines()[0])
writer.close()
```

Output:

```text
inferred: null then string
ValueError: Table schema does not match schema used to create file: 
```

```python
import pyarrow as pa
import pyarrow.parquet as pq

SCHEMA = pa.schema([
    pa.field("event_id", pa.int64(), nullable=False),
    pa.field("event_type", pa.string(), nullable=False),
    pa.field("created_at", pa.timestamp("us", tz="UTC"), nullable=False),
    pa.field("repo_id", pa.int64(), nullable=False),
    pa.field("repo_name", pa.string(), nullable=False),
    pa.field("actor_id", pa.int64(), nullable=False),
    pa.field("actor_login", pa.string(), nullable=False),
    pa.field("org_login", pa.string()),
    pa.field("public", pa.bool_()),
    pa.field("payload_json", pa.string(), nullable=False),
    pa.field("record_hash", pa.string(), nullable=False),
    pa.field("source_file", pa.string(), nullable=False),
    pa.field("source_line", pa.int32(), nullable=False),
], metadata={"dataset": "gha_events", "schema_version": "1"})


def to_row(e, ts, source_file, line_no):
    return {"event_id": int(e["id"]), "event_type": e["type"], "created_at": ts,
            "repo_id": e["repo"]["id"], "repo_name": e["repo"]["name"],
            "actor_id": e["actor"]["id"], "actor_login": e["actor"]["login"],
            "org_login": (e.get("org") or {}).get("login"), "public": e.get("public"),
            "payload_json": canonical_json(e["payload"]), "record_hash": record_hash(e),
            "source_file": source_file, "source_line": line_no}


rows = []
for line_no, line in read_lines(landing / "2026-03-02-0.json.gz"):
    outcome, reason, e, ts = classify(line, start, end, REPOS)
    if outcome == "candidate":
        rows.append(to_row(e, ts, "2026-03-02-0.json.gz", line_no))
table = pa.Table.from_pylist(rows, schema=SCHEMA)
print(table.num_rows, "rows")
print(table.schema.to_string(show_schema_metadata=False))
print(table.column("created_at")[0], "|", table.column("org_login").null_count, "null org_login")
```

Output:

```text
4500 rows
event_id: int64 not null
event_type: string not null
created_at: timestamp[us, tz=UTC] not null
repo_id: int64 not null
repo_name: string not null
actor_id: int64 not null
actor_login: string not null
org_login: string
public: bool
payload_json: string not null
record_hash: string not null
source_file: string not null
source_line: int32 not null
2026-03-02 00:00:03+00:00 | 0 null org_login
```

- `timestamp("us", tz="UTC")`: microseconds, time-zone aware. Parquet stores it as UTC-adjusted, and DuckDB reads it as `TIMESTAMP WITH TIME ZONE`.
- `event_id` becomes `int64` (ids are around 5×10¹⁰, beyond int32). `payload` stays a JSON string: its shape differs per event type, so it is typed later, per type, downstream.
- Schema-level metadata (`schema_version`) travels inside every file and lets readers check what they got.

> **On the job:** In the Bronze/Silver vocabulary of the medallion decks, this table is Bronze with types: one row per source record, typed envelope columns, the variable part kept raw, plus lineage columns (`source_file`, `source_line`, `record_hash`).

> **The main idea:** declare the schema once (names, types, nullability, time zone, version) and pass it to every Table and writer. Inferred types change with the data; explicit ones fail loudly.

*Read more:* [PyArrow](https://arrow.apache.org/docs/python/), [pyarrow.schema](https://arrow.apache.org/docs/python/generated/pyarrow.schema.html), [PyArrow data types](https://arrow.apache.org/docs/python/api/datatypes.html).

---

<a id="slide-27"></a>
## 27. Batched Parquet writes with ParquetWriter

*Part C · one open file, many row groups, bounded memory*

**Parquet** (the data formats deck) stores a file as **row groups**: horizontal chunks, each holding one compressed column chunk per column, plus a footer with the schema and per-chunk statistics (min/max). `pq.ParquetWriter` keeps one file open and appends a row group per `write_table` call, so you can write millions of rows while holding only one batch in memory. `PartitionWriter` wraps it, numbers files deterministically and rolls to a new file after a row limit.

```python
class PartitionWriter:
    """Batched Parquet writes into one folder: part-00000.parquet, part-00001.parquet, ...
    Each write_rows() call becomes one row group; a new file starts after max_rows_per_file."""

    def __init__(self, folder, schema, max_rows_per_file=1_000_000, compression="zstd"):
        self.folder, self.schema = Path(folder), schema
        self.max_rows, self.compression = max_rows_per_file, compression
        self.folder.mkdir(parents=True, exist_ok=True)
        self.writer, self.files, self.rows_in_file = None, [], 0

    def write_rows(self, rows):
        if self.writer is None or self.rows_in_file + len(rows) > self.max_rows:
            self._roll()
        self.writer.write_table(pa.Table.from_pylist(rows, schema=self.schema))
        self.rows_in_file += len(rows)
        self.files[-1]["rows"] += len(rows)

    def _roll(self):
        if self.writer is not None:
            self.writer.close()
        name = f"part-{len(self.files):05d}.parquet"
        self.writer = pq.ParquetWriter(self.folder / name, self.schema, compression=self.compression)
        self.files.append({"file": name, "rows": 0})
        self.rows_in_file = 0

    def close(self):
        if self.writer is not None:
            self.writer.close()
        for f in self.files:
            p = self.folder / f["file"]
            f.update(bytes=p.stat().st_size, sha256=sha256_file(p))
        return self.files


rows = []
for hour in range(3):
    name = f"2026-03-02-{hour}.json.gz"
    for line_no, line in read_lines(landing / name):
        outcome, reason, e, ts = classify(line, start, end, REPOS)
        if outcome == "candidate":
            rows.append(to_row(e, ts, name, line_no))
w = PartitionWriter("parquet_demo", SCHEMA, max_rows_per_file=10_000)
for i in range(0, len(rows), 5_000):
    w.write_rows(rows[i:i + 5_000])                    # one batch in memory at a time
for f in w.close():
    meta = pq.ParquetFile(Path("parquet_demo") / f["file"]).metadata
    groups = [meta.row_group(g).num_rows for g in range(meta.num_row_groups)]
    print(f["file"], f"{f['rows']:,} rows", groups, f"{f['bytes']:,} bytes",
          meta.row_group(0).column(0).compression, "| created_by:", meta.created_by.split(" (")[0])
```

Output:

```text
part-00000.parquet 10,000 rows [5000, 5000] 760,511 bytes ZSTD | created_by: parquet-cpp-arrow version 25.0.1
part-00001.parquet 3,500 rows [3500] 269,096 bytes ZSTD | created_by: parquet-cpp-arrow version 25.0.1
```

| Setting | Guidance |
|---|---|
| Row group size | Roughly 64–512 MB uncompressed, or 100k–1M rows. Tiny row groups (as in this demo) hurt compression and scan speed |
| Batch size in memory | What you can afford to hold; several batches can go into one row group by passing `row_group_size` |
| Compression | `zstd` (small, fast) or `snappy` (the old default). Use the same codec for the whole dataset |
| Close the writer | The footer is written on `close()`; an unclosed file is unreadable. Use `with` or `try/finally` |

> **On the job:** The 5,000-row batches here are for demonstration. In the project the batch is up to 10,000 rows, and real pipelines usually target 128 MB+ row groups. Too many small row groups and files is the most common Parquet performance bug (next slide).

> **The main idea:** open one ParquetWriter per output file with the explicit schema, write bounded batches as row groups, close it to write the footer, then record each file’s rows, size and hash.

*Read more:* [PyArrow: reading and writing Parquet](https://arrow.apache.org/docs/python/parquet/parquet.html), [pyarrow.parquet.ParquetWriter](https://arrow.apache.org/docs/python/generated/pyarrow.parquet.ParquetWriter.html), [Apache Parquet docs](https://parquet.apache.org/docs/).

---

<a id="slide-28"></a>
## 28. Partitions: folders a query can skip, and the small-files problem

*Part C · choose the folder layout from the queries and the volume*

A **partition** is a subset of a dataset stored in its own folder. **Hive-style** folders put the column and value in the path (`dt=2026-03-02/`), so engines such as DuckDB, Spark and PyArrow add `dt` as a column and **prune**: a query for one day opens only that folder. Every extra partition column multiplies the number of folders and files. Too many tiny files is the **small-files problem**: each file costs an open, a footer read and metadata, so scans get slower and compression worse.

```python
import duckdb, shutil, time

rows = []
for hour in range(24):
    name = f"2026-03-02-{hour}.json.gz"
    for line_no, line in read_lines(landing / name):
        outcome, reason, e, ts = classify(line, start, end, REPOS)
        if outcome == "candidate":
            rows.append(to_row(e, ts, name, line_no) | {"dt": "2026-03-02", "hour": ts.hour})
day = pa.Table.from_pylist(rows, schema=SCHEMA.append(pa.field("dt", pa.string())).append(pa.field("hour", pa.int32())))
for root, cols in [("layout_dt", ["dt"]), ("layout_dt_hour_repo", ["dt", "hour", "repo_name"])]:
    shutil.rmtree(root, ignore_errors=True)
    pq.write_to_dataset(day, root, partition_cols=cols)
    files = list(Path(root).rglob("*.parquet"))
    con = duckdb.connect()
    t0 = time.perf_counter()
    for _ in range(5):
        n = con.execute(f"SELECT count(*) FROM read_parquet('{root}/**/*.parquet', hive_partitioning=true) "
                        "WHERE event_type = 'PushEvent'").fetchone()[0]
    ms = (time.perf_counter() - t0) / 5 * 1000
    print(f"{root:<20} {len(files):>3} files {sum(f.stat().st_size for f in files)/1e6:>6.1f} MB  "
          f"pushes={n:,}  query {ms:.0f} ms")
```

Output (sizes and query times measured on the build machine):

```text
layout_dt              1 files   13.5 MB  pushes=64,978  query 10 ms
layout_dt_hour_repo   72 files   14.8 MB  pushes=64,978  query 188 ms
```

| Layout | Good for | Cost |
|---|---|---|
| `dt=YYYY-MM-DD/` **(chosen)** | Daily batch loads, date-range queries, replacing one day atomically | Queries by repo scan the whole day (fine: ≤100,000 rows) |
| `dt=/hour=/` | Hourly loads of large volumes; late-hour reprocessing | 24× the folders; tiny files when volume is low |
| `repo=/dt=/` | Per-repo consumers, per-repo deletes | Many repos × days = many folders; skew (one huge repo) |
| No partition columns, sorted files | Small datasets; engines that use min/max statistics | No folder-level pruning or atomic replacement |

> **On the job:** Rule of thumb: aim for files of 128 MB–1 GB and partitions that match the unit you load and reprocess (here, a UTC day). For hundreds of thousands of rows per day, one daily folder is right. Delta and Iceberg (the formats deck) add compaction (`OPTIMIZE`) for when small files accumulate anyway.

> **The main idea:** partition by the unit you load and query by (here the UTC day), not by every column you might filter on. Fewer, larger files beat many tiny ones.

*Read more:* [DuckDB: Hive partitioning](https://duckdb.org/docs/stable/data/partitioning/hive_partitioning), [PyArrow datasets and partitioning](https://arrow.apache.org/docs/python/dataset.html), [Apache Parquet docs](https://parquet.apache.org/docs/).

---

<a id="slide-29"></a>
## 29. Idempotent publication: stage, then swap

*Part C · readers see the old partition or the new one, never half*

**Publication** is the moment output becomes visible to readers. It is **idempotent** if publishing the same window again gives the same visible result. The pattern: write everything into a **staging** folder that readers never look at (`_staging/`), and only when it is complete, **swap** it in with renames. A rename within one file system is atomic: the folder name points at the old content or the new, never a mixture.

```python
import shutil


def publish(staging, final, crash=lambda point: None):
    """Swap a fully written staging folder in as the partition. Readers see old or new, never half."""
    staging, final = Path(staging), Path(final)
    trash = final.parent / "_trash" / final.name
    if trash.exists():
        shutil.rmtree(trash)
    trash.parent.mkdir(parents=True, exist_ok=True)
    if final.exists():
        os.rename(final, trash)          # 1. move the last good version aside
    crash("publish")                     #    (demo hook: a crash here is the worst moment)
    os.rename(staging, final)            # 2. move the new version in
    shutil.rmtree(trash, ignore_errors=True)


def recover(dataset_dir, log=print):
    """Run at start-up: restore an interrupted swap and delete abandoned staging folders."""
    dataset_dir = Path(dataset_dir)
    for trash in sorted((dataset_dir / "_trash").glob("*")):
        final = dataset_dir / trash.name
        if final.exists():
            shutil.rmtree(trash)
            log(f"recover: removed leftover {trash.relative_to(dataset_dir).as_posix()}")
        else:
            os.rename(trash, final)
            log(f"recover: restored last good {final.name}")
    for stage in sorted((dataset_dir / "_staging").glob("*")):
        shutil.rmtree(stage)
        log(f"recover: deleted abandoned staging {stage.relative_to(dataset_dir).as_posix()}")


def tree(root):
    return sorted(p.relative_to(root).as_posix() for p in Path(root).rglob("*") if p.is_file())

def stage(dataset, version):
    s = Path(dataset) / "_staging" / "dt=2026-03-02"
    s.mkdir(parents=True, exist_ok=True)
    (s / "part-00000.parquet").write_text(f"data {version}")
    (s / "_manifest.json").write_text(f'{{"version": "{version}"}}')
    return s

class Crash(Exception):
    pass

def crash_at_publish(point):
    raise Crash(point)

ds = Path("publish_demo")
shutil.rmtree(ds, ignore_errors=True)
publish(stage(ds, "v1"), ds / "dt=2026-03-02")
print("after v1:          ", tree(ds))
try:
    publish(stage(ds, "v2"), ds / "dt=2026-03-02", crash=crash_at_publish)
except Crash:
    print("crash mid-swap:    ", tree(ds))
recover(ds)
print("after recover:     ", tree(ds), (ds / "dt=2026-03-02/_manifest.json").read_text())
publish(stage(ds, "v2"), ds / "dt=2026-03-02")
print("after v2:          ", tree(ds), (ds / "dt=2026-03-02/_manifest.json").read_text())
```

Output:

```text
after v1:           ['dt=2026-03-02/_manifest.json', 'dt=2026-03-02/part-00000.parquet']
crash mid-swap:     ['_staging/dt=2026-03-02/_manifest.json', '_staging/dt=2026-03-02/part-00000.parquet', '_trash/dt=2026-03-02/_manifest.json', '_trash/dt=2026-03-02/part-00000.parquet']
recover: restored last good dt=2026-03-02
recover: deleted abandoned staging _staging/dt=2026-03-02
after recover:      ['dt=2026-03-02/_manifest.json', 'dt=2026-03-02/part-00000.parquet'] {"version": "v1"}
after v2:           ['dt=2026-03-02/_manifest.json', 'dt=2026-03-02/part-00000.parquet'] {"version": "v2"}
```

| Where you publish | Atomic step | Notes |
|---|---|---|
| Local disk or a mounted volume (this deck) | `os.rename` of a folder | Same file system only. A folder can’t be renamed onto an existing one, hence the move-aside step; Windows also refuses while a file inside is open |
| Object storage (S3, GCS, Azure Blob without hierarchical namespace) | None for folders | A “rename” is copy + delete, object by object; readers can see partial folders. Use a table format, or a manifest/pointer file written last that readers must check |
| ADLS Gen2 with hierarchical namespace, OneLake | Directory rename | Atomic on the service, but many tools still copy file by file; check what your library actually calls |
| Delta Lake / Iceberg tables | The commit to the transaction log | `replaceWhere` / overwrite of a partition is atomic and versioned (the formats deck) |
| A database | A transaction (files-and-streams deck) | `DELETE` the window + `INSERT`, in one transaction |

> **On the job:** The crash between the two renames is the worst moment: the partition is briefly *missing*. `recover()` (added) runs at start-up and restores the last good version, so readers never see half a day, and at worst see yesterday’s answer until the rerun finishes.

> **The main idea:** write to staging, then swap with renames on the same file system; run recovery at start-up. On object stores, get the same guarantee from a table format’s commit or a manifest written last.

*Read more:* [os.rename](https://docs.python.org/3/library/os.html#os.rename), [os.replace](https://docs.python.org/3/library/os.html#os.replace).

---

<a id="slide-30"></a>
## 30. Manifests and audit counts: prove what you published

*Part C · every line accounted for exactly once*

A **manifest** is a small JSON file describing one published unit: the window and parameters, the input files with checksums, the output files with row counts and checksums, and the counts. It is written **last** inside the staging folder, so its presence marks a complete partition. **Audit counts** (also called reconciliation) check that every line read went to exactly one outcome:

**read = retained + filtered_repo + filtered_window + quarantined + duplicates + truncated**

```python
OUTCOMES = ("retained", "filtered_repo", "filtered_window", "quarantined", "duplicates", "truncated")


def check_audit(counts):
    """Every line read must be accounted for exactly once."""
    accounted = sum(counts[k] for k in OUTCOMES)
    if accounted != counts["read"]:
        raise AssertionError(f"audit mismatch: read={counts['read']} accounted={accounted}")
    return True


good = {"read": 132013, "retained": 100000, "filtered_repo": 24000, "filtered_window": 2,
        "quarantined": 8, "duplicates": 3, "truncated": 8000}
print("good counts:", check_audit(good))
```

Output:

```text
good counts: True
```

```python
lost = dict(good, retained=99_999)        # one row silently dropped somewhere
check_audit(lost)
```

Output:

```text
AssertionError: audit mismatch: read=132013 accounted=132012
```

| Manifest field | Why it is there |
|---|---|
| `window`, `repos`, `cap`, `ordering` | The parameters: a rerun with different parameters is a different dataset |
| `counts`, `quarantine_reasons` | The audit identity, checkable by anyone |
| `truncated`, `cutoff` | Whether, and exactly where, the cap cut the data |
| `sources[]`: file, bytes, sha256 | Lineage: which inputs, byte for byte |
| `outputs[]`: file, rows, bytes, sha256 | Readers can verify files; reruns can be compared |
| No timestamps, no hostnames | So the same input produces a byte-identical manifest; run times go to the run log |

> **On the job:** Duplicates get their own category (added): lumping them into “filtered” hides a source that suddenly redelivers 10% of its data. Interviewers love the question “how do you know you didn’t lose rows?”; the answer is this identity, checked in code before publishing.

> **The main idea:** write a manifest last as the commit marker, and refuse to publish unless read = retained + filtered + quarantined + duplicates + truncated.

*Read more:* [json](https://docs.python.org/3/library/json.html), [hashlib](https://docs.python.org/3/library/hashlib.html).

---

<a id="slide-31"></a>
## 31. Secrets: environment variables, redaction, and Key Vault

*Part C · tokens never in code, logs, or outputs*

A **secret** is a credential such as an API token. GH Archive needs none, but most APIs do (GitHub’s REST API: a token in `Authorization: Bearer …`). Rules: read secrets from the environment or a secret store at run time; never write them into code, notebooks, config files in Git, logs, exceptions or outputs; and fail fast with a clear message if one is missing. The token below is fake.

```python
import os
os.environ["FAKE_API_TOKEN"] = "fake-token-123"     # demo only: normally set by the scheduler or a secret store

class Secret:
    """Holds a value but never shows it in print(), logs or tracebacks."""
    def __init__(self, value):
        self._value = value
    def get(self):
        return self._value
    def __repr__(self):
        return "Secret('***')"
    __str__ = __repr__

def load_secret(name):
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"environment variable {name} is not set")   # the name, never a value
    return Secret(value)

token = load_secret("FAKE_API_TOKEN")
print("config:", {"base_url": fakeapi.BASE, "token": token})

def log_redacted(request):
    shown = {k: ("***" if k.lower() == "authorization" else v) for k, v in request.headers.items()}
    print("request:", request.method, request.url.path, shown)

with httpx.Client(base_url=fakeapi.BASE, headers={"Authorization": f"Bearer {token.get()}"},
                  event_hooks={"request": [log_redacted]}) as c:
    print(c.get("/api/private").json())
    print(c.get("/api/private", headers={"Authorization": "Bearer wrong"}).status_code)
```

Output:

```text
config: {'base_url': 'http://127.0.0.1:8765', 'token': Secret('***')}
request: GET /api/private {'host': '127.0.0.1:8765', 'accept': '*/*', 'accept-encoding': 'gzip, deflate', 'connection': 'keep-alive', 'user-agent': 'python-httpx/0.28.1', 'authorization': '***'}
{'ok': True}
request: GET /api/private {'host': '127.0.0.1:8765', 'accept': '*/*', 'accept-encoding': 'gzip, deflate', 'connection': 'keep-alive', 'user-agent': 'python-httpx/0.28.1', 'authorization': '***'}
401
```

```python
def get_secret(name, vault_url=None):
    """Environment first (local runs, CI); otherwise Azure Key Vault with the job's managed identity."""
    env_name = name.upper().replace("-", "_")
    if os.environ.get(env_name):
        return Secret(os.environ[env_name])
    from azure.identity import DefaultAzureCredential        # pip install azure-identity azure-keyvault-secrets
    from azure.keyvault.secrets import SecretClient
    client = SecretClient(vault_url=vault_url or os.environ["KEY_VAULT_URL"], credential=DefaultAzureCredential())
    return Secret(client.get_secret(name).value)

print(get_secret("fake-api-token"))           # served from the environment in this offline build
```

Output:

```text
Secret('***')
```

#### Azure Key Vault in one paragraph

**Azure Key Vault** stores secrets centrally with access control, audit logs and rotation. A job authenticates with a **managed identity** (an identity Azure gives the VM, Function or Fabric workspace, so there is no password to store), and `DefaultAzureCredential` picks it up automatically (or your developer login locally). In Fabric notebooks, `notebookutils.credentials.getSecret(vault_url, name)` does the same. The Key Vault branch above was not executed: this build is offline and has no Azure SDK installed.

#### Checklist

- Least privilege: a read-only, repository-scoped token.
- Rotate tokens; give them an expiry.
- Redact `Authorization` and `?token=` in logs; httpx logs URLs at INFO level.
- Never print `os.environ` or a Client’s headers.
- Scan the repository for secrets in CI.

> **On the job:** In an interview, “where does the token live?” has a good answer in one sentence: “in Key Vault, read at run time through the job’s managed identity; locally from an environment variable; redacted in logs; never in Git.”

> **The main idea:** secrets come from the environment or a vault at run time, are wrapped so they can’t be printed, are redacted from logs, and never touch code, Git or outputs.

*Read more:* [Azure Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview), [Key Vault secrets with Python](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-python), [Managed identities](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview), [DefaultAzureCredential](https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.defaultazurecredential), [GitHub REST: best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

---

<a id="slide-32"></a>
## 32. Project: a bounded GH Archive ingester

*Part D · requirements, definitions, design*

Build the ingester the plan asks for: **one fixed 24-hour UTC window** (2026-03-02T00:00Z to 2026-03-03T00:00Z), **three repositories** (microsoft/vscode, apache/iceberg, astral-sh/ruff), and a **deterministic cap of 100,000 retained events**, published as Parquet with a manifest. It must be safe to rerun and must recover from a crash at any point.

| Requirement | Definition and mechanism | Slides |
|---|---|---|
| Bounded window | Hours 0–23 of 2026-03-02; an event is in the window if `start ≤ created_at < end` (UTC), whatever file it came from | 20, 23 |
| Three repositories | Exact, case-insensitive match on `repo.name`; configurable with `--repos` / `GHA_REPOS` | 23 |
| Deterministic cap | Order unique candidates by `(created_at, event_id)` and keep the first `--cap` (default 100,000). Same input → same 100,000 events | 25, 37 |
| Truncation reporting | `truncated` = unique in-window candidates beyond the cap; the manifest records the count, a `truncated` flag and the **cutoff** key (the last retained event) | 30, 37 |
| Reliable landing | Streamed downloads with retries, size and MD5/ETag checks, atomic rename, a SHA-256 sidecar as per-file checkpoint | 14, 22 |
| Typed output | Explicit PyArrow schema, batched `ParquetWriter`, one `dt=` partition | 26–28 |
| Quarantine and audit | Bad lines in `_quarantine.jsonl` with reasons; fail above 1%; refuse to publish unless the audit identity holds | 24, 30 |
| Idempotent publication | Stage, then swap; manifest last; `recover()` at start-up; deterministic names and bytes | 25, 29 |
| Observable | Logs to stderr, a summary on stdout, a run log with `started`/`succeeded`/`failed`, exit codes 0/1/2 | files-and-streams deck |

1. **Land** (24 × download_verified()): Verified files are skipped: they are the checkpoint.
2. **Pass 1: scan** (classify every line): Count every outcome; keep only the ordering keys of unique candidates; compute the cutoff.
3. **Pass 2: write** (classify again, keep key ≤ cutoff): Rows sorted per hour, written in batches into _staging; quarantine lines alongside.
4. **Audit + manifest** (check_audit(), _manifest.json): Written last inside staging.
5. **Publish** (publish(): move old aside, move new in): Then append “succeeded” to the run log.

> **On the job:** Why two passes? The cap needs the 100,000 *smallest* keys over the whole day before any row can be written. Pass 1 keeps only small keys (about 108,000 tuples here), not rows; pass 2 re-reads the local files, which is cheap. The alternative, a bounded heap of full rows, holds 100,000 payloads in memory.

> **The main idea:** state the definitions first (window, match rule, ordering, cap, truncation) and give each guarantee one mechanism. The code then follows almost mechanically.

*Read more:* [GH Archive](https://www.gharchive.org/), [pyarrow.parquet.ParquetWriter](https://arrow.apache.org/docs/python/generated/pyarrow.parquet.ParquetWriter.html), [heapq](https://docs.python.org/3/library/heapq.html).

---

<a id="slide-33"></a>
## 33. Project: the ingester code

*Part D · gha_ingest.py = the lesson pieces + 150 lines of glue*

The file is literally the functions from Part C (download, parse, identifiers, schema, writer, publish, audit) followed by `main()`. It imports the retry loop from `httpkit.py`. The hidden `--crash-at` option kills the process (`os._exit`, no cleanup, like a power cut or `kill -9`) at a chosen point, for the recovery slides. `GHA_BASE_URL` points it at the local fake server instead of `https://data.gharchive.org`.

<details><summary>Show gha_ingest.py (about 400 lines)</summary>

```python
# gha_ingest.py
"""gha_ingest.py: bounded, idempotent GH Archive ingester.

One UTC day (24 hourly files) -> filter to chosen repositories -> deterministic cap -> Parquet partition
published atomically with a manifest, a quarantine file, and audit counts.
"""
import httpx

from httpkit import RetryAfterTooLong, RetryableBody, RetryPolicy, send_with_retries


import hashlib, json, os, re
from pathlib import Path


def sha256_file(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(chunk):
            h.update(block)
    return h.hexdigest()


def download_verified(client, url, dest, *, policy=None):
    """Stream url into dest via dest.part, verify size and checksum, then rename atomically.
    A verified file with a matching .meta.json sidecar is a checkpoint: it is not downloaded again."""
    dest = Path(dest)
    meta_path = dest.with_name(dest.name + ".meta.json")
    if dest.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta["bytes"] == dest.stat().st_size and sha256_file(dest) == meta["sha256"]:
            return {**meta, "status": "cached"}
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + ".part")
    meta = {}

    def attempt():
        with client.stream("GET", url) as resp:
            if resp.status_code >= 400:
                resp.read()
                return resp
            sha, md5, n = hashlib.sha256(), hashlib.md5(), 0
            with open(part, "wb") as f:
                for chunk in resp.iter_raw(1 << 16):        # raw bytes: never auto-decompressed
                    f.write(chunk); sha.update(chunk); md5.update(chunk); n += len(chunk)
            expected = resp.headers.get("Content-Length")
            if expected is not None and int(expected) != n:
                raise RetryableBody(f"got {n} of {expected} bytes")
            etag = resp.headers.get("ETag", "").strip('"')
            if re.fullmatch(r"[0-9a-f]{32}", etag) and etag != md5.hexdigest():
                raise RetryableBody("MD5 does not match ETag")
            meta.update(url=url, bytes=n, sha256=sha.hexdigest(), etag=etag)
            return resp

    try:
        send_with_retries(attempt, method="GET", policy=policy)
    except BaseException:
        part.unlink(missing_ok=True)
        raise
    os.replace(part, dest)                                   # atomic: dest is complete or absent
    tmp = meta_path.with_name(meta_path.name + ".tmp")
    tmp.write_text(json.dumps(meta, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, meta_path)                               # the checkpoint is written last
    return {**meta, "status": "downloaded"}


import gzip
from datetime import datetime, timezone


def read_lines(path):
    """Yield (line_number, text) from a gzip JSONL file, streaming."""
    with gzip.open(path, "rt", encoding="utf-8", newline="\n") as f:
        for line_no, line in enumerate(f, start=1):
            yield line_no, line.rstrip("\n")


def parse_event(line):
    """Pure function: one JSONL line -> (event, created_at, None) or (None, None, reason)."""
    try:
        e = json.loads(line)
    except json.JSONDecodeError:
        return None, None, "invalid_json"
    if not isinstance(e, dict):
        return None, None, "not_an_object"
    if not (isinstance(e.get("id"), str) and e["id"].isdigit()):
        return None, None, "bad_id"
    if not isinstance(e.get("type"), str):
        return None, None, "bad_type"
    repo, actor = e.get("repo"), e.get("actor")
    if not (isinstance(repo, dict) and isinstance(repo.get("id"), int) and isinstance(repo.get("name"), str)):
        return None, None, "bad_repo"
    if not (isinstance(actor, dict) and isinstance(actor.get("id"), int) and isinstance(actor.get("login"), str)):
        return None, None, "bad_actor"
    if not isinstance(e.get("payload"), dict):
        return None, None, "bad_payload"
    try:
        ts = datetime.strptime(e["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (KeyError, TypeError, ValueError):
        return None, None, "bad_created_at"
    return e, ts, None


def classify(line, start, end, repos):
    """-> (outcome, reason, event, ts). outcome: candidate | quarantined | filtered_window | filtered_repo."""
    e, ts, reason = parse_event(line)
    if reason:
        return "quarantined", reason, None, None
    if not (start <= ts < end):
        return "filtered_window", None, None, None
    if e["repo"]["name"].lower() not in repos:
        return "filtered_repo", None, None, None
    return "candidate", None, e, ts


def canonical_json(obj):
    """One byte-for-byte representation per value: sorted keys, no spaces, UTF-8."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_hash(event):
    return hashlib.sha256(canonical_json(event).encode("utf-8")).hexdigest()


def order_key(event, ts):
    """The deterministic ordering rule: created_at, then numeric event id."""
    return (ts, int(event["id"]))


import pyarrow as pa
import pyarrow.parquet as pq

SCHEMA = pa.schema([
    pa.field("event_id", pa.int64(), nullable=False),
    pa.field("event_type", pa.string(), nullable=False),
    pa.field("created_at", pa.timestamp("us", tz="UTC"), nullable=False),
    pa.field("repo_id", pa.int64(), nullable=False),
    pa.field("repo_name", pa.string(), nullable=False),
    pa.field("actor_id", pa.int64(), nullable=False),
    pa.field("actor_login", pa.string(), nullable=False),
    pa.field("org_login", pa.string()),
    pa.field("public", pa.bool_()),
    pa.field("payload_json", pa.string(), nullable=False),
    pa.field("record_hash", pa.string(), nullable=False),
    pa.field("source_file", pa.string(), nullable=False),
    pa.field("source_line", pa.int32(), nullable=False),
], metadata={"dataset": "gha_events", "schema_version": "1"})


def to_row(e, ts, source_file, line_no):
    return {"event_id": int(e["id"]), "event_type": e["type"], "created_at": ts,
            "repo_id": e["repo"]["id"], "repo_name": e["repo"]["name"],
            "actor_id": e["actor"]["id"], "actor_login": e["actor"]["login"],
            "org_login": (e.get("org") or {}).get("login"), "public": e.get("public"),
            "payload_json": canonical_json(e["payload"]), "record_hash": record_hash(e),
            "source_file": source_file, "source_line": line_no}


class PartitionWriter:
    """Batched Parquet writes into one folder: part-00000.parquet, part-00001.parquet, ...
    Each write_rows() call becomes one row group; a new file starts after max_rows_per_file."""

    def __init__(self, folder, schema, max_rows_per_file=1_000_000, compression="zstd"):
        self.folder, self.schema = Path(folder), schema
        self.max_rows, self.compression = max_rows_per_file, compression
        self.folder.mkdir(parents=True, exist_ok=True)
        self.writer, self.files, self.rows_in_file = None, [], 0

    def write_rows(self, rows):
        if self.writer is None or self.rows_in_file + len(rows) > self.max_rows:
            self._roll()
        self.writer.write_table(pa.Table.from_pylist(rows, schema=self.schema))
        self.rows_in_file += len(rows)
        self.files[-1]["rows"] += len(rows)

    def _roll(self):
        if self.writer is not None:
            self.writer.close()
        name = f"part-{len(self.files):05d}.parquet"
        self.writer = pq.ParquetWriter(self.folder / name, self.schema, compression=self.compression)
        self.files.append({"file": name, "rows": 0})
        self.rows_in_file = 0

    def close(self):
        if self.writer is not None:
            self.writer.close()
        for f in self.files:
            p = self.folder / f["file"]
            f.update(bytes=p.stat().st_size, sha256=sha256_file(p))
        return self.files


import shutil


def publish(staging, final, crash=lambda point: None):
    """Swap a fully written staging folder in as the partition. Readers see old or new, never half."""
    staging, final = Path(staging), Path(final)
    trash = final.parent / "_trash" / final.name
    if trash.exists():
        shutil.rmtree(trash)
    trash.parent.mkdir(parents=True, exist_ok=True)
    if final.exists():
        os.rename(final, trash)          # 1. move the last good version aside
    crash("publish")                     #    (demo hook: a crash here is the worst moment)
    os.rename(staging, final)            # 2. move the new version in
    shutil.rmtree(trash, ignore_errors=True)


def recover(dataset_dir, log=print):
    """Run at start-up: restore an interrupted swap and delete abandoned staging folders."""
    dataset_dir = Path(dataset_dir)
    for trash in sorted((dataset_dir / "_trash").glob("*")):
        final = dataset_dir / trash.name
        if final.exists():
            shutil.rmtree(trash)
            log(f"recover: removed leftover {trash.relative_to(dataset_dir).as_posix()}")
        else:
            os.rename(trash, final)
            log(f"recover: restored last good {final.name}")
    for stage in sorted((dataset_dir / "_staging").glob("*")):
        shutil.rmtree(stage)
        log(f"recover: deleted abandoned staging {stage.relative_to(dataset_dir).as_posix()}")


OUTCOMES = ("retained", "filtered_repo", "filtered_window", "quarantined", "duplicates", "truncated")


def check_audit(counts):
    """Every line read must be accounted for exactly once."""
    accounted = sum(counts[k] for k in OUTCOMES)
    if accounted != counts["read"]:
        raise AssertionError(f"audit mismatch: read={counts['read']} accounted={accounted}")
    return True


import argparse, logging, random, sys
from collections import Counter
from datetime import date, timedelta

log = logging.getLogger("gha_ingest")
DEFAULT_REPOS = "microsoft/vscode,apache/iceberg,astral-sh/ruff"


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Bounded GH Archive ingester: one UTC day, chosen repos, capped.")
    p.add_argument("--date", type=date.fromisoformat, default=date(2026, 3, 2), help="UTC day, window [00:00, 24:00)")
    p.add_argument("--repos", default=os.environ.get("GHA_REPOS", DEFAULT_REPOS))
    p.add_argument("--cap", type=int, default=100_000, help="max retained events (deterministic)")
    p.add_argument("--base-url", default=os.environ.get("GHA_BASE_URL", "https://data.gharchive.org"))
    p.add_argument("--data-dir", type=Path, default=Path(os.environ.get("GHA_DATA_DIR", "data")))
    p.add_argument("--batch-rows", type=int, default=10_000, help="rows per Parquet row group")
    p.add_argument("--max-quarantine-rate", type=float, default=0.01)
    p.add_argument("--crash-at", default=None, help=argparse.SUPPRESS)   # demo only
    p.add_argument("-v", "--verbose", action="store_true")
    a = p.parse_args(argv)
    if a.cap < 1:
        p.error("--cap must be >= 1")
    return a


def main(argv=None):
    a = parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if a.verbose else logging.INFO,
                        format="%(levelname)-7s %(message)s", stream=sys.stderr)
    logging.getLogger("httpx").setLevel(logging.WARNING)     # httpx logs every request at INFO

    def crash(point):
        if a.crash_at == point:
            log.critical("SIMULATED CRASH at %s (process killed, no cleanup)", point)
            logging.shutdown()
            os._exit(137)

    repos = sorted({r.strip().lower() for r in a.repos.split(",") if r.strip()})
    start = datetime(a.date.year, a.date.month, a.date.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    raw_dir = a.data_dir / "raw" / "gharchive" / a.date.isoformat()
    dataset = a.data_dir / "lake" / "gha_events"
    part_name = f"dt={a.date.isoformat()}"
    runs = a.data_dir / "runs" / "gha_events_runs.jsonl"
    runs.parent.mkdir(parents=True, exist_ok=True)
    previous = runs.read_text(encoding="utf-8").splitlines() if runs.exists() else []
    run_id = "r%04d" % (1 + sum(json.loads(l)["status"] == "started" for l in previous))
    log.info("run %s window %s/%s repos=%s cap=%d", run_id, start.isoformat(), end.isoformat(), ",".join(repos), a.cap)
    recover(dataset, log=log.info)

    def record_run(status, **extra):
        with open(runs, "a", encoding="utf-8") as f:
            f.write(json.dumps({"run_id": run_id, "partition": part_name, "status": status,
                                "started_at": started, **extra}, sort_keys=True) + "\n")

    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    record_run("started")                       # a "started" with no outcome later = a crashed run
    seed = os.environ.get("GHA_RETRY_SEED")     # set only to make retry delays repeatable in demos
    policy = RetryPolicy(max_attempts=6, base=0.25, cap=4.0, log=log.warning,
                         rng=random.Random(int(seed)) if seed else random.Random())
    # 1. Land: download the 24 hourly files (verified ones are skipped: they are the checkpoint)
    sources = []
    try:
        with httpx.Client(base_url=a.base_url, timeout=httpx.Timeout(10.0, read=60.0),
                          headers={"User-Agent": "gha-ingest-demo/1.0"}) as client:
            for i in range(24):
                name = f"{a.date.isoformat()}-{i}.json.gz"            # GH Archive hours are not zero-padded
                meta = download_verified(client, name,
                                         raw_dir / name, policy=policy)
                log.debug("%s %s %d bytes", meta["status"], name, meta["bytes"])
                sources.append({"file": name, "bytes": meta["bytes"], "sha256": meta["sha256"], "status": meta["status"]})
                crash(f"download:{i + 1}")
    except (httpx.HTTPError, RetryableBody, RetryAfterTooLong) as exc:
        log.error("landing failed: %s", exc)
        record_run("failed", error=str(exc)[:200])
        return 1
    log.info("landed 24 files: %d downloaded, %d already verified",
             sum(s["status"] == "downloaded" for s in sources), sum(s["status"] == "cached" for s in sources))

    # 2. Pass 1: classify every line, keep only the ordering keys of unique candidates
    counts, reasons, seen, keys = Counter(), Counter(), set(), []
    for s in sources:
        for line_no, line in read_lines(raw_dir / s["file"]):
            counts["read"] += 1
            outcome, reason, e, ts = classify(line, start, end, repos)
            if outcome == "candidate":
                if e["id"] in seen:
                    counts["duplicates"] += 1
                    continue
                seen.add(e["id"])
                keys.append(order_key(e, ts))
            else:
                counts[outcome] += 1
                if reason:
                    reasons[reason] += 1
    keys.sort()
    cutoff = keys[a.cap - 1] if len(keys) > a.cap else None
    counts["retained"], counts["truncated"] = min(len(keys), a.cap), max(0, len(keys) - a.cap)
    if counts["quarantined"] > a.max_quarantine_rate * counts["read"]:
        log.error("quarantine rate %.4f above limit %.4f", counts["quarantined"] / counts["read"], a.max_quarantine_rate)
        record_run("failed", error="quarantine rate too high")
        return 1

    # 3. Pass 2: write retained rows (sorted per hour) and quarantined lines into a staging folder
    staging = dataset / "_staging" / part_name
    writer = PartitionWriter(staging, SCHEMA, max_rows_per_file=60_000)
    written, seen, batches = 0, set(), 0
    with open(staging / "_quarantine.jsonl", "w", encoding="utf-8", newline="\n") as qf:
        for s in sources:
            hour_rows = []
            for line_no, line in read_lines(raw_dir / s["file"]):
                outcome, reason, e, ts = classify(line, start, end, repos)
                if outcome == "quarantined":
                    qf.write(canonical_json({"source_file": s["file"], "line": line_no,
                                             "reason": reason, "raw": line[:2000]}) + "\n")
                if outcome != "candidate" or e["id"] in seen:
                    continue
                seen.add(e["id"])
                if cutoff is None or order_key(e, ts) <= cutoff:
                    hour_rows.append((order_key(e, ts), to_row(e, ts, s["file"], line_no)))
            hour_rows.sort(key=lambda kr: kr[0])
            for i in range(0, len(hour_rows), a.batch_rows):
                writer.write_rows([r for _, r in hour_rows[i:i + a.batch_rows]])
                written += len(hour_rows[i:i + a.batch_rows])
                batches += 1
                crash(f"write:{batches}")
    files = writer.close()
    if written != counts["retained"]:
        raise AssertionError(f"pass 2 wrote {written} rows, pass 1 expected {counts['retained']}")
    check_audit(counts)

    # 4. Manifest: written last inside the staging folder; its presence marks a complete partition
    manifest = {
        "dataset": "gha_events", "partition": part_name, "schema_version": SCHEMA.metadata[b"schema_version"].decode(),
        "window": {"start": start.isoformat(), "end": end.isoformat()}, "repos": repos,
        "cap": a.cap, "ordering": "created_at ASC, event_id ASC", "truncated": counts["truncated"] > 0,
        "cutoff": None if cutoff is None else {"created_at": cutoff[0].isoformat(), "event_id": cutoff[1]},
        "counts": {k: counts[k] for k in ("read",) + OUTCOMES}, "quarantine_reasons": dict(sorted(reasons.items())),
        "sources": [{k: s[k] for k in ("file", "bytes", "sha256")} for s in sources],
        "outputs": files,
    }
    mtmp = staging / "_manifest.json.tmp"
    mtmp.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(mtmp, staging / "_manifest.json")

    # 5. Publish atomically, then record the run
    publish(staging, dataset / part_name, crash=crash)
    msha = sha256_file(dataset / part_name / "_manifest.json")
    record_run("succeeded", counts=manifest["counts"], manifest_sha256=msha)
    c = manifest["counts"]
    print(f"published {part_name}: {c['retained']:,} rows in {len(files)} file(s), truncated={manifest['truncated']}")
    print("audit: read {read:,} = retained {retained:,} + filtered_repo {filtered_repo:,} + filtered_window "
          "{filtered_window} + quarantined {quarantined} + duplicates {duplicates} + truncated {truncated:,}".format(**c))
    print("manifest sha256", msha[:16])
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Output:

```text
$ python gha_ingest.py --help
usage: gha_ingest.py [-h] [--date DATE] [--repos REPOS] [--cap CAP]
                     [--base-url BASE_URL] [--data-dir DATA_DIR]
                     [--batch-rows BATCH_ROWS]
                     [--max-quarantine-rate MAX_QUARANTINE_RATE] [-v]

Bounded GH Archive ingester: one UTC day, chosen repos, capped.

options:
  -h, --help            show this help message and exit
  --date DATE           UTC day, window [00:00, 24:00)
  --repos REPOS
  --cap CAP             max retained events (deterministic)
  --base-url BASE_URL
  --data-dir DATA_DIR
  --batch-rows BATCH_ROWS
                        rows per Parquet row group
  --max-quarantine-rate MAX_QUARANTINE_RATE
  -v, --verbose
```

</details>

| Part of main() | What it does | Failure behaviour |
|---|---|---|
| `parse_args` | CLI with environment defaults (`GHA_BASE_URL`, `GHA_REPOS`, `GHA_DATA_DIR`) | Bad arguments exit 2 |
| `recover(dataset)` | Restores an interrupted swap, deletes abandoned staging | Runs before anything else |
| Land | 24 × `download_verified` into `data/raw/gharchive/2026-03-02/` | Missing hour (404) or retries exhausted → run log `failed`, exit 1, nothing published |
| Pass 1 | Counts outcomes, collects keys, sorts them, finds the cutoff | Quarantine rate above `--max-quarantine-rate` → exit 1 |
| Pass 2 | Writes rows ≤ cutoff with `PartitionWriter`; quarantine lines to `_quarantine.jsonl` | Row count must equal pass 1’s, or it raises |
| Audit, manifest, publish | `check_audit`, `_manifest.json` written last, `publish()` | Audit mismatch raises before publishing |
| Run log | `data/runs/gha_events_runs.jsonl`: `started`, then `succeeded` or `failed` | A `started` without an outcome = crashed |

> **The main idea:** the project is the lessons glued together: each guarantee lives in one small function that was already tested on its own slide.

*Read more:* [os.replace](https://docs.python.org/3/library/os.html#os.replace).

---

<a id="slide-34"></a>
## 34. Project: first run, through injected failures

*Part D · 24 downloads, 5 injected failures, 1 published partition*

Before this run the fake server was told to fail: hour 3 answers 503 and then drops the connection halfway through the file; hour 9 answers 429 with `Retry-After: 1`; hour 14 closes the connection without a response and then answers 500. Logs go to stderr, the summary to stdout. `GHA_RETRY_SEED` makes the backoff delays repeatable for this deck; production runs leave it unset.

Output:

```text
$ python gha_ingest.py --date 2026-03-02
INFO    run r0001 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=100000
WARNING attempt 1/6 failed (HTTP 503); backoff 0.08s
WARNING attempt 2/6 failed (RemoteProtocolError); backoff 0.08s
WARNING attempt 1/6 failed (HTTP 429); Retry-After 1.00s
WARNING attempt 1/6 failed (RemoteProtocolError); backoff 0.16s
WARNING attempt 2/6 failed (HTTP 500); backoff 0.04s
INFO    landed 24 files: 24 downloaded, 0 already verified
published dt=2026-03-02: 100,000 rows in 2 file(s), truncated=True
audit: read 132,013 = retained 100,000 + filtered_repo 24,000 + filtered_window 2 + quarantined 8 + duplicates 3 + truncated 8,000
manifest sha256 e919cd3e0e327c18
```

```python
import fakeapi
log = fakeapi.requests_log()
print(len(log), "requests;", "failures injected:", [l for l in log if not l.endswith("-> ok")])
```

Output:

```text
29 requests; failures injected: ['GET /gharchive/2026-03-02-3.json.gz -> 503', 'GET /gharchive/2026-03-02-3.json.gz -> truncate', "GET /gharchive/2026-03-02-9.json.gz -> (429, '1')", 'GET /gharchive/2026-03-02-14.json.gz -> reset', 'GET /gharchive/2026-03-02-14.json.gz -> 500']
```

#### Read the summary

- 132,013 lines read; 108,000 unique in-window events of the three repos; the cap kept the first 100,000 and reported **8,000 truncated**.
- 24,000 filtered for other repositories (including `microsoft/vscode-docs`), 2 for the window, 3 duplicates, 8 quarantined: exactly the planted problems.
- Every injected failure was retried with a logged reason: 29 requests for 24 files.

#### Exit code 0

A scheduler sees success. Truncation is *expected* by the requirements, so it is reported, not raised. If truncation should page someone, add a `--fail-on-truncation` switch; that is a business decision, not a technical one.

> **The main idea:** the first run lands every file despite the failures, accounts for every line, and publishes one partition: 100,000 rows, truncation reported.

*Read more:* [GH Archive](https://www.gharchive.org/).

---

<a id="slide-35"></a>
## 35. Project: the manifest, the quarantine file, and the run log

*Part D · what the run left behind*

```python
import json
from pathlib import Path

part = Path("data/lake/gha_events/dt=2026-03-02")
print(sorted(p.name for p in part.iterdir()))
m = json.loads((part / "_manifest.json").read_text())
short = lambda xs: [{k: (v[:12] + "…" if k == "sha256" else v) for k, v in x.items()} for x in xs]
view = dict(m, sources=short(m["sources"][:2]) + [f"... {len(m['sources']) - 2} more"], outputs=short(m["outputs"]))
print(json.dumps(view, indent=1))
```

Output:

```text
['_manifest.json', '_quarantine.jsonl', 'part-00000.parquet', 'part-00001.parquet']
{
 "cap": 100000,
 "counts": {
  "duplicates": 3,
  "filtered_repo": 24000,
  "filtered_window": 2,
  "quarantined": 8,
  "read": 132013,
  "retained": 100000,
  "truncated": 8000
 },
 "cutoff": {
  "created_at": "2026-03-02T22:13:39+00:00",
  "event_id": 50089498434
 },
 "dataset": "gha_events",
 "ordering": "created_at ASC, event_id ASC",
 "outputs": [
  {
   "bytes": 4482936,
   "file": "part-00000.parquet",
   "rows": 58500,
   "sha256": "4768a4a1234d\u2026"
  },
  {
   "bytes": 3178255,
   "file": "part-00001.parquet",
   "rows": 41500,
   "sha256": "2130a9976e3d\u2026"
  }
 ],
 "partition": "dt=2026-03-02",
 "quarantine_reasons": {
  "bad_created_at": 1,
  "bad_id": 1,
  "bad_repo": 3,
  "invalid_json": 2,
  "not_an_object": 1
 },
 "repos": [
  "apache/iceberg",
  "astral-sh/ruff",
  "microsoft/vscode"
 ],
 "schema_version": "1",
 "sources": [
  {
   "bytes": 312722,
   "file": "2026-03-02-0.json.gz",
   "sha256": "51e711d17fdb\u2026"
  },
  {
   "bytes": 314753,
   "file": "2026-03-02-1.json.gz",
   "sha256": "6ef78755c744\u2026"
  },
  "... 22 more"
 ],
 "truncated": true,
 "window": {
  "end": "2026-03-03T00:00:00+00:00",
  "start": "2026-03-02T00:00:00+00:00"
 }
}
```

```python
for line in (part / "_quarantine.jsonl").read_text().splitlines()[:8]:
    q = json.loads(line)
    print(f"{q['source_file']:<22} line {q['line']:>4}  {q['reason']:<15} {q['raw'][:38]!r}")
for line in Path("data/runs/gha_events_runs.jsonl").read_text().splitlines():
    r = json.loads(line)
    print(r["run_id"], r["status"], r.get("manifest_sha256", "")[:16])
```

Output:

```text
2026-03-02-7.json.gz   line   51  invalid_json    '{"id":"50031163633","type":"PushEvent"'
2026-03-02-7.json.gz   line  148  invalid_json    '{"id":"50035425119","type":"Pul'
2026-03-02-11.json.gz  line   51  bad_repo        '{"id":"50049474365","type":"PushEvent"'
2026-03-02-11.json.gz  line  148  bad_repo        '{"id":"50048080403","type":"PushEvent"'
2026-03-02-11.json.gz  line  245  bad_repo        '{"id":"50045623924","type":"PullReques'
2026-03-02-13.json.gz  line   51  bad_created_at  '{"id":"50053088349","type":"PushEvent"'
2026-03-02-17.json.gz  line   51  bad_id          '{"id":"x50072350974","type":"PushEvent'
2026-03-02-19.json.gz  line   51  not_an_object   '["not", "an", "event"]'
r0001 started 
r0001 succeeded e919cd3e0e327c18
```

> **On the job:** Hand the manifest to consumers: a downstream job can refuse a partition whose manifest says `truncated: true`, check row counts against `outputs`, or verify file hashes before a release. The run log (with its start time, omitted here) feeds monitoring.

> **The main idea:** the manifest documents parameters, lineage, outputs and the audit identity; the quarantine file keeps every bad line with its reason; the run log records each attempt.

*Read more:* [json](https://docs.python.org/3/library/json.html).

---

<a id="slide-36"></a>
## 36. Project: verify the Parquet with PyArrow and DuckDB

*Part D · trust, but check the output independently*

```python
import pyarrow.parquet as pq
schema = pq.read_schema(part / "part-00000.parquet")
print(schema.to_string(show_schema_metadata=False).replace("\n", " | "))
print("metadata:", {k.decode(): v.decode() for k, v in schema.metadata.items()})
with pq.ParquetFile(part / "part-00000.parquet") as f:     # close it: Windows can't rename open files
    print("rows per row group:", [f.metadata.row_group(i).num_rows for i in range(f.metadata.num_row_groups)][:6], "...")
```

Output:

```text
event_id: int64 not null | event_type: string not null | created_at: timestamp[us, tz=UTC] not null | repo_id: int64 not null | repo_name: string not null | actor_id: int64 not null | actor_login: string not null | org_login: string | public: bool | payload_json: string not null | record_hash: string not null | source_file: string not null | source_line: int32 not null
metadata: {'dataset': 'gha_events', 'schema_version': '1'}
rows per row group: [4500, 4500, 4500, 4500, 4500, 4500] ...
```

```python
import duckdb
src = "read_parquet('data/lake/gha_events/*/*.parquet', hive_partitioning = true)"

def q(sql):                                     # a short-lived connection: no files left open
    with duckdb.connect() as con:
        con.execute("SET TimeZone = 'UTC'")
        return con.execute(sql.replace("SRC", src)).fetchall()

print(q("SELECT dt, count(*), count(DISTINCT event_id), count(DISTINCT record_hash), "
        "min(created_at)::VARCHAR, max(created_at)::VARCHAR FROM SRC GROUP BY dt"))
print(q("SELECT repo_name, count(*) FROM SRC GROUP BY 1 ORDER BY 1"))
print(q("SELECT event_type, count(*) FROM SRC GROUP BY 1 ORDER BY 2 DESC LIMIT 4"))
last = q("SELECT created_at::VARCHAR, event_id FROM SRC ORDER BY created_at DESC, event_id DESC LIMIT 1")[0]
print("last retained:", last, "| manifest cutoff:", m["cutoff"])
print("rows after the cutoff:", q(f"SELECT count(*) FROM SRC WHERE (created_at, event_id) > "
      f"('{m['cutoff']['created_at']}'::TIMESTAMPTZ, {m['cutoff']['event_id']})")[0][0])
```

Output:

```text
[(datetime.date(2026, 3, 2), 100000, 100000, 100000, '2026-03-02 00:00:03+00', '2026-03-02 22:13:39+00')]
[('apache/iceberg', 19998), ('astral-sh/ruff', 29989), ('microsoft/vscode', 50013)]
[('PushEvent', 60168), ('CreateEvent', 9040), ('IssueCommentEvent', 5960), ('PullRequestEvent', 5890)]
last retained: ('2026-03-02 22:13:39+00', 50089498434) | manifest cutoff: {'created_at': '2026-03-02T22:13:39+00:00', 'event_id': 50089498434}
rows after the cutoff: 0
```

- 100,000 rows, 100,000 distinct event ids and record hashes: no duplicates survived.
- The last retained row is exactly the manifest’s cutoff, and nothing beyond it is present: the cap did what the definition says.
- DuckDB returns `TIMESTAMP WITH TIME ZONE`; fixing the session time zone to UTC (and casting to text) keeps the output independent of the machine.

> **On the job:** Write these checks as a small “data test” step after every load (uniqueness of the key, row count = manifest, max key ≤ cutoff). dbt tests and Great Expectations do the same thing with configuration instead of code.

> **The main idea:** verify the published files with a different engine than the one that wrote them: schema, row counts, uniqueness, and the cutoff all match the manifest.

*Read more:* [DuckDB: Parquet](https://duckdb.org/docs/stable/data/parquet/overview), [DuckDB: Hive partitioning](https://duckdb.org/docs/stable/data/partitioning/hive_partitioning), [PyArrow: reading and writing Parquet](https://arrow.apache.org/docs/python/parquet/parquet.html).

---

<a id="slide-37"></a>
## 37. Project: the cap, truncation, and its alternatives

*Part D · what exactly was cut, and why this rule*

**Definition.** Candidates are valid, in-window events of the three repositories, after removing duplicate ids. Sorted by `(created_at, event_id)`, the first *cap* are retained; the rest are **truncated**. `truncated: true` means at least one candidate was dropped by the cap (never by a failure), and the **cutoff** is the key of the last retained event. Because the order is total and the input fixed, the same 100,000 events are chosen on every run, on any machine.

```python
print(q("SELECT hour(created_at) AS h, count(*) FROM SRC GROUP BY 1 ORDER BY 1 DESC LIMIT 3"))
print("hour 23 rows:", q("SELECT count(*) FROM SRC WHERE hour(created_at) = 23")[0][0])

import shutil
shutil.copytree("data/raw", "data_cap/raw", dirs_exist_ok=True)     # reuse the verified downloads
```

Output:

```text
[(22, 1000), (21, 4500), (20, 4500)]
hour 23 rows: 0
```

Output (same data, cap raised to 200,000):

```text
$ python gha_ingest.py --data-dir data_cap --cap 200000
INFO    run r0001 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=200000
INFO    landed 24 files: 0 downloaded, 24 already verified
published dt=2026-03-02: 108,000 rows in 2 file(s), truncated=False
audit: read 132,013 = retained 108,000 + filtered_repo 24,000 + filtered_window 2 + quarantined 8 + duplicates 3 + truncated 0
manifest sha256 caeeac204a9639e4
```

| Cap policy | Deterministic? | Bias | When to use |
|---|---|---|---|
| **First N by (created_at, id)** (chosen) | yes | Drops the end of the day | A hard budget with an easy explanation; cutoff is one key |
| Last N | yes | Drops the start of the day | When the most recent data matters most |
| Per-repo or per-hour quota | yes, with the same ordering inside each group | Even coverage, but quotas need tuning | Fairness across groups |
| Hash sample: keep if `hash(id) < threshold` | yes | None in expectation; N is approximate | Statistics over the whole day |
| `random.sample` without a seed | no | None, but irreproducible | Never in a pipeline |

> **On the job:** With the real repositories the cap is a safety bound: on 2026-03-02 15:00 UTC the three of them produced 28 events in one hour (optional real-hour slide), so a normal day is far below 100,000. A bounded ingester still needs the cap so that a bot storm on one repository can’t blow up storage or cost, and it must say so loudly when it bites.

> **The main idea:** the cap keeps the first N events by a total ordering; the manifest reports how many were cut and where. With the cap raised, the same input yields 108,000 rows and truncated=false.

*Read more:* [heapq](https://docs.python.org/3/library/heapq.html).

---

<a id="slide-38"></a>
## 38. Project: safe reruns produce identical bytes

*Part D · run it again and compare hashes*

Rerun exactly the same command. Every hour is already landed and verified, so nothing is downloaded; the partition is rebuilt in staging and swapped in. Because names, ordering, compression and the manifest are deterministic (no timestamps, no UUIDs), the new partition should be **byte-for-byte identical**.

```python
import hashlib
def fingerprint(folder):
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest()[:16] for p in sorted(Path(folder).iterdir())}
before = fingerprint(part)
print(before)
```

Output:

```text
{'_manifest.json': 'e919cd3e0e327c18', '_quarantine.jsonl': 'e02b80bfd365464b', 'part-00000.parquet': '4768a4a1234dd249', 'part-00001.parquet': '2130a9976e3df19f'}
```

Output:

```text
$ python gha_ingest.py
INFO    run r0002 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=100000
INFO    landed 24 files: 0 downloaded, 24 already verified
published dt=2026-03-02: 100,000 rows in 2 file(s), truncated=True
audit: read 132,013 = retained 100,000 + filtered_repo 24,000 + filtered_window 2 + quarantined 8 + duplicates 3 + truncated 8,000
manifest sha256 e919cd3e0e327c18
```

```python
after = fingerprint(part)
print("identical:", after == before)
print([json.loads(l)["status"] for l in Path("data/runs/gha_events_runs.jsonl").read_text().splitlines()])
```

Output:

```text
identical: True
['started', 'succeeded', 'started', 'succeeded']
```

> **On the job:** Byte-identical reruns are the strongest form of idempotency and make reviews easy (“the hashes match”). If you add an ingestion timestamp column, you keep *logical* idempotency (same rows, same keys) but lose byte identity; keep run metadata in the run log or the manifest’s sibling files instead.

> **The main idea:** a rerun with the same inputs downloads nothing, replaces the partition atomically, and produces identical files and an identical manifest hash.

*Read more:* [hashlib](https://docs.python.org/3/library/hashlib.html).

---

<a id="slide-39"></a>
## 39. Project: a crash during landing, then resume

*Part D · kill the process after 10 of 24 downloads*

Start from an empty data folder and kill the process right after the 10th file is verified. Exit code 137 is what a shell reports for a process killed with signal 9 (128 + 9); the demo uses it with `os._exit`, which skips all `finally` blocks and buffers, like a real kill.

Output:

```text
$ python gha_ingest.py --data-dir data_crash --crash-at download:10
INFO    run r0001 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=100000
CRITICAL SIMULATED CRASH at download:10 (process killed, no cleanup)
[exit code 137]
```

```python
raw = Path("data_crash/raw/gharchive/2026-03-02")
print("landed:", len(list(raw.glob("*.json.gz"))), "files,", len(list(raw.glob("*.meta.json"))), "checkpoints,",
      len(list(raw.glob("*.part"))), "partial files")
print("published partitions:", sorted(p.name for p in Path("data_crash/lake/gha_events").glob("dt=*")))
```

Output:

```text
landed: 10 files, 10 checkpoints, 0 partial files
published partitions: []
```

Output:

```text
$ python gha_ingest.py --data-dir data_crash
INFO    run r0002 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=100000
INFO    landed 24 files: 14 downloaded, 10 already verified
published dt=2026-03-02: 100,000 rows in 2 file(s), truncated=True
audit: read 132,013 = retained 100,000 + filtered_repo 24,000 + filtered_window 2 + quarantined 8 + duplicates 3 + truncated 8,000
manifest sha256 e919cd3e0e327c18
```

```python
print("same partition as the clean run:", fingerprint("data_crash/lake/gha_events/dt=2026-03-02") == before)
print([json.loads(l)["status"] for l in Path("data_crash/runs/gha_events_runs.jsonl").read_text().splitlines()])
```

Output:

```text
same partition as the clean run: True
['started', 'started', 'succeeded']
```

> **On the job:** “Resume” here needs no special code: the verified files and their sidecars are the checkpoint, and the rest of the pipeline is a pure function of them. The run log shows the crashed attempt as a `started` without an outcome, which is how an on-call engineer spots it.

> **The main idea:** a crash during landing loses at most the file in flight; the rerun skips the 10 verified files, downloads the other 14, and publishes a partition identical to the clean run.

*Read more:* [os.replace](https://docs.python.org/3/library/os.html#os.replace).

---

<a id="slide-40"></a>
## 40. Project: crashes while writing and while publishing

*Part D · readers never see half a partition*

Two harder crashes against the already published `data/` folder. **(a)** Kill the process after 5 Parquet batches: the half-written files are in `_staging`, and readers still see the last good partition. **(b)** Rerun, but kill it between the two renames of `publish()`: the old partition has been moved aside and the new one not yet moved in. **(c)** A normal rerun recovers.

Output ((a) crash while writing):

```text
$ python gha_ingest.py --crash-at write:5
INFO    run r0003 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=100000
INFO    landed 24 files: 0 downloaded, 24 already verified
CRITICAL SIMULATED CRASH at write:5 (process killed, no cleanup)
[exit code 137]
```

```python
ds = Path("data/lake/gha_events")
def layout():
    return sorted(p.relative_to(ds).as_posix() for p in ds.rglob("*") if p.is_file())
def readers_see():
    parts = sorted(p.parent.name for p in ds.glob("dt=*/_manifest.json"))
    rows = q("SELECT count(*) FROM SRC")[0][0] if parts else 0
    return f"complete partitions {parts}, {rows:,} rows"
print(*layout(), sep="\n")
print("readers see:", readers_see(), "| unchanged:", fingerprint(part) == before)
```

Output:

```text
_staging/dt=2026-03-02/_quarantine.jsonl
_staging/dt=2026-03-02/part-00000.parquet
dt=2026-03-02/_manifest.json
dt=2026-03-02/_quarantine.jsonl
dt=2026-03-02/part-00000.parquet
dt=2026-03-02/part-00001.parquet
readers see: complete partitions ['dt=2026-03-02'], 100,000 rows | unchanged: True
```

Output ((b) crash between the two renames):

```text
$ python gha_ingest.py --crash-at publish
INFO    run r0004 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=100000
INFO    recover: deleted abandoned staging _staging/dt=2026-03-02
INFO    landed 24 files: 0 downloaded, 24 already verified
CRITICAL SIMULATED CRASH at publish (process killed, no cleanup)
[exit code 137]
```

```python
print(*layout(), sep="\n")
print("readers see:", readers_see())
```

Output:

```text
_staging/dt=2026-03-02/_manifest.json
_staging/dt=2026-03-02/_quarantine.jsonl
_staging/dt=2026-03-02/part-00000.parquet
_staging/dt=2026-03-02/part-00001.parquet
_trash/dt=2026-03-02/_manifest.json
_trash/dt=2026-03-02/_quarantine.jsonl
_trash/dt=2026-03-02/part-00000.parquet
_trash/dt=2026-03-02/part-00001.parquet
readers see: complete partitions [], 0 rows
```

Output ((c) normal rerun):

```text
$ python gha_ingest.py
INFO    run r0005 window 2026-03-02T00:00:00+00:00/2026-03-03T00:00:00+00:00 repos=apache/iceberg,astral-sh/ruff,microsoft/vscode cap=100000
INFO    recover: restored last good dt=2026-03-02
INFO    recover: deleted abandoned staging _staging/dt=2026-03-02
INFO    landed 24 files: 0 downloaded, 24 already verified
published dt=2026-03-02: 100,000 rows in 2 file(s), truncated=True
audit: read 132,013 = retained 100,000 + filtered_repo 24,000 + filtered_window 2 + quarantined 8 + duplicates 3 + truncated 8,000
manifest sha256 e919cd3e0e327c18
```

```python
print(*layout(), sep="\n")
print("readers see:", readers_see(), "| identical to the first run:", fingerprint(part) == before)
print([json.loads(l)["status"] for l in Path("data/runs/gha_events_runs.jsonl").read_text().splitlines()])
```

Output:

```text
dt=2026-03-02/_manifest.json
dt=2026-03-02/_quarantine.jsonl
dt=2026-03-02/part-00000.parquet
dt=2026-03-02/part-00001.parquet
readers see: complete partitions ['dt=2026-03-02'], 100,000 rows | identical to the first run: True
['started', 'succeeded', 'started', 'succeeded', 'started', 'started', 'started', 'succeeded']
```

> **On the job:** In (b) readers briefly saw *no* partition for this day, never a partial one. If even that gap is unacceptable, publish through a table format (Delta/Iceberg commit) or a pointer file, where the switch is a single atomic write.

> **The main idea:** whatever moment the process dies, the published folder is either the last good partition or absent, never partial; the next run cleans up, restores, and republishes identical bytes.

*Read more:* [os.rename](https://docs.python.org/3/library/os.html#os.rename).

---

<a id="slide-41"></a>
## 41. Optional: the same parser on one real GH Archive hour

*Part D · schema check against reality (added)*

To check that the fixture’s schema matches reality, one real hour, `2026-03-02-15.json.gz`, was downloaded once from `data.gharchive.org` with a streamed httpx request (ETag and size recorded), and cached next to the deck’s sources. The build never touches the network: if the cache is missing, this slide is skipped. The script below reuses the ingester’s own functions; it prints no user names.

```python
# profile_real_hour.py
"""profile_real_hour.py: run the ingester's own parser over one real GH Archive hour (cached copy)."""
import hashlib, json, sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from gha_ingest import classify, parse_event, read_lines, sha256_file

path = Path(sys.argv[1])
meta = json.loads(path.with_name(path.name + ".meta.json").read_text())
md5 = hashlib.md5(path.read_bytes()).hexdigest()
print(f"{path.name}: {path.stat().st_size:,} bytes, sha256 matches download: {sha256_file(path) == meta['sha256']}, "
      f"MD5 == ETag: {md5 == meta['etag']}")

start = datetime(2026, 3, 2, tzinfo=timezone.utc)
repos = {"microsoft/vscode", "apache/iceberg", "astral-sh/ruff"}
outcomes, reasons, types, per_repo = Counter(), Counter(), Counter(), Counter()
first = last = None
with_org = rising = previous_id = 0
for _, line in read_lines(path):
    outcome, reason, e, ts = classify(line, start, start + timedelta(days=1), repos)
    outcomes[outcome] += 1
    if reason:
        reasons[reason] += 1
        continue
    ev, ts, _ = parse_event(line)
    types[ev["type"]] += 1
    with_org += "org" in ev
    rising += int(ev["id"]) > previous_id
    previous_id = int(ev["id"])
    first, last = min(first or ts, ts), max(last or ts, ts)
    if outcome == "candidate":
        per_repo[e["repo"]["name"]] += 1
total = sum(outcomes.values())
print("events:", f"{total:,}", "| outcomes:", dict(outcomes), "| quarantine reasons:", dict(reasons))
print("created_at range:", first.isoformat(), "->", last.isoformat())
print("top types:", ", ".join(f"{t} {n / total:.1%}" for t, n in types.most_common(5)))
print(f"with org: {with_org / total:.1%} | ids rising vs previous line: {rising / total:.1%} (not time-ordered)")
print("retained candidates per repo:", dict(sorted(per_repo.items())))
```

Output (real data, cached copy):

```text
$ python profile_real_hour.py real/2026-03-02-15.json.gz
2026-03-02-15.json.gz: 32,740,101 bytes, sha256 matches download: True, MD5 == ETag: True
events: 145,727 | outcomes: {'filtered_repo': 145696, 'candidate': 28, 'quarantined': 3} | quarantine reasons: {'bad_repo': 3}
created_at range: 2026-03-02T15:00:02+00:00 -> 2026-03-02T15:59:59+00:00
top types: PushEvent 72.8%, CreateEvent 9.8%, PullRequestEvent 4.9%, DeleteEvent 4.1%, IssueCommentEvent 2.1%
with org: 22.6% | ids rising vs previous line: 97.0% (not time-ordered)
retained candidates per repo: {'apache/iceberg': 5, 'astral-sh/ruff': 8, 'microsoft/vscode': 15}
```

#### What reality confirmed

- The envelope fields and types are exactly as on slide 20: `id` is a digit string, `org` is optional, `created_at` is UTC with a `Z`.
- Three events had an empty `repo` object: real malformed records, quarantined by the same rule as the fixture’s planted ones.
- Ids only roughly follow time (3% of neighbouring lines go backwards), so the tie-breaker must be explicit and numeric.
- GH Archive’s ETag is the file’s MD5, so `download_verified` can check it.

#### And what it changes

Real volumes for the three repositories are tiny compared with the fixture (tens per hour, not 4,500), so in production the 100,000 cap is a guard rail. One real hour is ~33 MB compressed and ~146,000 events; a full day is ~0.8 GB to download for a few hundred retained events. That ratio is why many teams query GH Archive through its BigQuery copy instead of downloading files.

> **The main idea:** one real file is the cheapest schema test there is: it confirmed the fixture’s shape and exposed a real malformed record the parser already handles.

*Read more:* [GH Archive](https://www.gharchive.org/), [GitHub event types](https://docs.github.com/en/rest/using-the-rest-api/github-event-types).

---

<a id="slide-42"></a>
## 42. Manual ingestion versus dlt

*Part E · what a framework automates, and what stays yours*

**dlt** (data load tool) is an open-source Python library for loading data: you describe a **source** (for example a REST API) made of **resources** (endpoints), and a **pipeline** extracts, normalises and loads them into a **destination** (DuckDB, a warehouse, or files in a lake). Much of Parts A–C is built in.

| Concern | This deck, by hand | dlt |
|---|---|---|
| Pagination | `paginate_links`, `paginate_cursor` | Paginators for cursor, Link header, JSON “next” link, offset and page number, with auto-detection |
| Retries | `httpkit`: classify, full-jitter backoff, `Retry-After` | Its HTTP helper retries connection errors, timeouts, 429 and 5xx with backoff and honours `Retry-After`; tunable in config |
| Incremental state | Checkpoint files, verified landing files | `dlt.sources.incremental`: the last cursor value is stored with the pipeline state and passed to the next run |
| Schema | Explicit PyArrow schema, written once | Inferred from the data, versioned, and evolved when new fields appear; **schema contracts** can freeze it |
| Normalisation | `payload` kept as JSON text | Nested objects become columns, nested lists become child tables (`events__items`) |
| Writing | Batched ParquetWriter, stage-and-swap | `append`, `replace` or `merge` on a primary key; load packages committed per destination |
| Lineage | Manifest, run log | `_dlt_loads`, `_dlt_load_id` on every row, traces |

#### What stays yours

- The business definitions: window, which records, the cap and what truncation means.
- Quarantine rules and the audit identity (`read = retained + …`).
- Retry and rate-limit budgets for *your* provider, secrets, and alerting.
- Partition layout and file sizes in the lake.
- Knowing what the framework does on failure, so you can explain a bad load.

#### When to choose which

Use a framework (dlt, Airbyte, Fabric/ADF Copy) for common SaaS and REST sources where the defaults fit. Write it yourself (or extend the framework) when you need exact control: deterministic caps, byte-identical reruns, custom verification, or an odd source such as hourly archives.

> **On the job:** A good interview answer is “both”: “I’d start with dlt’s REST source for the 20 standard endpoints, and write a small custom resource, with the same retry and checkpoint rules as here, for the one awkward source.”

> **The main idea:** dlt automates pagination, retries, incremental state, schema inference/evolution and normalisation; the definitions of completeness, quality and correctness remain your responsibility.

*Read more:* [dlt docs](https://dlthub.com/docs/intro), [dlt REST API source](https://dlthub.com/docs/dlt-ecosystem/verified-sources/rest_api/basic), [dlt incremental loading](https://dlthub.com/docs/general-usage/incremental-loading), [dlt schema evolution](https://dlthub.com/docs/general-usage/schema-evolution).

---

<a id="slide-43"></a>
## 43. A small dlt pipeline, offline, twice

*Part E · the API lab’s cursor endpoint loaded by dlt into DuckDB*

The same fake `/api/events` endpoint, described declaratively for dlt’s REST API source: a cursor paginator, a `data` selector, a `merge` on `id`, and an incremental `since` parameter driven by `updated_at`. It runs in the separate dlt environment, with telemetry off and all state inside the project folder. Between the two runs the source gains 3 events and one existing event changes.

```python
# dlt_events.py
"""dlt_events.py: the same cursor-paginated API, loaded by dlt into DuckDB, incrementally."""
import os
import dlt
from dlt.sources.rest_api import rest_api_source

source = rest_api_source({
    "client": {
        "base_url": os.environ["FAKE_API"] + "/api/",
        "paginator": {"type": "cursor", "cursor_path": "next_cursor", "cursor_param": "cursor"},
    },
    "resource_defaults": {"primary_key": "id", "write_disposition": "merge"},
    "resources": [{
        "name": "events",
        "endpoint": {
            "path": "events",
            "data_selector": "data",
            "params": {
                "limit": 20,
                "since": {"type": "incremental", "cursor_path": "updated_at",
                          "initial_value": "2026-03-01T00:00:00Z"},
            },
        },
    }],
})

pipeline = dlt.pipeline(
    pipeline_name="fake_events",
    destination=dlt.destinations.duckdb("dlt_events.duckdb"),
    dataset_name="raw",
    pipelines_dir=os.path.abspath(".dlt/pipelines"),     # keep state inside the project
)
info = pipeline.run(source)
print("failed jobs:", info.has_failed_jobs)
print("rows this run:", {t: n for t, n in pipeline.last_trace.last_normalize_info.row_counts.items()
                          if not t.startswith("_dlt")})
with pipeline.sql_client() as sql:
    print("raw.events rows, distinct ids:", sql.execute_sql("SELECT count(*), count(DISTINCT id) FROM events")[0])
    print("refunds:", sql.execute_sql("SELECT id, kind FROM events WHERE kind = 'refund'"))
    print("loads so far:", sql.execute_sql("SELECT count(*) FROM _dlt_loads")[0][0])
cols = pipeline.default_schema.get_table_columns("events")
print("columns:", ", ".join(f"{n} {c['data_type']}" for n, c in cols.items()))
```

Output (run 1 · dlt environment, dlt 1.30.0):

```text
$ python dlt_events.py
failed jobs: False
rows this run: {'events': 57}
raw.events rows, distinct ids: (57, 57)
refunds: []
loads so far: 1
columns: id bigint, kind text, updated_at timestamp, _dlt_load_id text, _dlt_id text
```

```python
import fakeapi
print(fakeapi.requests_log())
fakeapi.touch_events(new=3, update_ids=(5,))      # 3 new events; event 5 becomes a refund, updated later
```

Output:

```text
['GET /api/events?limit=20&since=2026-03-01T00%3A00%3A00Z -> ok', 'GET /api/events?limit=20&since=2026-03-01T00%3A00%3A00Z&cursor=YWZ0ZXI6MjA -> ok', 'GET /api/events?limit=20&since=2026-03-01T00%3A00%3A00Z&cursor=YWZ0ZXI6NDA -> ok']
```

Output (run 2):

```text
$ python dlt_events.py
failed jobs: False
rows this run: {'events': 4}
raw.events rows, distinct ids: (60, 60)
refunds: [(5, 'refund')]
loads so far: 2
columns: id bigint, kind text, updated_at timestamp, _dlt_load_id text, _dlt_id text
```

```python
print(fakeapi.requests_log())
fakeapi.reset()
```

Output:

```text
['GET /api/events?limit=20&since=2026-03-02T09%3A39%3A00Z -> ok']
```

- Run 1 paged through all 57 events (three requests). Run 2 sent `since=…09:39:00Z`, the highest `updated_at` it had stored, and received only the 4 changed rows in one request.
- `merge` on `id` updated event 5 in place instead of duplicating it: 60 rows, 60 distinct ids.
- dlt inferred the column types (`updated_at` became a timestamp) and added `_dlt_load_id` and `_dlt_id` for lineage.

> **On the job:** Incremental-by-`updated_at` has the same edge cases with or without dlt: ties at the boundary (dlt deduplicates them for you), late updates with an older timestamp (they are missed), and deletes (never seen). For those, schedule a periodic full reconciliation.

> **The main idea:** twenty lines of configuration gave pagination, incremental state, merge on a key, schema inference and lineage columns; the edge cases of the source are still yours to know.

*Read more:* [dlt REST API source](https://dlthub.com/docs/dlt-ecosystem/verified-sources/rest_api/basic), [dlt incremental loading](https://dlthub.com/docs/general-usage/incremental-loading), [dlt telemetry](https://dlthub.com/docs/reference/telemetry).

---

<a id="slide-44"></a>
## 44. Interview talking points

*Practice · ten questions and answers you can say out loud (added)*

Each answer names a mechanism, not just a principle, and points back to the slide where it was demonstrated. Open a question, answer it aloud, then compare.

<details><summary>How do you make an API extract resumable?</summary>

Page with a cursor, write each page with a deterministic name, then save the cursor atomically as the checkpoint. On restart, resume from the checkpoint; at worst one page is fetched again and overwritten, so there are no duplicates (slide 17).

</details>

<details><summary>What do you retry, and how?</summary>

Only transient failures of idempotent requests: connection errors, timeouts, 429 and 5xx on GETs; never 4xx or code bugs; POSTs only with an idempotency key. Exponential backoff with full jitter, capped, honouring Retry-After, with a maximum number of attempts and a total time budget (slides 11–14).

</details>

<details><summary>Why jitter?</summary>

Without it, every client that failed together retries together and knocks the recovering service over again (the thundering herd). Full jitter spreads retries uniformly (slide 12).

</details>

<details><summary>How do you avoid duplicates?</summary>

Use the source’s natural key, deduplicate within the run, write deterministic file names, and publish idempotently: replace the whole partition for the window instead of appending (slides 25, 29).

</details>

<details><summary>How do you know you didn’t lose data?</summary>

Audit counts: every line read is retained, filtered, quarantined, duplicate or truncated, and the identity is checked before publishing; then reconcile against the source and verify the output with another engine (slides 30, 36).

</details>

<details><summary>The job died halfway. What state is the data in?</summary>

The published partition is the last good one (or briefly absent during the swap, never partial), staging is cleaned up at the next start, and a rerun produces byte-identical output (slides 39–40).

</details>

<details><summary>What if the source schema changes?</summary>

An explicit schema makes the change fail loudly or land in quarantine; the payload is kept raw for replay. With dlt, schema evolution adds columns automatically, and contracts can freeze it (slides 26, 42).

</details>

<details><summary>Why Parquet, and why partition by day?</summary>

Columnar, typed, compressed, readable by every engine. Partition by the unit you load and reprocess, the day; finer partitions create small files that slow every query (slide 28).

</details>

<details><summary>How are secrets handled?</summary>

Key Vault through a managed identity in production, environment variables locally, wrapped and redacted in logs, never in Git or outputs (slide 31).

</details>

<details><summary>Paginated API or hourly files: what changes?</summary>

APIs: cursor checkpoints, throttling and a source that changes while you read. Files: a fixed window, per-file verification and checkpoints, and your own ordering and cap (slide 3).

</details>

> **On the job:** Draw the pipeline while you talk: land → validate/quarantine → stage → audit → publish → verify, with the checkpoint and the run log on the side. Interviewers remember the drawing.

> **The main idea:** strong answers name the mechanism (checkpoint after write, full jitter, stage-and-swap, audit identity) and the evidence (a rerun with identical hashes).

---

<a id="slide-45"></a>
## 45. Bug clinic: ingestion failures and their fixes

*Practice · symptom → cause → fix*

| # | Symptom | Cause | Fix | Slide |
|---|---|---|---|---|
| 1 | Job hangs for hours, no error | No or huge read timeout; `requests` without `timeout=` | Explicit connect/read timeouts; a total deadline | 7 |
| 2 | A few records duplicated, others missing, in a big extract | Offset paging while the source changes | Cursor/keyset paging; dedupe on the key | 8, 10 |
| 3 | Second page repeats the first, or params doubled | Re-sending params with a `next` URL that already has them | Follow the URL as is (`params=None`) | 9 |
| 4 | Duplicate orders after a timeout | Retrying a POST that had succeeded | No POST retries without an Idempotency-Key | 11 |
| 5 | Throttling gets worse after an outage | Retries without jitter; ignoring Retry-After | Full jitter; honour Retry-After; token bucket | 12, 13, 15 |
| 6 | Job sleeps for hours on one call | Unbounded Retry-After or backoff | Cap per wait, max attempts, total budget | 13, 14 |
| 7 | Job “succeeds” on a 404 page or an error JSON | No `raise_for_status()` | Check every status | 6 |
| 8 | Crash and restart re-downloads or duplicates everything | Checkpoint saved before the data, or not at all | Data first, checkpoint second, both atomic | 17, 22 |
| 9 | `.gz` file that isn’t gzip | `iter_bytes()` decoded `Content-Encoding: gzip` | `iter_raw()`; verify checksums | 22 |
| 10 | Corrupt file accepted after a dropped connection | No size/checksum verification; written in place | `.part` + verify + `os.replace` | 22 |
| 11 | `microsoft/vscode-docs` in a vscode report | `startswith` instead of equality | Exact, case-insensitive match (or repo id) | 23 |
| 12 | Writer fails on batch 7: schema mismatch | Types inferred per batch (all-null column) | One explicit schema for every batch | 26 |
| 13 | Queries slow, thousands of 50 KB files | Over-partitioning (hour × repo …) | Partition by the load unit; compact | 28 |
| 14 | Rerun doubles the rows | Append with random file names | Deterministic names; replace the partition | 25, 29 |
| 15 | Readers saw half a day | Writing straight into the published folder | Stage, then swap; manifest last | 29 |
| 16 | `PermissionError [WinError 5]` when publishing on Windows | A reader (notebook, `pq.ParquetFile`, DuckDB connection) holds a file open in the partition | Close readers (`with`); retry the swap later; this happened while building this deck | 36, 40 |
| 17 | Different “first 100,000” on every run | Ordering with ties, or ids sorted as text | Total order `(created_at, int(id))` | 25, 37 |
| 18 | Token in a log file or notebook output | Logging headers/URLs; printing config | Secret wrapper, redaction hooks, Key Vault | 31 |

> **On the job:** Bug 16 is real: an earlier version of slide 36 left a `ParquetFile` and a DuckDB connection open, and the next rerun failed with `PermissionError` on `os.rename`. On Linux the rename would have succeeded; on Windows open files pin their folder.

> **The main idea:** most ingestion bugs are a missing bound (timeouts, caps, budgets), a missing order (data before checkpoint, total ordering), or a missing atomic step (verify then rename, stage then swap).

---

<a id="slide-46"></a>
## 46. Exercises 1–4: retries and pagination

*Exercises · HTTP failure handling*

Everything runs offline: HTTP calls go to `httpx.MockTransport` handlers, time comes from fake clocks, and files go under `ex/`. Each starter block was executed and fails with `NotImplementedError` until you replace the marked line; the tests are plain `assert` statements. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · Classify retryable failures

Write `should_retry(method, status=None, error=None)`. `error` is an exception class name as a string. Follow the table on slide 11: connection failures are retryable for any method; 429 for any method; timeouts, read/protocol errors and 408/425/5xx only for idempotent methods; everything else never.

```python
IDEMPOTENT = {"GET", "HEAD", "OPTIONS", "PUT", "DELETE"}

def should_retry(method, status=None, error=None):
    raise NotImplementedError("your code here")

cases = {("GET", 503, None): True, ("GET", 404, None): False, ("POST", 503, None): False,
         ("POST", 429, None): True, ("DELETE", 502, None): True, ("GET", None, "ReadTimeout"): True,
         ("POST", None, "ReadTimeout"): False, ("POST", None, "ConnectError"): True,
         ("PATCH", None, "ConnectTimeout"): True, ("GET", None, "KeyError"): False, ("GET", 401, None): False}
for args, expected in cases.items():
    assert should_retry(*args) is expected, args
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · A capped, seeded full-jitter schedule

Write `retry_schedule(n, base, cap, seed)` returning the `n` full-jitter delays for attempts 0..n−1 from a `random.Random(seed)`. The same seed must give the same list; every delay must be within `[0, min(cap, base·2^i)]`.

```python
import random

def retry_schedule(n, base=0.5, cap=30.0, seed=None):
    raise NotImplementedError("your code here")

s1, s2 = retry_schedule(8, seed=11), retry_schedule(8, seed=11)
assert s1 == s2 and len(s1) == 8
assert all(0 <= d <= min(30.0, 0.5 * 2 ** i) for i, d in enumerate(s1))
assert retry_schedule(8, seed=12) != s1
assert max(retry_schedule(50, base=1, cap=2, seed=1)) <= 2
print([round(d, 2) for d in s1])
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Read Retry-After from real headers

Write `wait_seconds(headers, now, default)`: return the seconds to wait from a `Retry-After` header (delay-seconds or HTTP-date), relative to `now`; `default` if the header is missing or unparseable; never negative. Header names are case-insensitive, so use `httpx.Headers`.

```python
from datetime import datetime, timezone
import httpx

def wait_seconds(headers, now, default=1.0):
    raise NotImplementedError("your code here")

now = datetime(2026, 3, 2, 14, 0, 0, tzinfo=timezone.utc)
assert wait_seconds(httpx.Headers({"retry-after": "120"}), now) == 120.0
assert wait_seconds(httpx.Headers({"Retry-After": "Mon, 02 Mar 2026 14:01:30 GMT"}), now) == 90.0
assert wait_seconds(httpx.Headers({"Retry-After": "Mon, 02 Mar 2026 13:00:00 GMT"}), now) == 0.0
assert wait_seconds(httpx.Headers({"Retry-After": "later"}), now, default=5) == 5
assert wait_seconds(httpx.Headers({}), now, default=2.5) == 2.5
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Follow Link headers against a mock server

The handler below plays an API with 25 items, 10 per page, and GitHub-style `Link` headers. Write `fetch_all(client, url, per_page)` that follows `rel="next"` and returns all items. It must make exactly 3 requests and never send `per_page` twice.

```python
import httpx
from urllib.parse import parse_qs

ITEMS = list(range(1, 26))
seen_urls = []

def handler(request):
    seen_urls.append(str(request.url))
    q = parse_qs(request.url.query.decode())
    assert all(len(v) == 1 for v in q.values()), "a parameter was sent twice"
    page, size = int(q.get("page", ["1"])[0]), int(q["per_page"][0])
    chunk = ITEMS[(page - 1) * size: page * size]
    headers = {}
    if page * size < len(ITEMS):
        headers["Link"] = f'<https://api.test/items?page={page + 1}&per_page={size}>; rel="next"'
    return httpx.Response(200, json=chunk, headers=headers)

def fetch_all(client, url, per_page):
    raise NotImplementedError("your code here")

with httpx.Client(transport=httpx.MockTransport(handler)) as client:
    items = fetch_all(client, "https://api.test/items", per_page=10)
assert items == ITEMS and len(seen_urls) == 3
print(seen_urls[-1])
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

> **The main idea:** retry rules, backoff schedules and Retry-After parsing are small pure functions: test them with tables of cases and seeded randomness.

---

<a id="slide-47"></a>
## 47. Exercises 5–8: rate limits, checkpoints, verification, validation

*Exercises · resumable and verified input*

Everything runs offline: HTTP calls go to `httpx.MockTransport` handlers, time comes from fake clocks, and files go under `ex/`. Each starter block was executed and fails with `NotImplementedError` until you replace the marked line; the tests are plain `assert` statements. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 5 · Token bucket start times with a fake clock

Write `start_times(n, rate, capacity)`: the times at which `n` back-to-back requests may start under a token bucket that starts full. Simulate time; don’t sleep.

```python
def start_times(n, rate, capacity):
    raise NotImplementedError("your code here")

assert start_times(5, rate=1, capacity=2) == [0, 0, 1, 2, 3]
assert start_times(4, rate=10, capacity=1) == [0, 0.1, 0.2, 0.3]
assert start_times(3, rate=0.5, capacity=3) == [0, 0, 0]
assert start_times(6, rate=2, capacity=3)[-1] == 1.5
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

### Exercise 6 · A cursor extractor that survives a crash

A mock cursor API serves 45 records, 10 per page, and raises `ConnectError` on its 3rd call. Write `extract(client, folder)` that writes `page-00001.jsonl`, … and an atomic `_checkpoint.json` (data first, checkpoint second), resuming from the checkpoint. The first call must raise; the second must finish with 45 unique records and exactly 5 page files.

```python
import json, os, shutil
from pathlib import Path
import httpx

calls = []
def handler(request):
    calls.append(request.url.params.get("cursor"))
    if len(calls) == 3:
        raise httpx.ConnectError("network blip")
    after = int(request.url.params.get("cursor") or 0)
    rows = [{"id": i} for i in range(after + 1, min(after + 10, 45) + 1)]
    return httpx.Response(200, json={"data": rows, "next_cursor": str(rows[-1]["id"]) if rows[-1]["id"] < 45 else None})

def extract(client, folder):
    raise NotImplementedError("your code here")

folder = Path("ex/e6"); shutil.rmtree(folder, ignore_errors=True)
with httpx.Client(transport=httpx.MockTransport(handler), base_url="https://api.test") as client:
    try:
        extract(client, folder)
        raise AssertionError("expected a ConnectError on the first run")
    except httpx.ConnectError:
        pass
    extract(client, folder)
ids = [json.loads(l)["id"] for p in sorted(folder.glob("page-*.jsonl")) for l in p.open()]
assert sorted(ids) == list(range(1, 46)) and len(list(folder.glob("page-*.jsonl"))) == 5
assert calls == [None, "10", "20", "20", "30", "40"]
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · Verify a downloaded file

Write `verify(path, headers)` returning `None` if the file is complete, or a reason: `"size"` if it doesn’t match `Content-Length`, `"md5"` if a 32-hex-character ETag doesn’t match the file’s MD5. Other ETag formats can’t be checked and are ignored. Read the file in chunks.

```python
import gzip, hashlib, re
from pathlib import Path

def verify(path, headers):
    raise NotImplementedError("your code here")

Path("ex").mkdir(exist_ok=True)
data = gzip.compress(b'{"id": "1"}\n' * 1000, mtime=0)
Path("ex/ok.json.gz").write_bytes(data)
Path("ex/cut.json.gz").write_bytes(data[: len(data) // 2])
good = {"Content-Length": str(len(data)), "ETag": '"' + hashlib.md5(data).hexdigest() + '"'}
assert verify("ex/ok.json.gz", good) is None
assert verify("ex/cut.json.gz", good) == "size"
assert verify("ex/ok.json.gz", {**good, "ETag": '"' + "0" * 32 + '"'}) == "md5"
assert verify("ex/ok.json.gz", {**good, "ETag": 'W/"abc-123"'}) is None
assert verify("ex/ok.json.gz", {}) is None
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Validate GH Archive lines

Write `validate(line)` returning `(event, None)` or `(None, reason)` with reasons `invalid_json`, `not_an_object`, `bad_id` (id must be a digit string), `bad_repo` (repo must have int `id` and str `name`), `bad_created_at` (format `%Y-%m-%dT%H:%M:%SZ`).

```python
import json
from datetime import datetime, timezone

def validate(line):
    raise NotImplementedError("your code here")

base = {"id": "123", "type": "PushEvent", "repo": {"id": 1, "name": "apache/iceberg"}, "created_at": "2026-03-02T10:00:00Z"}
cases = {
    json.dumps(base): None,
    json.dumps(base)[:30]: "invalid_json",
    "[1, 2]": "not_an_object",
    json.dumps(base | {"id": 123}): "bad_id",
    json.dumps(base | {"id": "12a"}): "bad_id",
    json.dumps(base | {"repo": {}}): "bad_repo",
    json.dumps(base | {"created_at": "2026-03-02 10:00:00"}): "bad_created_at",
    json.dumps({k: v for k, v in base.items() if k != "created_at"}): "bad_created_at",
}
for line, expected in cases.items():
    event, reason = validate(line)
    assert reason == expected, (line, reason)
    assert (event is None) == (expected is not None)
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

> **The main idea:** simulate time, crash on purpose, and verify every byte: resumability and verification are testable without a network.

---

<a id="slide-48"></a>
## 48. Exercises 9–11: caps, Parquet, publication

*Exercises · deterministic, typed, atomic output*

Everything runs offline: HTTP calls go to `httpx.MockTransport` handlers, time comes from fake clocks, and files go under `ex/`. Each starter block was executed and fails with `NotImplementedError` until you replace the marked line; the tests are plain `assert` statements. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 9 · A deterministic cap with ties and duplicates

Write `apply_cap(events, cap)` → `(retained_ids, truncated, cutoff)`. Drop repeated ids (keep the first), order by `(created_at, int(id))`, keep the first `cap`. `cutoff` is the key of the last retained event when something was truncated, else `None`. The result must not depend on input order.

```python
import random

def apply_cap(events, cap):
    raise NotImplementedError("your code here")

T = "2026-03-02T10:00:00Z"
events = [{"id": "10", "created_at": T}, {"id": "9", "created_at": T}, {"id": "100", "created_at": "2026-03-02T09:59:59Z"},
          {"id": "9", "created_at": T}, {"id": "11", "created_at": "2026-03-02T10:00:01Z"}, {"id": "2", "created_at": T}]
kept, truncated, cutoff = apply_cap(events, cap=3)
assert kept == ["100", "2", "9"] and truncated == 2 and cutoff == (T, 9)
shuffled = events[:]
random.Random(4).shuffle(shuffled)
assert apply_cap(shuffled, cap=3) == (kept, truncated, cutoff)
assert apply_cap(events, cap=10) == (["100", "2", "9", "10", "11"], 0, None)
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Explicit schema, batched writes, three row groups

Write 2,500 rows (`id` 1…2500, `ts` = 2026-03-02 UTC + id seconds, `tag` = `None` for ids ≤ 1000, else `"t{id % 3}"`) to `ex/e10.parquet` in batches of 1,000 with one `ParquetWriter` and an explicit schema. Then check the row groups, the types and the nulls with DuckDB.

```python
from datetime import datetime, timedelta, timezone
import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

SCHEMA = pa.schema([pa.field("id", pa.int64(), nullable=False),
                    pa.field("ts", pa.timestamp("us", tz="UTC"), nullable=False),
                    pa.field("tag", pa.string())])

def write_batches(path, n=2500, batch=1000):
    raise NotImplementedError("your code here")

write_batches("ex/e10.parquet")
with pq.ParquetFile("ex/e10.parquet") as f:
    groups = [f.metadata.row_group(i).num_rows for i in range(f.metadata.num_row_groups)]
    assert groups == [1000, 1000, 500] and f.schema_arrow.field("tag").type == pa.string()
with duckdb.connect() as con:
    assert con.execute("SELECT count(*), count(tag), max(id) FROM 'ex/e10.parquet'").fetchone() == (2500, 1500, 2500)
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

### Exercise 11 · Publish atomically and recover from a crash

Write `publish(staging, final, crash=False)` (move the old folder to `_trash/`, then the new one in; if `crash` is true, raise `RuntimeError` between the two moves) and `recover(root)` (restore a trashed folder whose final is missing; delete leftovers in `_trash` and `_staging`).

```python
import os, shutil
from pathlib import Path

def publish(staging, final, crash=False):
    raise NotImplementedError("your code here")

def recover(root):
    raise NotImplementedError("your code here")

def stage(root, text):
    s = Path(root) / "_staging" / "dt=2026-03-02"
    s.mkdir(parents=True, exist_ok=True)
    (s / "data.txt").write_text(text)
    return s

root = Path("ex/e11"); shutil.rmtree(root, ignore_errors=True)
final = root / "dt=2026-03-02"
publish(stage(root, "v1"), final)
try:
    publish(stage(root, "v2"), final, crash=True)
except RuntimeError:
    pass
assert not final.exists()
recover(root)
assert (final / "data.txt").read_text() == "v1"
assert not any((root / "_staging").iterdir()) and not any((root / "_trash").iterdir())
publish(stage(root, "v2"), final)
assert (final / "data.txt").read_text() == "v2"
print("All tests passed")
```

Output:

```text
NotImplementedError: your code here
```

*Hint: [Appendix A](#hint-11) · Solution: [Appendix B](#solution-11)*

> **The main idea:** a total order, an explicit schema and atomic renames are what make reruns of a pipeline boring, which is the goal.

---

<a id="slide-49"></a>
## 49. Cheat sheet

*Reference · the deck on one page*

#### HTTP and httpx

| Need | Write |
|---|---|
| one client per job | `with httpx.Client(base_url=…, headers={"User-Agent": …}, timeout=…) as c:` |
| timeouts | `httpx.Timeout(10.0, read=60.0)`; never `None` |
| fail on 4xx/5xx | `c.get(…).raise_for_status()` |
| follow Link pages | `url = r.links.get("next", {}).get("url"); params = None` |
| cursor pages | send `next_cursor` back unchanged until it is null |
| stream a file | `with c.stream("GET", url) as r: for b in r.iter_raw(): …` |
| log requests | `event_hooks={"request": [fn]}`, redact `Authorization` |
| offline tests | `httpx.MockTransport(handler)`, `@respx.mock` |

#### Retries and limits

| Need | Write |
|---|---|
| what to retry | connect errors and 429 always; timeouts, 408/425/5xx only for idempotent methods |
| never retry | 400/401/403/404/409/422, your own bugs, POST without an idempotency key |
| backoff | `rng.uniform(0, min(cap, base * 2 ** attempt))` |
| Retry-After | digits → seconds; else `parsedate_to_datetime` − server `Date`; clamp ≥ 0; cap |
| budget | max attempts + max single wait + total time |
| rate limit | read `x-ratelimit-remaining/reset`; token bucket below the limit |
| checkpoint | write data, then checkpoint; both via temp + `os.replace` |
| testability | inject `sleep`, `now`, `rng`, `log` |

#### Files and Parquet

| Need | Write |
|---|---|
| verified download | `.part` → check size + MD5/ETag → `os.replace` → sidecar |
| stream gzip JSONL | `gzip.open(p, "rt", encoding="utf-8")`, one line at a time |
| validate | one pure function: line → (event, ts, reason) |
| deterministic gzip | `gzip.GzipFile(…, mtime=0)` |
| schema | `pa.schema([pa.field(name, type, nullable=…), …], metadata=…)` |
| rows → Arrow | `pa.Table.from_pylist(rows, schema=SCHEMA)` |
| batched Parquet | `pq.ParquetWriter(path, SCHEMA, compression="zstd")` + `write_table` per batch |
| read back | `pq.read_schema`, `with pq.ParquetFile(p) as f`, DuckDB `read_parquet(…, hive_partitioning=true)` |

#### Publication and audit

| Need | Write |
|---|---|
| identity | natural key + canonical SHA-256 (`sort_keys=True, separators=(",", ":")`) |
| total order | `(created_at, int(id))` |
| cap | first N keys; report `truncated` count and `cutoff` |
| partition | `dt=YYYY-MM-DD/`, by the load unit; avoid tiny files |
| publish | staging → move old to `_trash` → move new in → delete trash |
| recover | at start-up: restore trash if final missing; delete staging |
| manifest | params, sources, outputs (rows, bytes, sha256), counts; written last; no timestamps |
| audit | read = retained + filtered + quarantined + duplicates + truncated |
| secrets | env / Key Vault + managed identity; a wrapper whose `repr` is `***` |

> **The main idea:** bounded requests, classified retries, verified files, explicit schemas, deterministic identifiers, atomic publication, and counts that add up.

---

<a id="slide-50"></a>
## 50. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Ingestion / landing zone | Copying data from a system you don’t control into storage you do / where raw files are kept as received |
| HTTP request / response | Method, URL, headers, optional body / status code, headers, body |
| Method, safe, idempotent | GET, POST, …; safe = changes nothing; idempotent = repeating has the same effect as doing it once |
| Status code | 2xx success, 3xx redirect, 4xx client error, 5xx server error; 429 = too many requests |
| Header / query parameter | Name–value metadata on a request or response / `?key=value` pairs in the URL |
| Connection pool / keep-alive | Reusing open TCP connections across requests |
| User-Agent | A header identifying the client program |
| Event hook | A function httpx calls on every request or response |
| Connect / read / write / pool timeout | Limits on connecting, waiting for the next chunk, sending, and waiting for a free connection |
| Total deadline | Your own limit on the whole operation; httpx has none |
| Pagination: page/offset, cursor, keyset | Numbered pages / an opaque token for “where you stopped” / “rows after key K” (what cursors usually encode) |
| Link header, rel="next" | RFC 8288 header listing related URLs; follow next until absent |
| Transient / permanent failure | May succeed if retried / will fail again |
| Backoff, exponential, cap | Waiting between retries / doubling each time / the largest wait allowed |
| Jitter, full jitter | Randomness in the wait / a uniform wait between 0 and the ceiling |
| Thundering herd | Many clients retrying at the same instant |
| Retry-After, HTTP-date | Server-provided wait: seconds, or a GMT date such as `Mon, 02 Mar 2026 14:00:03 GMT` |
| Rate limit (primary, secondary) | A request quota per window / extra limits on bursts and concurrency |
| Token bucket | A limiter allowing bursts up to a capacity and an average rate |
| Idempotency key | A client-chosen id that lets a server deduplicate retried POSTs |
| Checkpoint | Saved progress that lets a restarted job continue |
| At-least-once / effectively-once | Work may repeat / repeats have no visible effect because writes are idempotent |
| Reconcile | Compare what you stored with the source |
| MockTransport / RESPX | httpx test transport that calls a function / a library that mocks httpx routes |
| GH Archive | Public GitHub events as hourly gzip JSONL files |
| Fixture | Fixed test data with known expected outcomes |
| Streaming download | Reading the response body in chunks straight to disk |
| ETag | An identifier of the exact content a server sent (GH Archive: the MD5) |
| Checksum (MD5, SHA-256) | A fingerprint of bytes used to detect corruption |
| Sidecar | A small metadata file stored next to a data file |
| Pure function | No I/O; the same input always gives the same output |
| Outcome | The single category each input line ends in |
| Quarantine / quarantine rate | Where malformed records go, with reasons / their share of lines read |
| Natural key | The source’s own unique identifier |
| Canonical JSON / content hash | One fixed serialisation (sorted keys) / its SHA-256 |
| Deterministic | Same input → same output, including names and bytes |
| Total order / tie-breaker | An ordering with no ties / the unique column that breaks them |
| Apache Arrow / PyArrow | A columnar in-memory format / its Python library |
| Schema, nullable | Field names and types / whether a field may be null |
| Table / RecordBatch | Columns following a schema / one chunk of rows |
| Row group / footer | A horizontal chunk of a Parquet file / the metadata at the end, written on close |
| Codec (zstd, snappy) | The compression algorithm |
| Partition, Hive-style, pruning | A subset in its own folder / `key=value` folder names / skipping folders a query doesn’t need |
| Small-files problem | Too many tiny files make scans slow |
| Staging, publication, swap | Hidden work area / making output visible / replacing it with renames |
| Idempotent publication | Publishing the same window again gives the same visible result |
| Manifest / commit marker | JSON describing a published unit / a file whose presence means “complete” |
| Audit counts | Every line read assigned to exactly one outcome; the sum must match |
| Cap, truncation, cutoff | Maximum retained events / events dropped by it / key of the last one kept |
| Run log | One line per run start and outcome |
| Exit code 137 | 128 + 9: the process was killed with signal 9 |
| Secret, Key Vault, managed identity | A credential / Azure’s secret store / an Azure identity with no stored password |
| dlt: source, resource, pipeline, destination | What to load / one endpoint or table / the runner / where it lands |
| Write disposition (append, replace, merge) | How dlt writes rows; merge upserts on a primary key |
| Schema evolution / contract | Adding columns as data changes / rules that freeze or limit that |
| Normalisation (dlt) | Flattening nested JSON into columns and child tables |

---

<a id="slide-51"></a>
## 51. What to remember, and what comes next

*Reference · recap*

1. **Bound every wait.** Connect/read timeouts on one shared Client, a cap on backoff and on Retry-After, a total budget.
2. **Classify before retrying.** Transient failures of idempotent requests only; full jitter; honour Retry-After; limit yourself with a token bucket.
3. **Page with cursors and checkpoint them.** Data first, checkpoint second, deterministic names: at-least-once becomes effectively-once.
4. **Land files verifiably.** Stream to .part, check size and checksum, rename atomically, record a sidecar.
5. **One pure classifier.** Every line gets one outcome; malformed lines go to quarantine with reasons and a rate limit.
6. **Type it explicitly.** A PyArrow schema, batched ParquetWriter, daily partitions, no tiny files.
7. **Make everything deterministic.** Natural keys, canonical hashes, total ordering, a documented cap with a reported cutoff.
8. **Publish atomically and prove it.** Stage and swap, manifest last, audit identity checked, reruns byte-identical, crashes recoverable.

#### Practise this week

- Rebuild `send_with_retries` from memory, then run the four tests from slide 19 against it.
- Do exercises 1, 6, 9 and 11 without hints.
- Point `gha_ingest.py` at the real GH Archive for one day with `GHA_BASE_URL` unset (public data; be polite: one run, not a loop; about 0.8 GB).
- Explain slide 40 out loud in two minutes: what readers see after each crash.

#### Where this leads

The same guarantees appear at larger scale: Spark and Fabric pipelines landing into Delta tables (where the commit replaces our rename), orchestration that retries tasks and passes watermarks, and CDC streams that checkpoint offsets. If you can explain checkpoints, idempotent writes and audit counts here, you can explain them there. Your portfolio ingester uses a different source (a fixed sample of recipe and nutrition files rather than GH Archive), but it needs the same guarantees: retries with backoff, validation with a quarantine, deterministic reruns and a manifest of what was kept and dropped.

> **The main idea:** reliable ingestion is a set of small, testable guarantees: bounded waits, classified retries, verified inputs, explicit types, deterministic outputs, atomic publication, and numbers that add up.

---

<a id="slide-52"></a>
## 52. References and how this deck was tested

*References · official documentation*

- HTTPX: [quickstart](https://www.python-httpx.org/quickstart/), [clients](https://www.python-httpx.org/advanced/clients/), [timeouts](https://www.python-httpx.org/advanced/timeouts/), [exceptions](https://www.python-httpx.org/exceptions/), [event hooks](https://www.python-httpx.org/advanced/event-hooks/), [transports and MockTransport](https://www.python-httpx.org/advanced/transports/); [RESPX](https://lundberg.github.io/respx/).
- HTTP: [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) ([§9.2 methods](https://www.rfc-editor.org/rfc/rfc9110#section-9.2), [§5.6.7 HTTP-date](https://www.rfc-editor.org/rfc/rfc9110#section-5.6.7), [§10.2.3 Retry-After](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3), [§15 status codes](https://www.rfc-editor.org/rfc/rfc9110#section-15)), [RFC 6585 (429)](https://www.rfc-editor.org/rfc/rfc6585#section-4), [RFC 8288 Web Linking](https://www.rfc-editor.org/rfc/rfc8288), [MDN: Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After), [MDN: 429](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429), [MDN: HTTP status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status), [IETF draft: Idempotency-Key header](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/).
- Retries: [AWS: Exponential backoff and jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/), [Azure: Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry), [Azure: transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults).
- GitHub and GH Archive: [GitHub REST: pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api), [GitHub REST: rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [GitHub REST: best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api), [GitHub event types](https://docs.github.com/en/rest/using-the-rest-api/github-event-types), [GH Archive](https://www.gharchive.org/).
- Arrow and Parquet: [PyArrow](https://arrow.apache.org/docs/python/), [pyarrow.schema](https://arrow.apache.org/docs/python/generated/pyarrow.schema.html), [PyArrow data types](https://arrow.apache.org/docs/python/api/datatypes.html), [PyArrow: reading and writing Parquet](https://arrow.apache.org/docs/python/parquet/parquet.html), [pyarrow.parquet.ParquetWriter](https://arrow.apache.org/docs/python/generated/pyarrow.parquet.ParquetWriter.html), [PyArrow datasets and partitioning](https://arrow.apache.org/docs/python/dataset.html), [Apache Parquet docs](https://parquet.apache.org/docs/), [DuckDB: Parquet](https://duckdb.org/docs/stable/data/parquet/overview), [DuckDB: Hive partitioning](https://duckdb.org/docs/stable/data/partitioning/hive_partitioning).
- dlt: [dlt docs](https://dlthub.com/docs/intro), [dlt REST API source](https://dlthub.com/docs/dlt-ecosystem/verified-sources/rest_api/basic), [dlt incremental loading](https://dlthub.com/docs/general-usage/incremental-loading), [dlt schema evolution](https://dlthub.com/docs/general-usage/schema-evolution), [dlt telemetry](https://dlthub.com/docs/reference/telemetry).
- Secrets: [Azure Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview), [Key Vault secrets with Python](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-python), [Managed identities](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview), [DefaultAzureCredential](https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.defaultazurecredential).
- Python: [gzip](https://docs.python.org/3/library/gzip.html), [hashlib](https://docs.python.org/3/library/hashlib.html), [os.replace](https://docs.python.org/3/library/os.html#os.replace), [os.rename](https://docs.python.org/3/library/os.html#os.rename), [email.utils.parsedate_to_datetime](https://docs.python.org/3/library/email.utils.html#email.utils.parsedate_to_datetime), [http.server](https://docs.python.org/3/library/http.server.html), [random](https://docs.python.org/3/library/random.html), [json](https://docs.python.org/3/library/json.html), [heapq](https://docs.python.org/3/library/heapq.html).

**Testing:** built with CPython 3.12.10, httpx 0.28.1, RESPX 0.23.1, PyArrow 25.0.1, DuckDB 1.5.6 and pytest 9.1.1 in one virtual environment, and dlt 1.30.0 (DuckDB extra) in a second, on Windows 11. All HTTP traffic went to `fakeapi.py` on 127.0.0.1; dlt telemetry was disabled. In-process examples ran inside the build; examples shown with `$ python …` ran as separate processes in a scratch folder. The GH Archive fixture was generated by `make_fixture.py` with a fixed seed. One real GH Archive hour (2026-03-02-15, 32,740,101 bytes, ETag = MD5) was downloaded once before the build and cached; the build reads only the cache. Every exercise solution ran with its tests, and every starter ran and failed with `NotImplementedError` as shown. Timings are labelled as measurements from the build machine.

**Additions beyond the brief** (marked (added)): testing HTTP code offline with `httpx.MockTransport` and RESPX; the `Idempotency-Key` pattern for retrying POSTs; a ceiling on how long a `Retry-After` may make you wait; `iter_raw` versus automatic decompression, and ETag/MD5 checks on downloads; byte-for-byte deterministic gzip (`mtime=0`); duplicates as their own audit category; a quarantine-rate threshold that fails the run; restoring the last good partition after an interrupted swap; a check of the real GH Archive schema on one downloaded hour; interview talking points.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Classify retryable failures

Check the “never reached the server” errors first (`ConnectError`, `ConnectTimeout`, `PoolTimeout`), then 429, then return `False` for non-idempotent methods. Only then look at the remaining error names and status codes. Make sure the function returns real booleans, because the test uses `is`.

<a id="hint-2"></a>
### Hint 2 · A capped, seeded full-jitter schedule

Create one `random.Random(seed)` before the loop (not one per attempt), and call `rng.uniform(0, min(cap, base * 2 ** i))` for each `i`.

<a id="hint-3"></a>
### Hint 3 · Read Retry-After from real headers

`headers.get("Retry-After")` is already case-insensitive on `httpx.Headers`. Digits → `float`. Otherwise try `email.utils.parsedate_to_datetime` inside `try/except (TypeError, ValueError)`, subtract `now`, and clamp with `max(0.0, …)`.

<a id="hint-4"></a>
### Hint 4 · Follow Link headers against a mock server

Loop while `url` is set: `r = client.get(url, params=params)`, `r.raise_for_status()`, extend the result with `r.json()`, then `url = r.links.get("next", {}).get("url")` and `params = None`.

<a id="hint-5"></a>
### Hint 5 · Token bucket start times with a fake clock

Keep `t` (current time) and `tokens`. For each request: if `tokens < 1`, advance `t` by `(1 - tokens) / rate` and set `tokens = 1`; record `t`; subtract one token. Round to avoid floating-point noise. Refill happens implicitly because you only advance time when you need a token.

<a id="hint-6"></a>
### Hint 6 · A cursor extractor that survives a crash

State: `{"cursor": None, "pages": 0, "done": False}`, loaded from the checkpoint if it exists. Loop: GET `/events` with the cursor, write the page with `tmp` + `os.replace`, then write the new state the same way. Stop when `next_cursor` is `None`. Let the `ConnectError` propagate: retrying is the caller’s job here.

<a id="hint-7"></a>
### Hint 7 · Verify a downloaded file

Compute size and MD5 together with a `while block := f.read(1 << 20)` loop. Compare the size only if `Content-Length` is present. Strip quotes from the ETag and check it with `re.fullmatch(r"[0-9a-f]{32}", etag)` before comparing.

<a id="hint-8"></a>
### Hint 8 · Validate GH Archive lines

Return early at each check, in the order of the reasons. `json.JSONDecodeError` for bad JSON; `isinstance(e, dict)`; `isinstance(e.get("id"), str) and e["id"].isdigit()`; for `created_at`, catch `KeyError`, `TypeError` and `ValueError` around `strptime`.

<a id="hint-9"></a>
### Hint 9 · A deterministic cap with ties and duplicates

Deduplicate with a `seen` set while building `[(e["created_at"], int(e["id"]), e["id"]) …]`. ISO-8601 UTC strings with the same format sort correctly as text. Sort, slice `[:cap]`, and compute `truncated = len(keys) - len(kept)`.

<a id="hint-10"></a>
### Hint 10 · Explicit schema, batched writes, three row groups

Open `pq.ParquetWriter(path, SCHEMA)` in a `with` block. For each start index, build a list of dicts and call `writer.write_table(pa.Table.from_pylist(rows, schema=SCHEMA))`. The first batch is all-null in `tag`; that is exactly why the schema must be explicit.

<a id="hint-11"></a>
### Hint 11 · Publish atomically and recover from a crash

`trash = final.parent / "_trash" / final.name`. In `publish`: remove an old trash, `os.rename(final, trash)` if final exists, maybe raise, `os.rename(staging, final)`, delete the trash. In `recover`: for each folder in `_trash`, rename it back if its final is missing, else delete it; then delete everything in `_staging`. Create both folders with `mkdir(parents=True, exist_ok=True)`.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Classify retryable failures

```python
IDEMPOTENT = {"GET", "HEAD", "OPTIONS", "PUT", "DELETE"}
NOT_SENT = {"ConnectError", "ConnectTimeout", "PoolTimeout"}
TRANSIENT_ERRORS = {"ReadTimeout", "WriteTimeout", "ReadError", "WriteError", "RemoteProtocolError"}
TRANSIENT_STATUS = {408, 425, 500, 502, 503, 504}

def should_retry(method, status=None, error=None):
    if error in NOT_SENT or status == 429:
        return True
    if method.upper() not in IDEMPOTENT:
        return False
    if error is not None:
        return error in TRANSIENT_ERRORS
    return status in TRANSIENT_STATUS

cases = {("GET", 503, None): True, ("GET", 404, None): False, ("POST", 503, None): False,
         ("POST", 429, None): True, ("DELETE", 502, None): True, ("GET", None, "ReadTimeout"): True,
         ("POST", None, "ReadTimeout"): False, ("POST", None, "ConnectError"): True,
         ("PATCH", None, "ConnectTimeout"): True, ("GET", None, "KeyError"): False, ("GET", 401, None): False}
for args, expected in cases.items():
    assert should_retry(*args) is expected, args
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** The order of the checks encodes the reasoning: if the request never left, or the rate limiter rejected it before processing, repeating it can’t duplicate work. Otherwise the method’s idempotency decides, and only then the kind of failure. Unknown errors, such as `KeyError`, are bugs and are never retried.

<a id="solution-2"></a>
### Solution 2 · A capped, seeded full-jitter schedule

```python
import random

def retry_schedule(n, base=0.5, cap=30.0, seed=None):
    rng = random.Random(seed)
    return [rng.uniform(0, min(cap, base * 2 ** i)) for i in range(n)]

s1, s2 = retry_schedule(8, seed=11), retry_schedule(8, seed=11)
assert s1 == s2 and len(s1) == 8
assert all(0 <= d <= min(30.0, 0.5 * 2 ** i) for i, d in enumerate(s1))
assert retry_schedule(8, seed=12) != s1
assert max(retry_schedule(50, base=1, cap=2, seed=1)) <= 2
print([round(d, 2) for d in s1])
print("All tests passed")
```

Output:

```text
[0.23, 0.56, 1.85, 1.86, 4.06, 9.4, 5.54, 15.36]
All tests passed
```

**Why it works.** A private `Random` instance gives reproducible sequences without touching the global generator other code may use. The ceiling grows exponentially until the cap; jitter picks anywhere below it. Seeding is for tests and demos; production code passes an unseeded generator.

<a id="solution-3"></a>
### Solution 3 · Read Retry-After from real headers

```python
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import httpx

def wait_seconds(headers, now, default=1.0):
    value = headers.get("Retry-After")
    if value is None:
        return default
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, (when - now).total_seconds())

now = datetime(2026, 3, 2, 14, 0, 0, tzinfo=timezone.utc)
assert wait_seconds(httpx.Headers({"retry-after": "120"}), now) == 120.0
assert wait_seconds(httpx.Headers({"Retry-After": "Mon, 02 Mar 2026 14:01:30 GMT"}), now) == 90.0
assert wait_seconds(httpx.Headers({"Retry-After": "Mon, 02 Mar 2026 13:00:00 GMT"}), now) == 0.0
assert wait_seconds(httpx.Headers({"Retry-After": "later"}), now, default=5) == 5
assert wait_seconds(httpx.Headers({}), now, default=2.5) == 2.5
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** HTTP-dates are always GMT, so `parsedate_to_datetime` returns an aware datetime that subtracts cleanly from an aware `now`. Past dates clamp to zero instead of producing a negative sleep (which `time.sleep` rejects). Bad values fall back to your own backoff rather than crashing the job.

<a id="solution-4"></a>
### Solution 4 · Follow Link headers against a mock server

```python
import httpx
from urllib.parse import parse_qs

ITEMS = list(range(1, 26))
seen_urls = []

def handler(request):
    seen_urls.append(str(request.url))
    q = parse_qs(request.url.query.decode())
    assert all(len(v) == 1 for v in q.values()), "a parameter was sent twice"
    page, size = int(q.get("page", ["1"])[0]), int(q["per_page"][0])
    chunk = ITEMS[(page - 1) * size: page * size]
    headers = {}
    if page * size < len(ITEMS):
        headers["Link"] = f'<https://api.test/items?page={page + 1}&per_page={size}>; rel="next"'
    return httpx.Response(200, json=chunk, headers=headers)

def fetch_all(client, url, per_page):
    out, params = [], {"per_page": per_page}
    while url:
        r = client.get(url, params=params)
        r.raise_for_status()
        out.extend(r.json())
        url, params = r.links.get("next", {}).get("url"), None
    return out

with httpx.Client(transport=httpx.MockTransport(handler)) as client:
    items = fetch_all(client, "https://api.test/items", per_page=10)
assert items == ITEMS and len(seen_urls) == 3
print(seen_urls[-1])
print("All tests passed")
```

Output:

```text
https://api.test/items?page=3&per_page=10
All tests passed
```

**Why it works.** The server owns the URL format; the client only follows it. Passing `params` again on page 2 would make httpx merge `per_page=10` into a URL that already has it, which the handler’s assertion catches. `MockTransport` lets you test this without any network.

<a id="solution-5"></a>
### Solution 5 · Token bucket start times with a fake clock

```python
def start_times(n, rate, capacity):
    t, tokens, out = 0.0, float(capacity), []
    for _ in range(n):
        if tokens < 1:
            t += (1 - tokens) / rate
            tokens = 1.0
        out.append(round(t, 9))
        tokens -= 1
    return out

assert start_times(5, rate=1, capacity=2) == [0, 0, 1, 2, 3]
assert start_times(4, rate=10, capacity=1) == [0, 0.1, 0.2, 0.3]
assert start_times(3, rate=0.5, capacity=3) == [0, 0, 0]
assert start_times(6, rate=2, capacity=3)[-1] == 1.5
print(start_times(6, rate=2, capacity=3))
print("All tests passed")
```

Output:

```text
[0.0, 0.0, 0.0, 0.5, 1.0, 1.5]
All tests passed
```

**Why it works.** A full bucket allows a burst of `capacity` requests at once; after that, each request waits exactly one token’s refill time, `1/rate`. Because requests are back-to-back, the bucket never refills above one token between them, so the simulation needs no clock object at all.

<a id="solution-6"></a>
### Solution 6 · A cursor extractor that survives a crash

```python
import json, os, shutil
from pathlib import Path
import httpx

calls = []
def handler(request):
    calls.append(request.url.params.get("cursor"))
    if len(calls) == 3:
        raise httpx.ConnectError("network blip")
    after = int(request.url.params.get("cursor") or 0)
    rows = [{"id": i} for i in range(after + 1, min(after + 10, 45) + 1)]
    return httpx.Response(200, json={"data": rows, "next_cursor": str(rows[-1]["id"]) if rows[-1]["id"] < 45 else None})

def write_atomic(path, text):
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)

def extract(client, folder):
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
    ckpt = folder / "_checkpoint.json"
    state = json.loads(ckpt.read_text()) if ckpt.exists() else {"cursor": None, "pages": 0, "done": False}
    while not state["done"]:
        params = {"cursor": state["cursor"]} if state["cursor"] else {}
        body = client.get("/events", params=params).raise_for_status().json()
        page = state["pages"] + 1
        write_atomic(folder / f"page-{page:05d}.jsonl", "".join(json.dumps(r) + "\n" for r in body["data"]))
        state = {"cursor": body["next_cursor"], "pages": page, "done": body["next_cursor"] is None}
        write_atomic(ckpt, json.dumps(state))
    return state

folder = Path("ex/e6"); shutil.rmtree(folder, ignore_errors=True)
with httpx.Client(transport=httpx.MockTransport(handler), base_url="https://api.test") as client:
    try:
        extract(client, folder)
        raise AssertionError("expected a ConnectError on the first run")
    except httpx.ConnectError:
        pass
    print("after the crash:", json.loads((folder / "_checkpoint.json").read_text()))
    print("resumed:", extract(client, folder))
ids = [json.loads(l)["id"] for p in sorted(folder.glob("page-*.jsonl")) for l in p.open()]
assert sorted(ids) == list(range(1, 46)) and len(list(folder.glob("page-*.jsonl"))) == 5
assert calls == [None, "10", "20", "20", "30", "40"]
print("All tests passed")
```

Output:

```text
after the crash: {'cursor': '20', 'pages': 2, 'done': False}
resumed: {'cursor': None, 'pages': 5, 'done': True}
All tests passed
```

**Why it works.** The checkpoint after page 2 holds cursor `"20"`, so the second run starts exactly where the first failed: the call log shows `"20"` twice and nothing earlier repeated. Page files are named by page number, so even a crash between the two writes would only overwrite the same file.

<a id="solution-7"></a>
### Solution 7 · Verify a downloaded file

```python
import gzip, hashlib, re
from pathlib import Path

def verify(path, headers):
    md5, size = hashlib.md5(), 0
    with open(path, "rb") as f:
        while block := f.read(1 << 20):
            md5.update(block)
            size += len(block)
    expected = headers.get("Content-Length")
    if expected is not None and int(expected) != size:
        return "size"
    etag = headers.get("ETag", "").strip('"')
    if re.fullmatch(r"[0-9a-f]{32}", etag) and etag != md5.hexdigest():
        return "md5"
    return None

Path("ex").mkdir(exist_ok=True)
data = gzip.compress(b'{"id": "1"}\n' * 1000, mtime=0)
Path("ex/ok.json.gz").write_bytes(data)
Path("ex/cut.json.gz").write_bytes(data[: len(data) // 2])
good = {"Content-Length": str(len(data)), "ETag": '"' + hashlib.md5(data).hexdigest() + '"'}
assert verify("ex/ok.json.gz", good) is None
assert verify("ex/cut.json.gz", good) == "size"
assert verify("ex/ok.json.gz", {**good, "ETag": '"' + "0" * 32 + '"'}) == "md5"
assert verify("ex/ok.json.gz", {**good, "ETag": 'W/"abc-123"'}) is None
assert verify("ex/ok.json.gz", {}) is None
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** A truncated download is caught by size even when no checksum exists; a same-size corruption is caught by the MD5. Weak ETags (`W/"…"`) and multipart-upload ETags are not content hashes, so the function doesn’t pretend to check them. In `download_verified` the same checks run while streaming, so the file is read only once.

<a id="solution-8"></a>
### Solution 8 · Validate GH Archive lines

```python
import json
from datetime import datetime, timezone

def validate(line):
    try:
        e = json.loads(line)
    except json.JSONDecodeError:
        return None, "invalid_json"
    if not isinstance(e, dict):
        return None, "not_an_object"
    if not (isinstance(e.get("id"), str) and e["id"].isdigit()):
        return None, "bad_id"
    repo = e.get("repo")
    if not (isinstance(repo, dict) and isinstance(repo.get("id"), int) and isinstance(repo.get("name"), str)):
        return None, "bad_repo"
    try:
        e["_ts"] = datetime.strptime(e["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (KeyError, TypeError, ValueError):
        return None, "bad_created_at"
    return e, None

base = {"id": "123", "type": "PushEvent", "repo": {"id": 1, "name": "apache/iceberg"}, "created_at": "2026-03-02T10:00:00Z"}
cases = {
    json.dumps(base): None,
    json.dumps(base)[:30]: "invalid_json",
    "[1, 2]": "not_an_object",
    json.dumps(base | {"id": 123}): "bad_id",
    json.dumps(base | {"id": "12a"}): "bad_id",
    json.dumps(base | {"repo": {}}): "bad_repo",
    json.dumps(base | {"created_at": "2026-03-02 10:00:00"}): "bad_created_at",
    json.dumps({k: v for k, v in base.items() if k != "created_at"}): "bad_created_at",
}
for line, expected in cases.items():
    event, reason = validate(line)
    assert reason == expected, (line, reason)
    assert (event is None) == (expected is not None)
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** Each check guards the next: once `e` is known to be a dict, `e.get` is safe; once `repo` is a dict, `repo.get` is safe. `isinstance` distinguishes `123` from `"123"`, which a truthiness check would not. One reason per line keeps quarantine counts meaningful. (Adding `_ts` to the event is fine here; the project returns it separately so that the content hash covers only source fields.)

<a id="solution-9"></a>
### Solution 9 · A deterministic cap with ties and duplicates

```python
import random

def apply_cap(events, cap):
    seen, keys = set(), []
    for e in events:
        if e["id"] in seen:
            continue
        seen.add(e["id"])
        keys.append((e["created_at"], int(e["id"]), e["id"]))
    keys.sort()
    kept = keys[:cap]
    truncated = len(keys) - len(kept)
    cutoff = (kept[-1][0], kept[-1][1]) if truncated else None
    return [k[2] for k in kept], truncated, cutoff

T = "2026-03-02T10:00:00Z"
events = [{"id": "10", "created_at": T}, {"id": "9", "created_at": T}, {"id": "100", "created_at": "2026-03-02T09:59:59Z"},
          {"id": "9", "created_at": T}, {"id": "11", "created_at": "2026-03-02T10:00:01Z"}, {"id": "2", "created_at": T}]
kept, truncated, cutoff = apply_cap(events, cap=3)
assert kept == ["100", "2", "9"] and truncated == 2 and cutoff == (T, 9)
shuffled = events[:]
random.Random(4).shuffle(shuffled)
assert apply_cap(shuffled, cap=3) == (kept, truncated, cutoff)
assert apply_cap(events, cap=10) == (["100", "2", "9", "10", "11"], 0, None)
print(kept, truncated, cutoff)
print("All tests passed")
```

Output:

```text
['100', '2', '9'] 2 ('2026-03-02T10:00:00Z', 9)
All tests passed
```

**Why it works.** `(created_at, int(id))` is a total order because ids are unique after deduplication, so ties at 10:00:00 are broken numerically (2 < 9 < 10), not as text (“10” < “2”). A total order makes the result independent of input order. Here duplicates are identical, so “keep the first” can’t change the outcome either; if duplicates could differ, you would need a rule for which version wins.

<a id="solution-10"></a>
### Solution 10 · Explicit schema, batched writes, three row groups

```python
from datetime import datetime, timedelta, timezone
import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

SCHEMA = pa.schema([pa.field("id", pa.int64(), nullable=False),
                    pa.field("ts", pa.timestamp("us", tz="UTC"), nullable=False),
                    pa.field("tag", pa.string())])

def write_batches(path, n=2500, batch=1000):
    t0 = datetime(2026, 3, 2, tzinfo=timezone.utc)
    with pq.ParquetWriter(path, SCHEMA, compression="zstd") as writer:
        for start in range(1, n + 1, batch):
            rows = [{"id": i, "ts": t0 + timedelta(seconds=i), "tag": None if i <= 1000 else f"t{i % 3}"}
                    for i in range(start, min(start + batch, n + 1))]
            writer.write_table(pa.Table.from_pylist(rows, schema=SCHEMA))

write_batches("ex/e10.parquet")
with pq.ParquetFile("ex/e10.parquet") as f:
    groups = [f.metadata.row_group(i).num_rows for i in range(f.metadata.num_row_groups)]
    assert groups == [1000, 1000, 500] and f.schema_arrow.field("tag").type == pa.string()
with duckdb.connect() as con:
    assert con.execute("SELECT count(*), count(tag), max(id) FROM 'ex/e10.parquet'").fetchone() == (2500, 1500, 2500)
print(groups)
print("All tests passed")
```

Output:

```text
[1000, 1000, 500]
All tests passed
```

**Why it works.** Each `write_table` call adds a row group (up to the default maximum size), so three batches give three row groups. With the schema fixed, the all-null first batch is written as a nullable string column rather than Arrow’s `null` type, and later batches match it. The `with` blocks close the writer (footer) and the reader (no open handles).

<a id="solution-11"></a>
### Solution 11 · Publish atomically and recover from a crash

```python
import os, shutil
from pathlib import Path

def publish(staging, final, crash=False):
    staging, final = Path(staging), Path(final)
    trash = final.parent / "_trash" / final.name
    trash.parent.mkdir(parents=True, exist_ok=True)
    shutil.rmtree(trash, ignore_errors=True)
    if final.exists():
        os.rename(final, trash)
    if crash:
        raise RuntimeError("crashed between the two renames")
    os.rename(staging, final)
    shutil.rmtree(trash, ignore_errors=True)

def recover(root):
    root = Path(root)
    for sub in ("_trash", "_staging"):
        (root / sub).mkdir(parents=True, exist_ok=True)
    for trash in sorted((root / "_trash").iterdir()):
        final = root / trash.name
        if final.exists():
            shutil.rmtree(trash)
        else:
            os.rename(trash, final)
    for stage_dir in sorted((root / "_staging").iterdir()):
        shutil.rmtree(stage_dir)

def stage(root, text):
    s = Path(root) / "_staging" / "dt=2026-03-02"
    s.mkdir(parents=True, exist_ok=True)
    (s / "data.txt").write_text(text)
    return s

root = Path("ex/e11"); shutil.rmtree(root, ignore_errors=True)
final = root / "dt=2026-03-02"
publish(stage(root, "v1"), final)
try:
    publish(stage(root, "v2"), final, crash=True)
except RuntimeError:
    pass
assert not final.exists()
recover(root)
assert (final / "data.txt").read_text() == "v1"
assert not any((root / "_staging").iterdir()) and not any((root / "_trash").iterdir())
publish(stage(root, "v2"), final)
assert (final / "data.txt").read_text() == "v2"
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** Each step is a single rename, which is atomic on one file system, so after any crash the state is one of a few known shapes, and `recover` maps each back to “last good published, nothing half-done”. The abandoned v2 staging is deleted rather than published, because nothing proved it complete (no audit, no manifest).
