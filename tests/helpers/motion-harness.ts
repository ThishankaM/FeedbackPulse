import assert from 'node:assert/strict';

export interface MockElement {
  nodeType: number;
  style: Record<string, string>;
  innerText: string;
  textContent: string;
  classList: {
    add: (cls: string) => void;
    remove: (cls: string) => void;
    contains: (cls: string) => boolean;
  };
  getBoundingClientRect: () => { width: number; height: number; top: number; left: number };
  setAttribute: (key: string, val: string) => void;
  getAttribute: (key: string) => string | null;
}

export function createMockElement(initialWidth = 256): MockElement {
  const styleObj: Record<string, string> = { width: `${initialWidth}px` };
  const classes = new Set<string>();

  return {
    nodeType: 1,
    style: new Proxy(styleObj, {
      set(target, prop: string, value: string) {
        target[prop] = value;
        return true;
      },
      get(target, prop: string) {
        return target[prop] || '';
      },
    }),
    innerText: '',
    textContent: '',
    classList: {
      add: (cls: string) => classes.add(cls),
      remove: (cls: string) => classes.delete(cls),
      contains: (cls: string) => classes.has(cls),
    },
    getBoundingClientRect: () => ({
      width: parseFloat(styleObj.width) || initialWidth,
      height: 40,
      top: 0,
      left: 0,
    }),
    setAttribute: () => undefined,
    getAttribute: () => null,
  };
}

export function setupMotionEnvironment(options: { reducedMotion?: boolean } = {}) {
  const originalWindow = (globalThis as any).window;
  const originalDocument = (globalThis as any).document;

  if (typeof (globalThis as any).NodeList === 'undefined') {
    (globalThis as any).NodeList = class NodeList extends Array {};
  }
  if (typeof (globalThis as any).HTMLCollection === 'undefined') {
    (globalThis as any).HTMLCollection = class HTMLCollection extends Array {};
  }
  if (typeof (globalThis as any).Element === 'undefined') {
    (globalThis as any).Element = class Element {};
  }
  if (typeof (globalThis as any).HTMLElement === 'undefined') {
    (globalThis as any).HTMLElement = class HTMLElement extends (globalThis as any).Element {};
  }
  if (typeof (globalThis as any).SVGElement === 'undefined') {
    (globalThis as any).SVGElement = class SVGElement extends (globalThis as any).Element {};
  }

  const mockWindow: any = {
    matchMedia: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? !!options.reducedMotion : false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 16) as any,
    cancelAnimationFrame: (id: any) => clearTimeout(id),
  };

  const mockDocument: any = {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    querySelectorAll: () => [],
    querySelector: () => null,
    documentElement: {
      classList: {
        add: () => undefined,
        remove: () => undefined,
        contains: () => false,
      },
    },
    body: {
      style: {},
    },
  };

  (globalThis as any).window = mockWindow;
  (globalThis as any).document = mockDocument;
  (globalThis as any).requestAnimationFrame = mockWindow.requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = mockWindow.cancelAnimationFrame;

  return {
    restore: () => {
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
      delete (globalThis as any).requestAnimationFrame;
      delete (globalThis as any).cancelAnimationFrame;
    },
    setReducedMotion: (active: boolean) => {
      mockWindow.matchMedia = (query: string) => ({
        matches: query.includes('prefers-reduced-motion') ? active : false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      });
    },
  };
}

export function assertDurationBound(duration: number) {
  assert.ok(
    duration >= 200 && duration <= 500,
    `Duration ${duration}ms violated R2 requirement (must be strictly 200ms - 500ms)`
  );
}
