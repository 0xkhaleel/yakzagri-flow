/**
 * Focus-trap helpers for modal dialogs.
 *
 * A hand-rolled `role="dialog" aria-modal="true"` overlay does not keep
 * keyboard focus inside itself: Tab from the last control moves into the page
 * behind the overlay. These helpers decide which element should receive focus
 * so a caller can call `preventDefault()` and wrap the focus ring.
 *
 * They are deliberately pure/DOM-only so they can be unit tested and used from
 * any dialog implementation without pulling in a focus-trap dependency.
 */

/** Candidate elements for the tab ring: anything focusable by markup. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

/**
 * Every element inside `root` that participates in the tab order, in document
 * order. Elements that are disabled, `aria-hidden`, or explicitly removed from
 * the tab order (`tabindex="-1"` — used by combobox options that are tracked
 * with `aria-activedescendant`) are excluded.
 */
export function getTabbable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.tabIndex >= 0,
  );
}

export type TrapDirection = "forward" | "backward";

/**
 * Resolve the element that should receive focus when Tab (`forward`) or
 * Shift+Tab (`backward`) is pressed inside `root`.
 *
 * Returns `null` when the browser default already keeps focus inside the
 * dialog, so callers can simply do:
 *
 * ```ts
 * const target = nextTrapTarget(root, document.activeElement as HTMLElement, "forward");
 * if (target) {
 *   event.preventDefault();
 *   target.focus();
 * }
 * ```
 *
 * When focus has escaped the dialog (or nothing is focused yet) the requested
 * end of the ring is returned, which also pulls focus back in after a click on
 * a non-focusable part of the dialog.
 */
export function nextTrapTarget(
  root: HTMLElement,
  active: HTMLElement | null,
  direction: TrapDirection,
): HTMLElement | null {
  const tabbable = getTabbable(root);
  if (tabbable.length === 0) return null;

  const first = tabbable[0];
  const last = tabbable[tabbable.length - 1];

  if (!active || !root.contains(active)) {
    return direction === "forward" ? first : last;
  }

  if (direction === "forward") {
    return active === last ? first : null;
  }

  return active === first ? last : null;
}
