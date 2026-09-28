"use client";

import { useRouter } from "next/navigation";

import { t as translateCopy } from "@/lib/i18n";

import { Button } from "@/components/ui/Button";

const HOME_HREF = "/";

/**
 * True once the user has navigated inside this tab, i.e. there is a page for
 * `router.back()` to return to. Split out so the fallback decision is testable
 * without stubbing `window.history`.
 */
export function hasPreviousPage(historyLength: number): boolean {
  return historyLength > 1;
}

/**
 * "Go back" affordance for the 404 page (#47).
 *
 * A visitor that typed the URL directly (or landed here from an external link)
 * has no history to pop, so the control falls back to the landing page rather
 * than doing nothing. Kept as a client component so `not-found.tsx` stays a
 * server component with its own heading semantics.
 */
export function NotFoundBackButton() {
  const router = useRouter();

  function handleGoBack() {
    if (hasPreviousPage(window.history.length)) {
      router.back();
      return;
    }
    router.push(HOME_HREF);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleGoBack}>
      {translateCopy("ui.go_back_f03e2d0")}
    </Button>
  );
}
