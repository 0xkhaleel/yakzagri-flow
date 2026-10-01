import { test, expect } from '@playwright/test';
import {
  breakpoints,
  getBreakpointName,
  getViewportForBreakpoint,
  isSupportedBreakpoint,
  screenshotFileName,
} from './visualUtils';

test.describe('visual utility helpers', () => {
  test('returns configured viewport dimensions', () => {
    expect(getViewportForBreakpoint('mobile')).toEqual(breakpoints.mobile);
    expect(getViewportForBreakpoint('desktop')).toEqual(breakpoints.desktop);
  });

  test('recognizes supported viewport dimensions', () => {
    expect(getBreakpointName(breakpoints.mobile.width, breakpoints.mobile.height)).toBe('mobile');
    expect(isSupportedBreakpoint(breakpoints.mobile.width, breakpoints.mobile.height)).toBe(true);
    expect(getBreakpointName(breakpoints.desktop.width, breakpoints.desktop.height)).toBe('desktop');
    expect(isSupportedBreakpoint(breakpoints.desktop.width, breakpoints.desktop.height)).toBe(true);
  });

  test('rejects unsupported viewport dimensions', () => {
    expect(getBreakpointName(800, 600)).toBe('unsupported');
    expect(isSupportedBreakpoint(800, 600)).toBe(false);
  });

  test('returns mobile for narrow widths', () => {
    expect(getBreakpointName(375)).toBe('mobile');
  });

  test('returns desktop for wide widths', () => {
    expect(getBreakpointName(1440)).toBe('desktop');
  });

  test('builds a screenshot filename with the correct suffix', () => {
    expect(screenshotFileName('landing-page', 375)).toBe('landing-page-mobile.png');
    expect(screenshotFileName('landing-page', 1440)).toBe('landing-page-desktop.png');
  });
});
