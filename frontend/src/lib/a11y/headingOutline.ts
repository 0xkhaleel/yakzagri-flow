/**
 * Heading-outline utilities.
 *
 * A well-formed document keeps a single `<h1>` per page and never skips a
 * level while descending (an `<h3>` that follows an `<h1>` with no `<h2>` in
 * between). These helpers are pure so they can validate both rendered trees
 * (via the level list extracted from the DOM) and source files (via a static
 * scan) in the same test suite.
 */

export interface HeadingLevelSkip {
  /** Level of the heading the outline descended from. */
  from: number;
  /** Level of the heading that skipped one or more levels. */
  to: number;
}

/**
 * Extract heading levels from raw source text in source order.
 *
 * Only JSX opening tags (`<h1 …>`, `<h2>`, …) are matched — the level must be
 * followed by whitespace or `>`/`/`, so closing tags, `<hr>`/`<html>` and
 * mention of a tag inside prose are not counted.
 */
export function extractHeadingLevels(source: string): number[] {
  const levels: number[] = [];
  const headingTag = /<h([1-6])(?=[\s/>])/g;
  let match: RegExpExecArray | null;
  while ((match = headingTag.exec(source)) !== null) {
    levels.push(Number(match[1]));
  }
  return levels;
}

/** Count `<h1>` elements declared in a source string. */
export function countH1Elements(source: string): number {
  const matches = source.match(/<h1(?=[\s/>])/g);
  return matches ? matches.length : 0;
}

/**
 * Return every point where the outline descends by more than one level, e.g.
 * `[1, 3]` yields `[{ from: 1, to: 3 }]`. Ascending jumps are not skips: going
 * back up from `<h3>` to `<h2>` is valid.
 */
export function findHeadingLevelSkips(levels: number[]): HeadingLevelSkip[] {
  const skips: HeadingLevelSkip[] = [];
  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1];
    const current = levels[index];
    if (current > previous + 1) {
      skips.push({ from: previous, to: current });
    }
  }
  return skips;
}

/** Heading levels of an element collection, in document order. */
export function headingLevelsOfElements(
  elements: ArrayLike<Element>,
): number[] {
  return Array.from(elements).map((element) =>
    Number(element.tagName.slice(1)),
  );
}

/**
 * Levels that are missing from a declared outline that starts at `<h1>`.
 *
 * A page that declares an `<h1>` and an `<h3>` but no `<h2>` has a gap, which
 * means the rendered outline must either skip a level or borrow an `<h2>` from
 * a shared component. Files that never declare an `<h1>` (their title comes
 * from the app shell or a shared fallback component) are exempt.
 */
export function findMissingHeadingLevels(levels: number[]): number[] {
  const declared = new Set(levels);
  if (declared.size === 0 || !declared.has(1)) {
    return [];
  }

  const missing: number[] = [];
  for (let level = 1; level <= Math.max(...levels); level += 1) {
    if (!declared.has(level)) {
      missing.push(level);
    }
  }
  return missing;
}
