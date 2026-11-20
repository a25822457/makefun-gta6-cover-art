"""Take the 4 Neon Coast screenshots with Playwright (headless Chromium).

Reads shots.json for the shot list, opens each URL, waits for
window.__shotReady, records every console error and page error, and saves
a JPEG into screenshots/. Exits non-zero if any console/page error appeared
or a screenshot is outside the gate limits (<=256 KiB, long side <=1280,
short side >=480).
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = json.loads((ROOT / "shots.json").read_text())
OUT = ROOT / "screenshots"
OUT.mkdir(exist_ok=True)

BASE = "http://localhost:8080"


def jpeg_size(path: Path) -> tuple[int, int]:
    """Width/height of a JPEG from its SOF marker (stdlib only)."""
    data = path.read_bytes()
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h = (data[i + 5] << 8) | data[i + 6]
            w = (data[i + 7] << 8) | data[i + 8]
            return w, h
        seg_len = (data[i + 2] << 8) | data[i + 3]
        i += 2 + seg_len
    raise ValueError(f"no SOF marker in {path}")


def main() -> int:
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=str(Path.home() / ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome"),
            args=["--no-sandbox"],
        )
        for shot in SHOTS["shots"]:
            page = browser.new_page(viewport=shot["viewport"])
            page_errors = []
            console_errors = []
            page.on("pageerror", lambda e: page_errors.append(str(e)))
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.goto(BASE + shot["url"].split("http://localhost:8080", 1)[-1], wait_until="load")
            try:
                page.wait_for_function("window.__shotReady === true", timeout=30000)
            except Exception as exc:  # noqa: BLE001 - report and continue
                print(f"{shot['file']}: __shotReady never fired: {exc}")
                errors.append(shot["file"])
                page.close()
                continue
            page.wait_for_timeout(400)
            path = OUT / shot["file"]
            page.screenshot(path=str(path), type="jpeg", quality=88)
            print(f"{shot['file']}: {path.stat().st_size} bytes, "
                  f"console_errors={len(console_errors)}, page_errors={len(page_errors)}")
            for e in console_errors:
                print(f"  console error: {e}")
            for e in page_errors:
                print(f"  page error: {e}")
            if console_errors or page_errors:
                errors.append(shot["file"])
            page.close()
        browser.close()
    # Gate limits on the written files (JPEG size parsed with stdlib).
    for shot in SHOTS["shots"]:
        path = OUT / shot["file"]
        size = path.stat().st_size
        w, h = jpeg_size(path)
        long_side, short_side = max(w, h), min(w, h)
        ok = size <= 262144 and long_side <= 1280 and short_side >= 480
        print(f"{shot['file']}: {w}x{h}, {size} bytes -> {'OK' if ok else 'FAIL'}")
        if not ok:
            errors.append(shot["file"])
    if errors:
        print("FAILED:", errors)
        return 1
    print("All 4 screenshots OK, 0 console errors, 0 page errors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
