"""Export test: open the editor, click the 1080x1350 export button, and
verify a real PNG download arrives with the exact expected dimensions.
Also clicks 'Export all three sizes' and checks three downloads arrive.
PNG size is parsed from the IHDR chunk with stdlib only.
"""
import struct
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

CHROME = str(Path.home() / ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome")
BASE = "http://localhost:8080/"


def png_size(data: bytes) -> tuple[int, int]:
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    w, h = struct.unpack(">II", data[16:24])
    return w, h


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(BASE, wait_until="load")
        page.wait_for_function("window.__coverApp !== undefined", timeout=30000)
        page.wait_for_timeout(1000)

        # Single export: 1080 x 1350.
        with page.expect_download(timeout=30000) as dl:
            page.click("#exportPortraitBtn")
        download = dl.value
        path = Path("/tmp/nc-export-test-portrait.png")
        download.save_as(path)
        data = path.read_bytes()
        w, h = png_size(data)
        print(f"portrait export: {download.suggested_filename}, {len(data)} bytes, {w}x{h}")
        assert (w, h) == (1080, 1350), f"expected 1080x1350, got {w}x{h}"

        # Export all three.
        downloads = []
        page.on("download", lambda d: downloads.append(d))
        page.click("#exportAllBtn")
        page.wait_for_timeout(8000)
        print(f"export-all produced {len(downloads)} downloads")
        assert len(downloads) == 3, f"expected 3 downloads, got {len(downloads)}"
        for i, d in enumerate(downloads):
            pth = Path(f"/tmp/nc-export-test-all-{i}.png")
            d.save_as(pth)
            w, h = png_size(pth.read_bytes())
            print(f"  {d.suggested_filename}: {w}x{h}")
        sizes = {png_size(Path(f"/tmp/nc-export-test-all-{i}.png").read_bytes()) for i in range(3)}
        assert sizes == {(1080, 1080), (1080, 1350), (1920, 1080)}, f"unexpected sizes {sizes}"

        print(f"console/page errors: {len(errors)}")
        for e in errors:
            print("  error:", e)
        assert not errors, "errors during export test"
        browser.close()
    print("EXPORT TEST PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
