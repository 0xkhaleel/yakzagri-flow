import Link from "next/link";
import { t as translateCopy } from "@/lib/i18n";

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
 * `AppShell` already renders the document's main landmark
 * (`src/components/layout/AppShell.tsx`) and the root layout wraps every route
 * in it (`src/app/layout.tsx`), so this page must NOT add a second one: nested
 * main elements are invalid HTML and an axe landmark violation. The fallback is
 * therefore a labelled `<section aria-labelledby>` — exposed as a `region`
 * landmark named by its heading — which owns the 404 status and a labelled
 * recovery `<nav>` back to a known-good page.
 */

const LINK_BASE =
  "inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2";
const PRIMARY_LINK = `${LINK_BASE} bg-gold text-text-inverse hover:bg-gold-hover`;
const SECONDARY_LINK = `${LINK_BASE} border border-border-default bg-bg-elevated text-text-primary hover:border-border-hover`;

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-sm text-gold">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-text-primary">{translateCopy("ui.not_found_title")}</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        {translateCopy("ui.not_found_description")}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link href="/dashboard" className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-text-inverse hover:bg-gold-hover">
          {translateCopy("ui.dashboard_d87f47b")}
        </Link>
        <Link href="/trades" className="rounded-md border border-border-default px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated">
          {translateCopy("ui.trades_597b109")}
        </Link>
      </div>
    </section>
  );
}
