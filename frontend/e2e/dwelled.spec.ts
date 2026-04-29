import { test, expect } from "@playwright/test";

const BASE = process.env.PROD_URL ?? "https://musing-maxwell-84ed29.vercel.app";

// J5: full Aaron walk including the natural pause/dwell time the script
// allocates per stage. Locks the presentation budget at 4 minutes.
//
// Per script (aaron-call-final.md):
// - Stage 1 sign-in: ~10s spoken
// - Stage 2 admin overview: ~30s
// - Stage 3 match workbench + RAG citations: ~60s
// - Stage 4 outreach review: ~30s
// - Stage 5 live haggle: ~20s + 1-3s reply
// - Stage 6 campaign live perf: ~30s
// Total spoken: ~3 minutes plus 30s buffer for transitions = 210s.
// Hard ceiling 240s (4 min) so we have a real assertion that catches
// presentation-blowing regressions.

test.describe("Dwelled-timing budget — Aaron walk including spoken pauses", () => {
  test.setTimeout(360_000);

  test("4-minute presentation budget", async ({ page }) => {
    const t0 = Date.now();
    const stamps: { stage: string; ms: number }[] = [];
    const log = (stage: string) => stamps.push({ stage, ms: Date.now() - t0 });

    // Stage 1 — sign in (~10s dwell)
    await page.goto(`${BASE}/`);
    await page.locator('[data-test-id="landing-nav-login"]').first().click();
    await page.locator('[data-test-id="landing-nav-login-admin"]').first().click();
    await expect(page).toHaveURL(/\/admin$/);
    log("1. signed in to /admin");
    await page.waitForTimeout(10_000);

    // Stage 2 — admin overview (read KPIs, ~30s dwell)
    await expect(page.locator('aside a[href="/admin/match"]')).toBeVisible();
    log("2. /admin painted, reading KPIs");
    await page.waitForTimeout(30_000);

    // Stage 3 — match workbench (~60s, includes expanding Logan's row + reading RAG)
    await page.locator('aside a[href="/admin/match"]').click();
    await expect(page).toHaveURL(/\/admin\/match$/);
    await page.locator('[data-test-id="match-row-loganmann32"]').waitFor();
    log("3a. /admin/match (Logan row visible)");
    // Logan's row defaults expanded (`expanded` state init = "loganmann32")
    // so the RAG citations are visible immediately. Aaron reads.
    await page.waitForTimeout(60_000);
    log("3b. /admin/match (read RAG citations)");

    // Stage 4 — outreach (~30s, includes reading opener + Logan's pre-drafted reply)
    await page.locator('[data-test-id="match-generate-outreach"]').click();
    await expect(page).toHaveURL(/\/admin\/outreach/);
    await page.locator('[data-test-id="outreach-composer"]').waitFor();
    log("4a. /admin/outreach (composer + thread visible)");
    await page.waitForTimeout(30_000);

    // Stage 5 — live haggle ($700? send + reply, ~20s)
    await page.locator('[data-test-id="outreach-composer"]').fill("$700?");
    await page.locator('[data-test-id="outreach-composer"]').press("Enter");
    await page.waitForFunction(
      () => {
        const t = document.body.innerText;
        const i = t.indexOf("$700?");
        if (i < 0) return false;
        const after = t.slice(i + 5);
        const li = after.indexOf("LOGAN MANN");
        if (li < 0) return false;
        return after.slice(li + "LOGAN MANN".length).trim().length > 20;
      },
      null,
      { timeout: 12_000 },
    );
    log("5. $700? → reply visible");
    await page.waitForTimeout(15_000);

    // Stage 6 — campaign live perf (~30s, watch ticker)
    await page.goto(`${BASE}/admin/campaigns/celsius-college-q2`);
    await page.getByText(/Updates every 8-12 seconds/).waitFor();
    log("6. /admin/campaigns/celsius-college-q2 (ticker visible)");
    await page.waitForTimeout(30_000);

    const total = Date.now() - t0;
    console.log("Dwelled timing breakdown:");
    let prev = 0;
    for (const s of stamps) {
      console.log(`  ${s.stage}: T+${s.ms}ms (Δ${s.ms - prev}ms)`);
      prev = s.ms;
    }
    console.log(`  TOTAL with dwell: ${total}ms (${(total / 1000).toFixed(1)}s)`);

    // 4-minute hard ceiling.
    expect(total, "demo with dwell exceeded 4-minute budget").toBeLessThan(
      240_000,
    );
  });
});
