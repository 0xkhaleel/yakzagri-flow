// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
}

if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = jest.fn(() => 'blob:mock');
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = jest.fn();
}

if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic polyfill for jsdom
  const util = require('util');
  globalThis.TextEncoder = util.TextEncoder;
  globalThis.TextDecoder = util.TextDecoder;
}

if (typeof global.ReadableStream === 'undefined') {
  try {
    const { ReadableStream } = require('stream/web');
    global.ReadableStream = ReadableStream;
  } catch {}
}

if (typeof globalThis.fetch === 'undefined' && typeof fetch === 'function') {
  globalThis.fetch = fetch;
}
if (typeof global.fetch === 'undefined' && typeof globalThis.fetch === 'function') {
  global.fetch = globalThis.fetch;
}

if (typeof globalThis.Response === 'undefined' && typeof Response !== 'undefined') {
  globalThis.Response = Response;
}
if (typeof globalThis.Request === 'undefined' && typeof Request !== 'undefined') {
  globalThis.Request = Request;
}
if (typeof globalThis.Headers === 'undefined' && typeof Headers !== 'undefined') {
  globalThis.Headers = Headers;
}

