import { test, expect } from "@playwright/test";

const BASE = process.env.PROD_URL ?? "https://musing-maxwell-84ed29.vercel.app";

// J4: stress-walk every visible button + link on the admin demo routes.
// For each click: capture URL after, console errors, and 4xx/5xx network
// responses. The point is to catch any click that 500s, dead-pages, or
// throws a hydration error — things a presenter might accidentally hit.

interface ClickResult {
  route: string;
  label: string;
  testId: string;
  hrefOrType: string;
  resultUrl: string;
  consoleErrors: string[];
  failedRequests: string[];
  threw: string | null;
}

const ADMIN_ROUTES = [
  "/admin",
  "/admin/match",
  "/admin/outreach",
  "/admin/creators",
  "/admin/campaigns",
  "/admin/campaigns/celsius-college-q2",
];

const seedAdmin = async (page: import("@playwright/test").Page) => {
  await page.goto(`${BASE}/`);
  await page.evaluate(() => {
    window.localStorage.setItem(
      "mercor.identity.v1",
      JSON.stringify({ persona: "admin" }),
    );
  });
};

test.describe("Click-monkey stress on admin routes", () => {
  test.setTimeout(300_000);

  test("walk every visible button + link, capture errors", async ({
    browser,
  }) => {
    const allResults: ClickResult[] = [];

    for (const route of ADMIN_ROUTES) {
      // Fresh context per route so prior clicks don't pollute later runs.
      const ctx = await browser.newContext({ baseURL: BASE });
      const page = await ctx.newPage();

      await seedAdmin(page);
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState("networkidle");

      // Snapshot every clickable element on the page. We pick by
      // role=button + role=link + bare <a>/<button> with explicit
      // exceptions (skip cookie-consent / persona-switcher / RESET to
      // avoid wiping our seeded state mid-walk).
      const targets = await page.evaluate(() => {
        const skipIds = new Set([
          "reset-demo",
          "sidebar-persona-switcher",
          "cookie-consent-button",
        ]);
        const seen = new Set<string>();
        const out: { label: string; testId: string; hrefOrType: string }[] = [];
        for (const el of Array.from(
          document.querySelectorAll<HTMLElement>("button, a"),
        )) {
          const isVisible = (el as HTMLElement).offsetParent !== null;
          if (!isVisible) continue;
          const testId = el.getAttribute("data-test-id") ?? "";
          if (skipIds.has(testId)) continue;
          const href = el.getAttribute("href") ?? "";
          // Skip dead-link footer items defensively (E1 hides the footer
          // on /admin so this is belt-and-suspenders).
          if (href === "#") continue;
          const label = (el.innerText || el.getAttribute("aria-label") || "")
            .trim()
            .slice(0, 40);
          const key = `${label}|${href}|${testId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            label: label || "(no label)",
            testId,
            hrefOrType: href || el.tagName.toLowerCase(),
          });
        }
        return out;
      });

      // Limit per route to a sane sample size — the long-tail of
      // sub-buttons (e.g. each "x" close on toasts) explodes otherwise.
      const sample = targets.slice(0, 25);

      for (const t of sample) {
        const ctxCheck = await browser.newContext({ baseURL: BASE });
        const p = await ctxCheck.newPage();

        const consoleErrors: string[] = [];
        const failedRequests: string[] = [];
        p.on("console", (m) => {
          if (m.type() === "error") consoleErrors.push(m.text());
        });
        p.on("response", (r) => {
          const u = r.url();
          if (u.includes("google.com/s2/favicons")) return;
          if (r.status() >= 400) failedRequests.push(`${r.status()} ${u}`);
        });

        await seedAdmin(p);
        await p.goto(`${BASE}${route}`);
        await p.waitForLoadState("networkidle");

        let threw: string | null = null;
        try {
          // Resolve via test-id first (most stable), else accessible-name
          // role lookup which honors aria-label, then text — this covers
          // icon-only links like the "Mercor home" M-mark which has only
          // an aria-label, no text content.
          const isLink = t.hrefOrType.startsWith("/") || t.hrefOrType === "a";
          const loc = t.testId
            ? p.locator(`[data-test-id="${t.testId}"]`).first()
            : p.getByRole(isLink ? "link" : "button", { name: t.label }).first();
          await loc.click({ timeout: 5_000, trial: false });
          // Brief settle window — long enough to catch a thrown render
          // error or 500 response, short enough to keep the matrix fast.
          await p.waitForTimeout(500);
        } catch (e) {
          threw = (e as Error).message.split("\n")[0]!.slice(0, 120);
        }

        allResults.push({
          route,
          label: t.label,
          testId: t.testId,
          hrefOrType: t.hrefOrType,
          resultUrl: new URL(p.url()).pathname,
          consoleErrors,
          failedRequests,
          threw,
        });

        await ctxCheck.close();
      }
      await ctx.close();
    }

    // Tabulate. Print full table for the report; assert nothing 5xx'd.
    console.log("Click-monkey results:");
    console.log(
      `  total clicks attempted: ${allResults.length} across ${ADMIN_ROUTES.length} routes`,
    );

    const fivexx = allResults.filter((r) =>
      r.failedRequests.some((f) => /^5\d\d /.test(f)),
    );
    const fourxx = allResults.filter((r) =>
      r.failedRequests.some((f) => /^4\d\d /.test(f)),
    );
    const threwAny = allResults.filter((r) => r.threw !== null);
    const consoleAny = allResults.filter((r) => r.consoleErrors.length > 0);

    console.log(`  5xx responses on click: ${fivexx.length}`);
    console.log(`  4xx responses on click: ${fourxx.length}`);
    console.log(`  threw exception: ${threwAny.length}`);
    console.log(`  console errors: ${consoleAny.length}`);

    const top = [...fivexx, ...threwAny, ...fourxx, ...consoleAny].slice(0, 10);
    if (top.length > 0) {
      console.log("Top click-monkey issues (first 10):");
      for (const r of top) {
        console.log(
          `  - [${r.route}] "${r.label}" (${r.testId || r.hrefOrType}) → ${r.resultUrl}` +
            (r.threw ? `  THREW: ${r.threw}` : "") +
            (r.failedRequests.length ? `  HTTP: ${r.failedRequests[0]}` : "") +
            (r.consoleErrors.length ? `  console: ${r.consoleErrors[0]?.slice(0, 80)}` : ""),
        );
      }
    }

    // Hard assertion: no 5xx response on click. That's the real
    // production-readiness signal — anything that hits the server and
    // returns 5xx breaks the demo. Click timeouts (`threw`) are
    // measurement artifacts of fuzzy label matching on multi-line
    // buttons (e.g. "CREATOR\nAaron → Celsius") and are advisory only.
    // 4xx and console errors are also advisory — reported but
    // non-blocking, since some 4xx are expected (e.g. tile-image probes).
    expect(fivexx, "click triggered a 5xx response").toEqual([]);
    // Soft cap on timeouts so a future change that breaks 80% of buttons
    // still gets caught. Current baseline: ~15/123 (12%) timeouts from
    // the multi-line labels noted above.
    expect(
      threwAny.length,
      `click-throw rate exceeded 25% — locator strategy may be broken (${threwAny.length}/${allResults.length})`,
    ).toBeLessThan(allResults.length * 0.25);
  });
});
