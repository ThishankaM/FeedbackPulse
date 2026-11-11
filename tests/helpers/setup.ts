import { createRequire } from 'node:module';
import path from 'node:path';
import React from 'react';
import '../../apps/web/src/lib/i18n.js';

(globalThis as any).React = React;

// In-memory localStorage polyfill for Node.js test environment
const memoryStore = new Map<string, string>();
const storagePolyfill = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, val: string) => { memoryStore.set(key, String(val)); },
  removeItem: (key: string) => { memoryStore.delete(key); },
  clear: () => { memoryStore.clear(); },
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  get length() { return memoryStore.size; },
};

try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storagePolyfill,
    configurable: true,
    writable: true,
  });
} catch {
  (globalThis as any).localStorage = storagePolyfill;
}

const require = createRequire(import.meta.url);
const Module = require('node:module');

// Intercept createPortal on both root and workspace react-dom
const patchCreatePortal = (pkgPath: string) => {
  try {
    const rd = require(pkgPath);
    rd.createPortal = (children: any) => children;
  } catch {
    // ignore
  }
};

patchCreatePortal('react-dom');
patchCreatePortal(path.resolve(process.cwd(), 'apps/web/node_modules/react-dom'));

// Ignore CSS and static asset imports in Node.js
const noop = () => ({});
Module._extensions['.css'] = noop;
Module._extensions['.svg'] = noop;
Module._extensions['.png'] = noop;
Module._extensions['.jpg'] = noop;
Module._extensions['.jpeg'] = noop;
