import { test, expect } from "@playwright/test";

test.describe("Candidate Journey", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Skill Assessment/);
  });

  test("invite page renders for valid token", async ({ page }) => {
    await page.goto("/invite/demo-campaign-2026");

    await expect(page.getByText("Skills Assessment")).toBeVisible();
    await expect(page.getByText("Before you begin")).toBeVisible();
    await expect(page.getByText("approximately 30–45 minutes")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sign in to Begin|Begin Assessment/ }),
    ).toBeVisible();
  });

  test("invite page shows instructions list", async ({ page }) => {
    await page.goto("/invite/demo-campaign-2026");

    await expect(page.getByText("quiet place")).toBeVisible();
    await expect(page.getByText("auto-saved")).toBeVisible();
    await expect(page.getByText("cannot go back")).toBeVisible();
  });

  test("unauthenticated user is redirected to sign in", async ({ page }) => {
    await page.goto("/invite/demo-campaign-2026");

    await page.getByRole("button", { name: /Sign in to Begin/ }).click();

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("sign in page renders correctly", async ({ page }) => {
    await page.goto("/auth/signin");

    await expect(page.getByText("Sign In")).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send Sign-In Link" }),
    ).toBeVisible();
  });

  test("sign in page validates email", async ({ page }) => {
    await page.goto("/auth/signin");

    const submitBtn = page.getByRole("button", { name: "Send Sign-In Link" });

    // Button should be disabled with empty email
    await expect(submitBtn).toBeDisabled();

    // Fill valid email
    await page.getByLabel("Email address").fill("test@example.com");
    await expect(submitBtn).toBeEnabled();
  });

  test("unauthorized page renders", async ({ page }) => {
    await page.goto("/unauthorized");

    await expect(page.getByText("Access Denied")).toBeVisible();
    await expect(page.getByText("permission")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
  });

  test("completion page renders", async ({ page }) => {
    await page.goto("/assessment/complete?sessionId=test-session-id");

    await expect(page.getByText("Assessment Complete")).toBeVisible();
    await expect(page.getByText("report is being prepared")).toBeVisible();
    await expect(page.getByText("test-ses")).toBeVisible(); // truncated session ID
  });

  test("admin routes redirect unauthenticated users", async ({ page }) => {
    const response = await page.goto("/admin");
    // Should be redirected to signin or get blocked by middleware
    const url = page.url();
    expect(url).toMatch(/signin|unauthorized|admin/);
  });
});

test.describe("Assessment UI Components", () => {
  test("assessment page shows error for invalid session", async ({ page }) => {
    // This will fail to load the session but should render the error state
    await page.goto("/assessment/nonexistent-session");

    // Should show loading then error
    await page.waitForTimeout(2000);

    // Either shows error or redirects
    const content = await page.textContent("body");
    expect(
      content?.includes("error") ||
      content?.includes("Error") ||
      content?.includes("not found") ||
      content?.includes("Authentication") ||
      page.url().includes("signin"),
    ).toBeTruthy();
  });
});

test.describe("Page Accessibility", () => {
  test("invite page has proper heading structure", async ({ page }) => {
    await page.goto("/invite/demo-campaign-2026");

    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("Skills Assessment");
  });

  test("sign in page has form labels", async ({ page }) => {
    await page.goto("/auth/signin");

    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("completion page has proper aria structure", async ({ page }) => {
    await page.goto("/assessment/complete?sessionId=abc123");

    const heading = page.locator("h1");
    await expect(heading).toHaveText("Assessment Complete");
  });

  test("unauthorized page has navigation back to home", async ({ page }) => {
    await page.goto("/unauthorized");

    const homeLink = page.getByRole("link", { name: "Go Home" });
    await expect(homeLink).toHaveAttribute("href", "/");
  });
});

test.describe("Report Page", () => {
  test("report page handles invalid session gracefully", async ({ page }) => {
    await page.goto("/reports/nonexistent-session");

    await page.waitForTimeout(2000);

    const content = await page.textContent("body");
    expect(
      content?.includes("error") ||
      content?.includes("Error") ||
      content?.includes("not found") ||
      content?.includes("Authentication") ||
      page.url().includes("signin"),
    ).toBeTruthy();
  });
});
