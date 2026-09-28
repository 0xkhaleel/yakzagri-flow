/**
 * Unit tests for the dialog focus-trap helpers (#51).
 *
 * `getTabbable` / `nextTrapTarget` are the decision layer behind GlobalSearch's
 * Tab containment, so they are tested directly against real DOM nodes.
 */

import { getTabbable, nextTrapTarget } from "@/lib/a11y/focusTrap";

function mount(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getTabbable", () => {
  it("returns focusable elements in document order", () => {
    const root = mount(`
      <input id="a" />
      <button id="b">b</button>
      <a id="c" href="/x">c</a>
      <select id="d"></select>
      <textarea id="e"></textarea>
    `);

    expect(getTabbable(root).map((el) => el.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("skips disabled controls", () => {
    const root = mount(`
      <button id="a" disabled>a</button>
      <input id="b" />
      <input id="c" disabled />
    `);

    expect(getTabbable(root).map((el) => el.id)).toEqual(["b"]);
  });

  it("skips elements removed from the tab order with tabindex=-1", () => {
    const root = mount(`
      <input id="a" />
      <button id="option-1" role="option" tabindex="-1">row</button>
      <button id="b">b</button>
    `);

    // combobox options are tracked with aria-activedescendant and must not be
    // reachable with Tab
    expect(getTabbable(root).map((el) => el.id)).toEqual(["a", "b"]);
  });

  it("skips aria-hidden and non-focusable elements", () => {
    const root = mount(`
      <input id="a" />
      <button id="hidden" aria-hidden="true">x</button>
      <div id="plain">not focusable</div>
      <div id="custom" tabindex="0">custom</div>
    `);

    expect(getTabbable(root).map((el) => el.id)).toEqual(["a", "custom"]);
  });

  it("returns an empty list when nothing inside is focusable", () => {
    const root = mount(`<p>text only</p>`);
    expect(getTabbable(root)).toEqual([]);
  });
});

describe("nextTrapTarget", () => {
  const html = `<input id="a" /><button id="b">b</button>`;

  it("returns null while Tab moves between elements inside the dialog", () => {
    const root = mount(html);
    const a = root.querySelector<HTMLElement>("#a")!;
    const b = root.querySelector<HTMLElement>("#b")!;

    // Tab and Shift+Tab from the first of two elements both stay in the dialog
    expect(nextTrapTarget(root, a, "forward")).toBeNull();
    expect(nextTrapTarget(root, b, "backward")).toBeNull();
  });

  it("wraps forward from the last element to the first", () => {
    const root = mount(html);
    const a = root.querySelector<HTMLElement>("#a")!;
    const b = root.querySelector<HTMLElement>("#b")!;

    expect(nextTrapTarget(root, b, "forward")).toBe(a);
  });

  it("wraps backward from the first element to the last", () => {
    const root = mount(html);
    const a = root.querySelector<HTMLElement>("#a")!;
    const b = root.querySelector<HTMLElement>("#b")!;

    expect(nextTrapTarget(root, a, "backward")).toBe(b);
  });

  it("pulls focus back in when it has escaped the dialog", () => {
    const root = mount(html);
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const a = root.querySelector<HTMLElement>("#a")!;
    const b = root.querySelector<HTMLElement>("#b")!;

    expect(nextTrapTarget(root, outside, "forward")).toBe(a);
    expect(nextTrapTarget(root, outside, "backward")).toBe(b);
  });

  it("pulls focus in when nothing is focused yet", () => {
    const root = mount(html);
    const a = root.querySelector<HTMLElement>("#a")!;
    const b = root.querySelector<HTMLElement>("#b")!;

    expect(nextTrapTarget(root, null, "forward")).toBe(a);
    expect(nextTrapTarget(root, null, "backward")).toBe(b);
  });

  it("returns null when the dialog has no tab stops", () => {
    const root = mount(`<p>text only</p>`);
    expect(nextTrapTarget(root, null, "forward")).toBeNull();
    expect(nextTrapTarget(root, null, "backward")).toBeNull();
  });

  it("cycles a single tab stop back to itself", () => {
    const root = mount(`<input id="only" />`);
    const only = root.querySelector<HTMLElement>("#only")!;

    expect(nextTrapTarget(root, only, "forward")).toBe(only);
    expect(nextTrapTarget(root, only, "backward")).toBe(only);
  });
});
