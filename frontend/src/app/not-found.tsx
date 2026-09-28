import Link from "next/link";

import { t as translateCopy } from "@/lib/i18n";

import { NotFoundBackButton } from "./NotFoundBackButton";

/**
 * Route-level 404 (Next.js special file, #47).
 *
 * Next.js renders this inside the root layout for any URL that matches no
 * route — including the `GlobalSearch` destinations that can point at a
 * missing record (`/reputation/<id>` for an unknown user and `/streams/<id>`
 * for an unknown contract, see `src/components/GlobalSearch.tsx`).
 *
 * `AppShell` already supplies the application chrome, so this file owns the
 * fallback content only: a single <h1>, the 404 status, and a labelled
 * recovery block that returns the user to a known-good page.
 */

const LINK_BASE =
  "inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2";
const PRIMARY_LINK = `${LINK_BASE} bg-gold text-text-inverse hover:bg-gold-hover`;
const SECONDARY_LINK = `${LINK_BASE} border border-border-default bg-bg-elevated text-text-primary hover:border-border-hover`;

export default function NotFound() {
  return (
    <main
      data-testid="not-found-page"
      aria-labelledby="not-found-heading"
      className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold"
      >
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15.5 8.5 13.3 13.3 8.5 15.5l2.2-4.8z"
          />
        </svg>
      </span>

      <p className="mt-6 font-mono text-sm font-semibold uppercase tracking-widest text-gold">
        404
      </p>

      <h1
        id="not-found-heading"
        className="mt-3 text-balance text-3xl font-bold text-text-primary sm:text-4xl"
      >
        {translateCopy("ui.page_not_found_bc3023b")}
      </h1>

      <p className="mt-3 max-w-md text-pretty text-sm text-text-secondary sm:text-base">
        {translateCopy("ui.we_couldn_t_find_the_page_you_we_db1a831")}
      </p>

      <nav
        aria-labelledby="not-found-recovery-heading"
        className="mt-8 w-full rounded-2xl border border-border-default bg-bg-card p-6 text-left shadow-elev-1"
      >
        <h2
          id="not-found-recovery-heading"
          className="text-xs font-semibold uppercase tracking-widest text-text-muted"
        >
          {translateCopy("ui.choose_where_to_go_next_9a7f95b")}
        </h2>

        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          <li>
            <Link href="/" className={PRIMARY_LINK}>
              {translateCopy("ui.back_to_home_ce7472d")}
            </Link>
          </li>
          <li>
            <Link href="/dashboard" className={SECONDARY_LINK}>
              {translateCopy("ui.dashboard_d87f47b")}
            </Link>
          </li>
          <li>
            <Link href="/trades" className={SECONDARY_LINK}>
              {translateCopy("ui.trades_597b109")}
            </Link>
          </li>
        </ul>

        <div className="mt-5 flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">
            {translateCopy("ui.you_can_also_go_back_to_the_page_13f1adb")}
          </p>
          <NotFoundBackButton />
        </div>
      </nav>
    </main>
  );
}
