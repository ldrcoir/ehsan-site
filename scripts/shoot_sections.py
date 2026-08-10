"""Render the personal-site to multiple section screenshots for verification."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SITE = Path("/home/z/my-project/download/personal-site/index.html").resolve()
OUT_DIR = Path("/home/z/my-project/download/preview")
OUT_DIR.mkdir(parents=True, exist_ok=True)
URL = f"file://{SITE}"

SECTIONS = [
    ("hero", "#hero"),
    ("about", "#about"),
    ("skills", "#skills"),
    ("projects", "#projects"),
    ("contact", "#contact"),
]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(
            viewport={"width": 1440, "height": 900}, device_scale_factor=2
        )
        page = await ctx.new_page()
        await page.goto(URL, wait_until="networkidle")
        await page.wait_for_timeout(800)

        for name, sel in SECTIONS:
            el = await page.query_selector(sel)
            if el:
                # Scroll into view first so IntersectionObserver fires and
                # reveal animations complete.
                await el.scroll_into_view_if_needed()
                await page.wait_for_timeout(900)
                out = OUT_DIR / f"section-{name}.png"
                await el.screenshot(path=str(out))
                box = await el.bounding_box()
                print(f"  {name}: {out}  ({box['width']:.0f}x{box['height']:.0f})")
            else:
                print(f"  {name}: NOT FOUND")

        # Hero viewport only (above the fold)
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(OUT_DIR / "hero-viewport.png"), full_page=False)
        print(f"  hero-viewport saved")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
