"""Render the personal-site index.html to PNG screenshots."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SITE = Path("/home/z/my-project/download/personal-site/index.html").resolve()
OUT_DIR = Path("/home/z/my-project/download/preview")
OUT_DIR.mkdir(parents=True, exist_ok=True)

URL = f"file://{SITE}"


async def shoot(viewport, name, full=True):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport=viewport, device_scale_factor=2)
        page = await ctx.new_page()
        await page.goto(URL, wait_until="networkidle")
        await page.wait_for_timeout(800)

        if full:
            # Scroll through the whole page so IntersectionObserver fires for
            # every section and the reveal animation completes.
            prev_y = -1
            for _ in range(40):
                y = await page.evaluate("() => window.scrollY")
                if y == prev_y:
                    break
                prev_y = y
                await page.evaluate("() => window.scrollBy(0, window.innerHeight * 0.8)")
                await page.wait_for_timeout(150)
            await page.evaluate("() => window.scrollTo(0, 0)")
            await page.wait_for_timeout(600)

        out = OUT_DIR / name
        await page.screenshot(path=str(out), full_page=full)
        await browser.close()
        print(f"  saved: {out}")


async def main():
    print("Shooting desktop (1440x900)...")
    await shoot({"width": 1440, "height": 900}, "desktop-full.png", full=True)
    print("Shooting mobile (390x844)...")
    await shoot({"width": 390, "height": 844}, "mobile-full.png", full=True)


if __name__ == "__main__":
    asyncio.run(main())
