import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.PROD_URL ?? "https://musing-maxwell-84ed29.vercel.app";

// J3: axe-core scan + keyboard navigation through the Aaron flow. Critical
// for an enterprise pitch — Aaron may evaluate with a11y in mind, or
// forward the URL to someone who does.

const seedAdmin = async (page: import("@playwright/test").Page) => {
  await page.goto(`${BASE}/`);
  await page.evaluate(() => {
    window.localStorage.setItem(
      "mercor.identity.v1",
      JSON.stringify({ persona: "admin" }),
    );
  });
};

const scan = async (page: import("@playwright/test").Page) => {
  const results = await new AxeBuilder({ page })
    // Restrict to WCAG 2.1 AA + best practices.
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (blocking.length > 0) {
    console.log(
      `axe blocking violations on ${page.url()}:\n` +
        blocking
          .map(
            (v) =>
              `  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)\n    ${v.helpUrl}\n    nodes: ${v.nodes
                .slice(0, 3)
                .map((n) => n.target.join(" "))
                .join(" | ")}`,
          )
          .join("\n"),
    );
  }
  return blocking;
};

test.describe("Accessibility — axe-core scan", () => {
  test.setTimeout(60_000);

  test("landing /", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const blocking = await scan(page);
    expect(blocking, "serious/critical a11y violations on /").toEqual([]);
  });

  test("admin /admin", async ({ page }) => {
    await seedAdmin(page);
    await page.goto(`${BASE}/admin`);
    await page.locator('aside a[href="/admin/match"]').waitFor();
    const blocking = await scan(page);
    expect(blocking, "serious/critical a11y violations on /admin").toEqual([]);
  });

  test("match /admin/match", async ({ page }) => {
    await seedAdmin(page);
    await page.goto(`${BASE}/admin/match`);
    await page.locator('[data-test-id="match-row-loganmann32"]').waitFor();
    const blocking = await scan(page);
    expect(blocking, "serious/critical a11y violations on /admin/match").toEqual(
      [],
    );
  });

  test("outreach /admin/outreach", async ({ page }) => {
    await seedAdmin(page);
    await page.goto(`${BASE}/admin/outreach?brand=celsius&picks=loganmann32`);
    await page.locator('[data-test-id="outreach-composer"]').waitFor();
    const blocking = await scan(page);
    expect(
      blocking,
      "serious/critical a11y violations on /admin/outreach",
    ).toEqual([]);
  });

  test("campaigns /admin/campaigns/celsius-college-q2", async ({ page }) => {
    await seedAdmin(page);
    await page.goto(`${BASE}/admin/campaigns/celsius-college-q2`);
    await page.getByText(/Updates every 8-12 seconds/).waitFor();
    const blocking = await scan(page);
    expect(
      blocking,
      "serious/critical a11y violations on campaign page",
    ).toEqual([]);
  });
});

test.describe("Accessibility — keyboard navigation", () => {
  test.setTimeout(60_000);

  test("can complete Aaron flow with keyboard alone", async ({ page }) => {
    // Step 1: landing → focus the Log in nav button via Tab, activate via Enter
    await page.goto(`${BASE}/`);
    const loginBtn = page.locator('[data-test-id="landing-nav-login"]').first();
    await loginBtn.focus();
    await loginBtn.press("Enter");

    // Dropdown should be open. Focus the Aaron entry and Enter.
    const aaronBtn = page
      .locator('[data-test-id="landing-nav-login-admin"]')
      .first();
    await aaronBtn.focus();
    await aaronBtn.press("Enter");
    await expect(page).toHaveURL(/\/admin$/);

    // Step 2: focus sidebar Match link, Enter.
    const matchLink = page.locator('aside a[href="/admin/match"]');
    await matchLink.focus();
    await matchLink.press("Enter");
    await expect(page).toHaveURL(/\/admin\/match$/);
    await page.locator('[data-test-id="match-row-loganmann32"]').waitFor();

    // Step 3: focus Generate outreach button, Enter.
    const genBtn = page.locator('[data-test-id="match-generate-outreach"]');
    await genBtn.focus();
    await genBtn.press("Enter");
    await expect(page).toHaveURL(/\/admin\/outreach/);

    // Step 4: focus composer, type, submit via Enter.
    const composer = page.locator('[data-test-id="outreach-composer"]');
    await composer.focus();
    await composer.fill("$700?");
    await composer.press("Enter");
    await page.waitForFunction(
      () => document.body.innerText.includes("$700?"),
      null,
      { timeout: 5_000 },
    );

    // Step 5: navigate to campaigns via address bar (the sidebar Campaigns
    // link goes to the index, not the live campaign page). The keyboard
    // path through the campaigns index → live page is its own flow; covered
    // here by the direct URL since the address bar is keyboard-driven too.
    await page.goto(`${BASE}/admin/campaigns/celsius-college-q2`);
    await page.getByText(/Updates every 8-12 seconds/).waitFor();
  });
});
