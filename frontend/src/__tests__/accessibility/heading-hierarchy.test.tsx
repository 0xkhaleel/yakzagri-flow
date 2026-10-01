import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { Toast } from "@/components/ui/Toast";
import NotFound from "@/app/not-found";
import AdminAuditHistoryPage from "@/app/admin/audit/page";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { api } from "@/lib/api";
import {
  countH1Elements,
  extractHeadingLevels,
  findHeadingLevelSkips,
  findMissingHeadingLevels,
  headingLevelsOfElements,
} from "@/lib/a11y/headingOutline";

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useIsAdmin");
jest.mock("@/lib/analytics", () => ({
  trackAdminEvent: jest.fn(),
}));
jest.mock("@/lib/api", () => {
  const { ApiError: RealApiError } = jest.requireActual("@/lib/api/client");
  return {
    api: {
      adminAudit: {
        list: jest.fn(),
      },
    },
    ApiError: RealApiError,
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseIsAdmin = useIsAdmin as jest.MockedFunction<typeof useIsAdmin>;
const mockAdminAuditList = api.adminAudit.list as jest.MockedFunction<
  typeof api.adminAudit.list
>;

function headingOutlineOf(container: HTMLElement) {
  const levels = headingLevelsOfElements(
    container.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  );
  return {
    levels,
    h1Count: container.querySelectorAll("h1").length,
    skips: findHeadingLevelSkips(levels),
  };
}

describe("Heading hierarchy", () => {
  describe("rendered states", () => {
    it("not-found renders exactly one h1 and never skips a level", () => {
      const { container } = render(<NotFound />);

      const { levels, h1Count, skips } = headingOutlineOf(container);

      expect(h1Count).toBe(1);
      expect(levels.length).toBeGreaterThan(0);
      expect(skips).toEqual([]);
    });

    it("Toast labels its live region without adding a heading to the outline", () => {
      const { container, getByText } = render(
        <Toast
          id="toast-1"
          type="success"
          title="Saved"
          message="Draft stored"
          duration={0}
          onClose={() => {}}
        />,
      );

      expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(
        0,
      );

      const group = container.querySelector('[role="group"]');
      const title = getByText("Saved");
      expect(title.tagName).toBe("P");
      expect(group).not.toBeNull();
      expect(group?.getAttribute("aria-labelledby")).toBe(title.id);
    });

    describe("admin audit history page", () => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({
          token: "test-token",
          isAuthenticated: true,
        } as ReturnType<typeof useAuth>);
        mockUseIsAdmin.mockReturnValue(true);
      });

      it("loaded state renders exactly one h1 and a contiguous outline", async () => {
        mockAdminAuditList.mockResolvedValueOnce({
          items: [
            {
              id: 1,
              action: "TREASURY_WITHDRAW",
              actorAddress: "GADMIN1234567890",
              targetReference: "GDEST1234567890",
              note: "Reclaiming funds per OPS-42",
              createdAt: "2026-07-05T12:00:00.000Z",
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });

        const { container } = render(<AdminAuditHistoryPage />);

        await waitFor(() => {
          expect(screen.getByText("Treasury Withdraw")).toBeInTheDocument();
        });

        const { h1Count, skips } = headingOutlineOf(container);

        expect(h1Count).toBe(1);
        expect(skips).toEqual([]);
      });

      it("loading state renders no h1 so only the delivered page owns the h1", () => {
        mockAdminAuditList.mockReturnValue(new Promise(() => {}));

        const { container } = render(<AdminAuditHistoryPage />);

        const { h1Count, skips } = headingOutlineOf(container);

        expect(h1Count).toBe(0);
        expect(skips).toEqual([]);
      });
    });
  });

  describe("static source audit", () => {
    const APP_DIR = path.join(process.cwd(), "src", "app");
    const PAGE_FILE_NAMES = new Set([
      "page.tsx",
      "layout.tsx",
      "error.tsx",
      "global-error.tsx",
      "not-found.tsx",
      "loading.tsx",
      "template.tsx",
      "default.tsx",
    ]);

    function collectPageFiles(directory: string): string[] {
      if (!fs.existsSync(directory)) {
        return [];
      }

      return fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
          const entryPath = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            return collectPageFiles(entryPath);
          }
          return PAGE_FILE_NAMES.has(entry.name) ? [entryPath] : [];
        });
    }

    const pageFiles = collectPageFiles(APP_DIR);
    const pageAuditCases = pageFiles.map((file) => ({
      file,
      relativePath: path.relative(process.cwd(), file),
    }));

    it("discovers the route page files to audit", () => {
      expect(pageFiles.length).toBeGreaterThan(0);
      expect(pageFiles.some((file) => file.endsWith(`${path.sep}page.tsx`))).toBe(
        true,
      );
    });

    it.each(pageAuditCases)(
      "$relativePath declares at most one <h1>",
      ({ file }) => {
        const source = fs.readFileSync(file, "utf8");
        expect(countH1Elements(source)).toBeLessThanOrEqual(1);
      },
    );

    it.each(pageAuditCases)(
      "$relativePath declares a gap-free heading outline",
      ({ file }) => {
        const source = fs.readFileSync(file, "utf8");
        const levels = extractHeadingLevels(source);
        expect(findMissingHeadingLevels(levels)).toEqual([]);
      },
    );

    it("Toast contributes no heading to the document outline", () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src", "components", "ui", "Toast.tsx"),
        "utf8",
      );
      expect(extractHeadingLevels(source)).toEqual([]);
    });
  });

  describe("heading outline helpers", () => {
    it("accepts a contiguous outline, including ascents", () => {
      expect(findHeadingLevelSkips([1, 2, 3, 2, 3])).toEqual([]);
    });

    it("flags a skipped level", () => {
      expect(findHeadingLevelSkips([1, 3])).toEqual([{ from: 1, to: 3 }]);
    });

    it("counts h1 declarations", () => {
      expect(countH1Elements("<h1>a</h1><h2>b</h2><h1>c</h1>")).toBe(2);
    });

    it("ignores closing tags and unrelated tags", () => {
      expect(extractHeadingLevels("<h2>a</h2><hr /><html></html>")).toEqual([2]);
    });

    it("reports missing middle levels for an h1-rooted outline", () => {
      expect(findMissingHeadingLevels([1, 3])).toEqual([2]);
      expect(findMissingHeadingLevels([1, 2, 3])).toEqual([]);
      expect(findMissingHeadingLevels([2, 3])).toEqual([]);
    });
  });
});
