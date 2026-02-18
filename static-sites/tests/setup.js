import { vi } from 'vitest';

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    this.callback([{ isIntersecting: true, target }]);
  }

  unobserve() {}

  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  configurable: true,
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});
