"""Fetch only headlines and article URLs from the two official category feeds."""
import argparse
import html
import json
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "ShiftDelete": ("https://shiftdelete.net/mobil/feed", "shiftdelete.net"),
    "DonanımHaber": ("https://www.donanimhaber.com/rss/etiket/131", "www.donanimhaber.com"),
}


def parse_feed(raw, source):
    host = SOURCES[source][1]
    items = {}
    for entry in ET.fromstring(raw).findall("./channel/item"):
        title = " ".join(html.unescape(entry.findtext("title", "")).split())
        link = entry.findtext("link", "").strip()
        url = urlsplit(link)
        if not title or url.scheme != "https" or url.hostname != host or url.username or url.password:
            continue
        if url.path.rstrip("/") in ("", "/mobil", "/cep-telefonlari"):
            continue
        try:
            date = parsedate_to_datetime(entry.findtext("pubDate", ""))
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            published = date.astimezone(timezone.utc).isoformat()
        except (ValueError, TypeError, OverflowError):
            continue
        items[link] = {"source": source, "title": title, "link": link, "publishedAt": published}
    if not items:
        raise ValueError(f"No valid articles in {source} feed")
    return sorted(items.values(), key=lambda item: item["publishedAt"], reverse=True)[:10]


def fetch(url):
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "GurTechNews/1.0 (+https://gureataman-lab.github.io/gurt-techgsm/)", "Accept": "application/rss+xml, application/xml, text/xml"})
            with urlopen(request, timeout=30) as response:
                raw = response.read(5_000_001)
            if len(raw) > 5_000_000:
                raise ValueError("Feed is too large")
            return raw
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))


def update(output, fixture_dir=None):
    previous = json.loads(output.read_text(encoding="utf-8")) if output.exists() else {"items": [], "sources": {}}
    items, states = [], {}
    now = datetime.now(timezone.utc).isoformat()
    success = 0
    for source, (url, _) in SOURCES.items():
        try:
            fixture = "shift.xml" if source == "ShiftDelete" else "dh.xml"
            raw = (fixture_dir / fixture).read_bytes() if fixture_dir else fetch(url)
            items.extend(parse_feed(raw, source))
            states[source] = {"checkedAt": now, "ok": True}
            success += 1
        except Exception as error:
            print(f"::warning::{source}: {error}", file=sys.stderr)
            items.extend(item for item in previous["items"] if item.get("source") == source)
            states[source] = {**previous.get("sources", {}).get(source, {}), "ok": False}
    if not success:
        raise RuntimeError("Both sources failed; previous news file left unchanged")
    # Preserve source order for ties, newest articles first.
    items.sort(key=lambda item: item["publishedAt"], reverse=True)
    result = {"updatedAt": now, "sources": states, "items": items}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output)
    print(f"Saved {len(items)} headlines from {success} available source(s)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture-dir", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "news.json")
    args = parser.parse_args()
    update(args.output, args.fixture_dir)
