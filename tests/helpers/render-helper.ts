import React from 'react';
import ReactDOM from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';

export interface RenderResult {
  html: string;
  contains: (sub: string) => boolean;
  hasText: (text: string) => boolean;
  hasElement: (tag: string, attrs?: Record<string, string | RegExp>) => boolean;
  hasClass: (className: string) => boolean;
  hasRole: (role: string) => boolean;
  assertContains: (sub: string) => void;
  assertHasClass: (className: string) => void;
  assertHasRole: (role: string) => void;
  assertAria: (attr: string, expectedVal?: string) => void;
}

export function render(element: React.ReactElement): RenderResult {
  const origDoc = (globalThis as any).document;
  const origWin = (globalThis as any).window;
  const origCreatePortal = (ReactDOM as any).createPortal;

  try {
    (ReactDOM as any).createPortal = (children: any) => children;
    (globalThis as any).document = {
      body: {
        nodeType: 1,
        style: {},
        appendChild: () => undefined,
        removeChild: () => undefined,
      },
      documentElement: {
        nodeType: 1,
        classList: {
          add: () => undefined,
          remove: () => undefined,
          contains: () => false,
        },
        style: {},
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
    };

    (globalThis as any).window = {
      localStorage: (globalThis as any).localStorage,
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      setTimeout: (fn: any) => setTimeout(fn, 0),
      clearTimeout: (id: any) => clearTimeout(id),
      location: { assign: () => undefined },
    };

    const html = renderToStaticMarkup(element);
    return createResult(html);
  } finally {
    (ReactDOM as any).createPortal = origCreatePortal;
    if (origDoc === undefined) {
      delete (globalThis as any).document;
    } else {
      (globalThis as any).document = origDoc;
    }
    if (origWin === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = origWin;
    }
  }
}

function createResult(html: string): RenderResult {
  return {
    html,
    contains(sub: string) {
      return html.includes(sub);
    },
    hasText(text: string) {
      const clean = html.replace(/<[^>]*>/g, ' ');
      return clean.includes(text);
    },
    hasElement(tag: string, attrs?: Record<string, string | RegExp>) {
      const tagPattern = new RegExp(`<${tag}[^>]*>`, 'i');
      if (!tagPattern.test(html)) return false;
      if (!attrs) return true;

      for (const [attr, val] of Object.entries(attrs)) {
        if (typeof val === 'string') {
          const attrPattern = new RegExp(`${attr}=["'][^"']*${escapeRegExp(val)}[^"']*["']`, 'i');
          if (!attrPattern.test(html)) return false;
        } else {
          const attrMatch = html.match(new RegExp(`${attr}=["']([^"']*)["']`, 'i'));
          if (!attrMatch || !val.test(attrMatch[1])) return false;
        }
      }
      return true;
    },
    hasClass(className: string) {
      const classPattern = new RegExp(`class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["']`, 'i');
      return classPattern.test(html);
    },
    hasRole(role: string) {
      const rolePattern = new RegExp(`role=["']${escapeRegExp(role)}["']`, 'i');
      return rolePattern.test(html);
    },
    assertContains(sub: string) {
      assert.ok(html.includes(sub), `Expected markup to contain: "${sub}"\nGot: ${html.slice(0, 300)}...`);
    },
    assertHasClass(className: string) {
      const found = this.hasClass(className);
      assert.ok(found, `Expected element to have class: "${className}"\nGot: ${html.slice(0, 300)}...`);
    },
    assertHasRole(role: string) {
      const found = this.hasRole(role);
      assert.ok(found, `Expected element to have role: "${role}"\nGot: ${html.slice(0, 300)}...`);
    },
    assertAria(attr: string, expectedVal?: string) {
      if (expectedVal !== undefined) {
        const pattern = new RegExp(`aria-${escapeRegExp(attr)}=["']${escapeRegExp(expectedVal)}["']`, 'i');
        assert.ok(pattern.test(html), `Expected aria-${attr}="${expectedVal}" in markup`);
      } else {
        const pattern = new RegExp(`aria-${escapeRegExp(attr)}=`, 'i');
        assert.ok(pattern.test(html), `Expected aria-${attr} to exist in markup`);
      }
    },
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
