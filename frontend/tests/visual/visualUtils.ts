export const breakpoints = {
  mobile: { width: 375, height: 667 },
  desktop: { width: 1440, height: 900 },
} as const;

export type BreakpointName = keyof typeof breakpoints;

export function getViewportForBreakpoint(breakpoint: BreakpointName) {
  return breakpoints[breakpoint];
}

export function getBreakpointName(
  width: number,
  height?: number,
): BreakpointName | "unsupported" {
  if (height === undefined) {
    return width <= 768 ? "mobile" : "desktop";
  }

  for (const [name, size] of Object.entries(breakpoints)) {
    if (size.width === width && size.height === height) {
      return name as BreakpointName;
    }
  }

  return "unsupported";
}

export function isSupportedBreakpoint(width: number, height: number): boolean {
  return getBreakpointName(width, height) !== "unsupported";
}

export function screenshotFileName(baseName: string, width: number): string {
  return `${baseName}-${getBreakpointName(width)}.png`;
}
