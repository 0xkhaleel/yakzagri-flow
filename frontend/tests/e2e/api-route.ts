import type { Page, Route } from '@playwright/test';

const API_ORIGIN = 'http://localhost:4000';
const API_VERSION_PREFIX = process.env.NEXT_PUBLIC_API_VERSION_PREFIX || '/api/v1';

export function mockApiRoute(
  page: Page,
  path: string,
  handler: (route: Route) => Promise<void>,
) {
  const expectedPath = path.startsWith('/') ? path : `/${path}`;

  return page.route(
    (url) =>
      url.origin === API_ORIGIN &&
      (url.pathname === expectedPath || url.pathname === `${API_VERSION_PREFIX}${expectedPath}`),
    handler,
  );
}