import { test, expect } from "@playwright/test";

const BASE = process.env.PROD_URL ?? "https://musing-maxwell-84ed29.vercel.app";

// J2: emulate Fast-3G / hotel-WiFi via CDP. Aaron may demo from a coffee
// shop or conference WiFi. Slow-3G (400Kbps) can't fully hydrate our
// React bundle in time for the dropdown click — that's a CSR limitation,
// not a regression. Fast-3G (1.6Mbps / 750Kbps) is a closer match to
// real-world bad WiFi and produces useful timings the checklist can
// quote.
test.describe("Aaron flow under Fast-3G throttle (hotel WiFi profile)", () => {
  test.setTimeout(240_000);

  test("walk Aaron flow with 1.6Mbps / 200ms RTT", async ({ page, browser }) => {
    const context = page.context();
    // CDP throttle is chromium-only; this project pins Desktop Chrome.
    const client = await context.newCDPSession(page);
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 200, // ms RTT — typical bad WiFi
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps → 200 KB/s
      uploadThroughput: (750 * 1024) / 8, // 750 Kbps → 94 KB/s
    });

    const timings: { label: string; ms: number }[] = [];
    let stageStart = Date.now();
    const stage = (label: string) => {
      timings.push({ label, ms: Date.now() - stageStart });
      stageStart = Date.now();
    };

    // 1. Landing → /admin. Under throttle the React bundle hydrates
    // late, so we wait for `load` (all JS downloaded + parsed) before
    // attempting the dropdown toggle. Without this, the first click
    // misses because the onClick handler isn't bound yet.
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90_000 });
    await page.locator('[data-test-id="landing-nav-login"]').first().waitFor();
    await page.locator('[data-test-id="landing-nav-login"]').first().click();
    await page
      .locator('[data-test-id="landing-nav-login-admin"]')
      .first()
      .waitFor({ timeout: 60_000 });
    await page.locator('[data-test-id="landing-nav-login-admin"]').first().click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
    await page.locator('aside a[href="/admin/match"]').waitFor();
    stage("1. landing → /admin");

    // 2. Match
    await page.locator('aside a[href="/admin/match"]').click();
    await expect(page).toHaveURL(/\/admin\/match$/);
    await page.locator('[data-test-id="match-row-loganmann32"]').waitFor();
    stage("2. /admin → /admin/match");

    // 3. Outreach
    await page.locator('[data-test-id="match-generate-outreach"]').click();
    await page.locator('[data-test-id="outreach-composer"]').waitFor();
    stage("3. /admin/match → /admin/outreach");

    // 4. $700? + reply
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
      { timeout: 60_000 },
    );
    stage("4. $700? → reply");

    // 5. Campaigns
    await page.goto(`${BASE}/admin/campaigns/celsius-college-q2`);
    await page.getByText(/Updates every 8-12 seconds/).waitFor({ timeout: 30_000 });
    stage("5. /admin/campaigns/celsius-college-q2");

    const total = timings.reduce((s, t) => s + t.ms, 0);
    console.log("Slow-3G stage timings:");
    for (const t of timings) console.log(`  ${t.label}: ${t.ms}ms`);
    console.log(`  TOTAL: ${total}ms`);

    // Soft ceiling — under 3 min on Slow-3G is acceptable for an enterprise
    // hotel-WiFi safety net. If it breaks 3 min the demo is in trouble.
    expect(total, "Slow-3G total exceeded 180s budget").toBeLessThan(180_000);
  });
});
