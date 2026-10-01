import axe from "axe-core";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/access-denied",
  "/admin/audit",
  "/admin/streams",
  "/admin/streams/smoke-test",
  "/assets",
  "/assets/smoke-test",
  "/dashboard",
  "/dev-test",
  "/dev-test/modal",
  "/dev-test/status-badge",
  "/mediator/disputes",
  "/mediator/disputes/smoke-test",
  "/reputation",
  "/reputation/GDNM7WSJ7VIUVK2TSZ2OQES5XR2663TZEIBFXRDT56B5IRLHERVWSXMU",
  "/settings",
  "/streams",
  "/streams/smoke-test",
  "/trades",
  "/trades/create",
  "/trades/smoke-test",
  "/vault",
  "/vault/manage",
];

test.describe("App routes", () => {
  for (const route of routes) {
    test(`${route} renders and has no serious accessibility violations`, async ({ page }) => {
      const response = await page.goto(route);

      expect(response?.status(), `${route} returned an HTTP error`).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
      await page.addScriptTag({ content: axe.source });

      const violations = await page.evaluate(async () => {
        const axeInstance = (window as Window & {
          axe: {
            run: (context: Document) => Promise<{
              violations: { impact?: string | null; id: string }[];
            }>;
          };
        }).axe;
        const results = await axeInstance.run(document);
        return results.violations
          .filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))
          .map(({ id, impact }) => ({ id, impact }));
      });

      expect(violations, `${route} has critical/serious axe violations`).toEqual([]);
    });
  }
});
