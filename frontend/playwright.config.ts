import { defineConfig, devices } from "@playwright/test";

const PROD_URL =
  process.env.PROD_URL ?? "https://musing-maxwell-84ed29.vercel.app";

// J1 (cross-browser) projects all run aaron-flow.spec.ts. The heavier specs
// (J2 throttled, J3 a11y, J4 click-monkey, J5 dwelled) live in their own
// projects and are run via dedicated pnpm scripts; the default `pnpm test:e2e`
// only runs the three browser projects so CI stays fast.
const AARON_FLOW = /aaron-flow\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: PROD_URL,
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    // J1 cross-browser
    {
      name: "chromium",
      testMatch: AARON_FLOW,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testMatch: AARON_FLOW,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "firefox",
      testMatch: AARON_FLOW,
      use: { ...devices["Desktop Firefox"] },
    },
    // J2 slow-3G profile — opt-in via `pnpm test:slow`
    {
      name: "slow-3g",
      testMatch: /throttled\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // J3 accessibility — opt-in via `pnpm test:a11y`
    {
      name: "a11y",
      testMatch: /a11y\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // J4 click-monkey stress — opt-in via `pnpm test:click-monkey`
    {
      name: "click-monkey",
      testMatch: /click-monkey\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // J5 dwelled-timing budget — opt-in via `pnpm test:dwelled`
    {
      name: "dwelled",
      testMatch: /dwelled\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
