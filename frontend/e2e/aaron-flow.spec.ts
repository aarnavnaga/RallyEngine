import { expect, test } from "@playwright/test";

const BASE = process.env.PROD_URL ?? "https://musing-maxwell-84ed29.vercel.app";

test.describe("Aaron Langerman flow — production smoke", () => {
  test.setTimeout(60_000);

  test("end-to-end: sign in, match, outreach, haggle, campaign", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    // Stage 1 — landing → sign in as Aaron. Two "Log in" buttons exist
    // (top nav + hero CTA dropdown), pick the first.
    await page.goto(`${BASE}/`);
    await page.locator('[data-test-id="landing-nav-login"]').first().click();
    await page.locator('[data-test-id="landing-nav-login-admin"]').first().click();
    await expect(page).toHaveURL(/\/admin$/);

    // A2 verification: sidebar contains Match item.
    const matchLink = page.locator('aside a[href="/admin/match"]');
    await expect(matchLink).toBeVisible();
    await expect(matchLink).toContainText("Match");

    // Stage 2 — Match Celsius row 1.
    await matchLink.click();
    await expect(page).toHaveURL(/\/admin\/match$/);
    const loganRow = page.locator('[data-test-id="match-row-loganmann32"]');
    await expect(loganRow).toBeVisible();
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

    // Stage 6 — campaign live perf label.
    await page.goto(`${BASE}/admin/campaigns/celsius-college-q2`);
    const tickLabel = page.getByText(/Updates every 8-12 seconds/);
    await expect(tickLabel).toBeVisible({ timeout: 5_000 });

    // Console error gate: only allow benign clearbit/google favicon DNS
    // errors. After D2 (drop clearbit) we expect 0; google favicon may
    // still 404 for some domains. Anything else (a real script error,
    // a 500 from /api/*, a missing module) should fail the test.
    const benign = (msg: string) =>
      msg.includes("logo.clearbit.com") ||
      msg.includes("google.com/s2/favicons") ||
      msg.includes("Failed to load resource") &&
        (msg.includes("favicon") || msg.includes("clearbit"));
    const real = consoleErrors.filter((m) => !benign(m));
    if (real.length > 0) {
      console.log("Non-benign console errors:\n  - " + real.join("\n  - "));
    }
    expect(real, "real console errors during the walk").toHaveLength(0);
  });
});
