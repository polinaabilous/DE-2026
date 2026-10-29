# import sys, duckdb
# from zoneinfo import ZoneInfo
# print(sys.version.split()[0], duckdb.__version__)
# print(ZoneInfo("America/Chicago"))   # fails on Windows without tzdata

# ------ pathlib: paths as objects

from pathlib import Path

raw = Path("data") / "raw"                      # join with /
p = raw / "events_2026-03-03.jsonl.gz"
print(p.as_posix(), "| name:", p.name, "| stem:", p.stem, "| suffixes:", p.suffixes)
print("parent:", p.parent.as_posix(), "| exists:", p.exists(), "| is_file:", p.is_file())
print("size:", p.stat().st_size, "bytes")
print(p.with_suffix("").with_suffix(".parquet").name)   # swap extensions

files = sorted(raw.glob("events_*.jsonl*"))              # pattern match, sorted for determinism
print([f.name for f in files])
print(sorted(f.name for f in Path("data").rglob("*.csv")))   # recursive

out = Path("data/out/reports")
out.mkdir(parents=True, exist_ok=True)                    # like mkdir -p
(out / "hello.txt").write_text("hi\n", encoding="utf-8")
print((out / "hello.txt").read_text(encoding="utf-8").strip(), "| absolute?", out.is_absolute())
print(repr(Path("data/raw")))                             # the real type on this machine

# ----- Encodings: bytes are not text

import locale
from pathlib import Path

text = "Café ☕"
data = text.encode("utf-8")
print(data, len(text), "characters ->", len(data), "bytes")
print(data.decode("cp1252"))                       # mojibake: wrong encoding, no error!

raw = Path("data/raw/legacy_cp1252.csv").read_bytes()
print(raw)
try:
    raw.decode("utf-8")
except UnicodeDecodeError as e:
    print("UnicodeDecodeError:", e.reason, "at byte", e.start)
print(raw.decode("cp1252").splitlines()[1])        # the right encoding
print(raw.decode("utf-8", errors="replace").splitlines()[1])   # keep going, mark bad bytes with U+FFFD

bom = Path("data/raw/orders_export.csv").read_bytes()[:3]
print("BOM bytes:", bom)
print(repr(Path("data/raw/orders_export.csv").read_text(encoding="utf-8")[:9]))
print(repr(Path("data/raw/orders_export.csv").read_text(encoding="utf-8-sig")[:9]))
print("default encoding for open() here:", locale.getpreferredencoding(False))