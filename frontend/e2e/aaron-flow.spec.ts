import { expect, test } from "@playwright/test";

const BASE = process.env.PROD_URL ?? "https://musing-maxwell-84ed29.vercel.app";

test.describe("Aaron Langerman flow — production smoke", () => {
  test.setTimeout(60_000);

  test("end-to-end: sign in, match, outreach, haggle, campaign", async ({
    page,
  }) => {
    const consoleErrors: { text: string; url: string }[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") {
        const url = m.location().url ?? "";
        consoleErrors.push({ text: m.text(), url });
      }
    });

    // Round-12 H2: capture per-stage wall-clock so a future regression that
    // adds latency to one of the stages gets flagged. Soft thresholds — each
    // stage <2s, total <6s. CI ran ~3.5s total in round 11; 2s/6s leaves
    // generous headroom for runner variance without letting a real slowdown
    // through.
    const timings: { label: string; ms: number }[] = [];
    let stageStart = Date.now();
    const stage = (label: string) => {
      const ms = Date.now() - stageStart;
      timings.push({ label, ms });
      stageStart = Date.now();
    };

    // Stage 1 — landing → sign in as Aaron. Two "Log in" buttons exist
    // (top nav + hero CTA dropdown), pick the first.
    await page.goto(`${BASE}/`);
    await page.locator('[data-test-id="landing-nav-login"]').first().click();
    await page.locator('[data-test-id="landing-nav-login-admin"]').first().click();
    await expect(page).toHaveURL(/\/admin$/);
    stage("1. landing → /admin");

    // A2 verification: sidebar contains Match item.
    const matchLink = page.locator('aside a[href="/admin/match"]');
    await expect(matchLink).toBeVisible();
    await expect(matchLink).toContainText("Match");

    // Stage 2 — Match Celsius row 1.
    await matchLink.click();
    await expect(page).toHaveURL(/\/admin\/match$/);
    const loganRow = page.locator('[data-test-id="match-row-loganmann32"]');
    await expect(loganRow).toBeVisible();
    stage("2. /admin → /admin/match (Logan row visible)");
    const loganRowText = await loganRow.innerText();
    // Verify rank #1 and the deterministic Logan/Celsius numbers. The row
    // begins with a checkbox bullet column, so "1." appears on a line of
    // its own — match anywhere rather than at start.
    expect(loganRowText).toMatch(/(?:^|\n)1\./);
    expect(loganRowText).toContain("Logan Mann");
    expect(loganRowText).toContain("22.7K");
    expect(loganRowText).toContain("0.71");
    expect(loganRowText).toContain("67");
    expect(loganRowText).toContain("$203");

    // Stage 4 — Generate outreach (Logan is pre-checked).
    await page.locator('[data-test-id="match-generate-outreach"]').click();
    await expect(page).toHaveURL(
      /\/admin\/outreach\?brand=celsius&picks=loganmann32/,
    );

    // Stage 5 — type $700? in the composer and wait for a non-empty reply.
    const composer = page.locator('[data-test-id="outreach-composer"]');
    await expect(composer).toBeVisible();
    stage("3. /admin/match → /admin/outreach (composer visible)");

    await composer.fill("");
    await composer.fill("$700?");
    await composer.press("Enter");

    // The "$700?" message should appear quickly. Then the counterparty
    // (Logan) replies via /api/chat-reply (Gemini Flash Lite, ~1-3s) or via
    // server-side fallback if the upstream stalls. Either way: a new bubble
    // beneath the $700? message should land within 10s.
    const messageRegion = page.getByText("CONVERSATION WITH LOGAN MANN").locator("xpath=..");
    await expect(messageRegion).toContainText("$700?", { timeout: 5_000 });
    await page.waitForFunction(
      () => {
        const t = document.body.innerText;
        const i = t.indexOf("$700?");
        if (i < 0) return false;
        // Look for non-empty content AFTER the "$700?" string and AFTER
        // "LOGAN MANN" header that follows.
        const after = t.slice(i + 5);
        const loganIdx = after.indexOf("LOGAN MANN");
        if (loganIdx < 0) return false;
        const reply = after.slice(loganIdx + "LOGAN MANN".length).trim();
        return reply.length > 20;
      },
      null,
      { timeout: 12_000 },
    );
    stage("4. $700? send → counterparty reply visible");

    // Stage 6 — campaign live perf label.
    await page.goto(`${BASE}/admin/campaigns/celsius-college-q2`);
    const tickLabel = page.getByText(/Updates every 8-12 seconds/);
    await expect(tickLabel).toBeVisible({ timeout: 5_000 });
    stage("5. /admin/outreach → /admin/campaigns/celsius-college-q2");

    // H2 thresholds. Stage budgets:
    //   - non-Gemini stages: <2s each (G5 measured every navigation under 1s)
    //   - Gemini reply stage (4): <5s (upstream legitimately takes 1-3s, plus
    //     send animation; the 12s waitForFunction above is the hard cap)
    //   - total: <8s (G5 cold-start total was 3.5s; 8s leaves runner headroom)
    const total = timings.reduce((sum, t) => sum + t.ms, 0);
    console.log("Stage timings:");
    for (const t of timings) console.log(`  ${t.label}: ${t.ms}ms`);
    console.log(`  TOTAL: ${total}ms`);
    for (const t of timings) {
      const cap = t.label.startsWith("4. $700?") ? 5_000 : 2_000;
      expect(t.ms, `stage "${t.label}" exceeded ${cap}ms budget`).toBeLessThan(cap);
    }
    expect(total, "total flow exceeded 8s budget").toBeLessThan(8_000);

    // Console error gate: only allow benign clearbit/google favicon DNS
    // errors. After D2 (drop clearbit) we expect 0; google favicon may
    // still 404 for some domains. Anything else (a real script error,
    // a 500 from /api/*, a missing module) should fail the test.
    const benign = (e: { text: string; url: string }) => {
      const blob = `${e.text} ${e.url}`;
      return (
        blob.includes("logo.clearbit.com") ||
        blob.includes("google.com/s2/favicons") ||
        blob.includes("/favicon.ico") ||
        (blob.includes("Failed to load resource") &&
          (blob.includes("favicon") || blob.includes("clearbit")))
      );
    };
    const real = consoleErrors.filter((e) => !benign(e));
    if (real.length > 0) {
      console.log(
        "Non-benign console errors:\n  - " +
          real.map((e) => `${e.text} (${e.url})`).join("\n  - "),
      );
    }
    expect(real, "real console errors during the walk").toHaveLength(0);
  });

  // Round-9 E7: lock in the round-8 D1 (footer hidden on admin) and
  // round-7 C1 (PersonaGuard) so they can't quietly regress.
  test("admin routes have no dead-link footer items", async ({ page }) => {
    // Sign in as admin via localStorage so we don't repeat the landing flow.
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      window.localStorage.setItem(
        "mercor.identity.v1",
        JSON.stringify({ persona: "admin" }),
      );
    });

    const adminRoutes = [
      "/admin",
      "/admin/match",
      "/admin/outreach",
      "/admin/creators",
      "/admin/campaigns",
    ];
    for (const route of adminRoutes) {
      await page.goto(`${BASE}${route}`);
      // Allow the page client-render to settle.
      await page.waitForLoadState("networkidle");
      const deadCount = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href="#"]')).filter(
          (a) => (a as HTMLElement).offsetParent !== null,
        ).length;
      });
      expect(deadCount, `dead-link footer items visible on ${route}`).toBe(0);
    }
  });

  // Round-10 F6: lock in the RESET ALL FOR DEMO button so the recovery move
  // we promise in the call script keeps working.
  test("RESET ALL FOR DEMO wipes mercor.* state and bounces to /", async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      window.localStorage.setItem(
        "mercor.identity.v1",
        JSON.stringify({ persona: "admin" }),
      );
      window.localStorage.setItem(
        "mercor.deliverables.v1",
        JSON.stringify({ touched: true }),
      );
      window.localStorage.setItem(
        "mercor.outreach.v2",
        JSON.stringify({ scratch: "round-10" }),
      );
    });
    await page.goto(`${BASE}/admin`);
    const before = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((k) => k.startsWith("mercor.")),
    );
    expect(before.length, "at least one mercor.* key before reset").toBeGreaterThanOrEqual(2);

    page.once("dialog", (d) => d.accept());
    await page.locator('[data-test-id="reset-demo"]').click();
    await page.waitForURL(/\/$/, { timeout: 5_000 });

    const after = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((k) => k.startsWith("mercor.")),
    );
    expect(after, "no mercor.* keys remain after reset").toEqual([]);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("creator persona is bounced from admin routes to /home", async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      window.localStorage.setItem(
        "mercor.identity.v1",
        JSON.stringify({ persona: "creator" }),
      );
    });

    const adminRoutes = [
      "/admin",
      "/admin/match",
      "/admin/outreach",
      "/admin/campaigns/celsius-college-q2",
      "/admin/interviews/loganmann32",
    ];
    for (const route of adminRoutes) {
      await page.goto(`${BASE}${route}`);
      // PersonaGuard fires inside a useEffect, then router.replace.
      await page.waitForURL(/\/home$/, { timeout: 5_000 });
      expect(
        new URL(page.url()).pathname,
        `creator browsing ${route} should land on /home`,
      ).toBe("/home");
    }
  });
});
