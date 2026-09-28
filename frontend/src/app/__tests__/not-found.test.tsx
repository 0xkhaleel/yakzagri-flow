/**
 * Tests for the route-level 404 page (#47).
 *
 * Covers: heading semantics, the 404 status, recovery links (landing /
 * dashboard / trades), keyboard reachability of the go-back control, the
 * jsdom "no history" fallback, an axe pass, and the static facts the issue
 * got wrong (its `/users/*` and `/contracts/*` routes are really
 * `/reputation/*` and `/streams/*`).
 *
 * Landmark regression guard: `AppShell` already renders the document's
 * `<main>` landmark, so the 404 page must expose a labelled `region` (a
 * `<section aria-labelledby>`) and must never nest a second `<main>` — nested
 * main landmarks are invalid HTML and an axe landmark violation.
 */

import fs from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { useRouter } from "next/navigation";

import NotFound from "../not-found";
import { hasPreviousPage } from "../NotFoundBackButton";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockRouter = {
  back: mockBack,
  push: mockPush,
} as unknown as ReturnType<typeof useRouter>;

const notFoundPath = path.resolve(__dirname, "../not-found.tsx");
const globalSearchPath = path.resolve(__dirname, "../../components/GlobalSearch.tsx");
const appShellPath = path.resolve(__dirname, "../../components/layout/AppShell.tsx");

/** Drop comments so the source-level landmark assertions only see real markup. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
  mockUseRouter.mockReturnValue(mockRouter);
});

describe("NotFound (route-level 404)", () => {
  it("renders exactly one h1 and shows the 404 status", () => {
    render(<NotFound />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Page not found");
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("exposes the fallback as a labelled region, not a second main landmark", () => {
    render(<NotFound />);

    const region = screen.getByRole("region", { name: "Page not found" });
    expect(region).toBe(screen.getByTestId("not-found-page"));
    expect(region.tagName).toBe("SECTION");
    expect(region).toHaveAttribute("aria-labelledby", "not-found-heading");
  });

  it("never renders a <main> landmark, because the app shell already provides one", () => {
    const { container } = render(<NotFound />);

    // Regression guard: `AppShell` wraps every route in `<main>`, so a `<main>`
    // here would nest one main landmark inside another (invalid HTML, and an
    // axe landmark violation).
    expect(container.querySelectorAll("main")).toHaveLength(0);
    expect(screen.queryByRole("main")).toBeNull();

    const appShellSource = fs.readFileSync(appShellPath, "utf8");
    const notFoundMarkup = stripComments(fs.readFileSync(notFoundPath, "utf8"));

    expect(appShellSource).toContain("<main");
    expect(notFoundMarkup).not.toMatch(/<main[\s>]/);
  });

  it("links back to the landing page, the dashboard and the trades list", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Trades" })).toHaveAttribute(
      "href",
      "/trades",
    );
  });

  it("groups the recovery links in a navigation landmark named by its heading", () => {
    render(<NotFound />);

    const nav = screen.getByRole("navigation", {
      name: "Choose where to go next",
    });
    expect(nav).toContainElement(
      screen.getByRole("link", { name: "Back to Home" }),
    );
  });

  it("offers a keyboard-reachable go-back control", async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const goBack = screen.getByRole("button", { name: "Go Back" });

    let reached = false;
    for (let i = 0; i < 6 && !reached; i += 1) {
      await user.tab();
      reached = document.activeElement === goBack;
    }
    expect(reached).toBe(true);

    await user.keyboard("{Enter}");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("falls back to the landing page when the tab has no history to pop", async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    await user.click(screen.getByRole("button", { name: "Go Back" }));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("prefers browser history when a previous page exists", () => {
    expect(hasPreviousPage(1)).toBe(false);
    expect(hasPreviousPage(2)).toBe(true);
  });

  it("has no critical or serious axe violations", async () => {
    const { container } = render(<NotFound />);

    const results = await axe(container);
    const criticalSerious = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );

    expect(criticalSerious).toEqual([]);
  });

  it("ships as the default export of the route-level not-found module", () => {
    expect(fs.existsSync(notFoundPath)).toBe(true);
    expect(typeof NotFound).toBe("function");
    expect(fs.readFileSync(notFoundPath, "utf8")).toMatch(
      /export default function NotFound\(\)/,
    );
  });

  it("documents the real GlobalSearch destinations the issue named as /users/* and /contracts/*", () => {
    const source = fs.readFileSync(globalSearchPath, "utf8");

    expect(source).toContain("`/reputation/${encodeURIComponent(item.id)}`");
    expect(source).toContain("`/streams/${encodeURIComponent(item.id)}`");
    expect(source).not.toContain("`/users/");
    expect(source).not.toContain("`/contracts/");
  });
});
