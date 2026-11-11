import React from 'react';
import ReactDOMClient from 'react-dom/client';
import assert from 'node:assert/strict';

export function setupDomEnvironment() {
  const originalWindow = (globalThis as any).window;
  const originalDocument = (globalThis as any).document;

  const windowListeners = new Map<string, Set<Function>>();
  const docListeners = new Map<string, Set<Function>>();

  const bodyStyle: Record<string, string> = { overflow: 'unset' };
  const bodyChildren: any[] = [];

  class MockNode {
    nodeType: number;
    nodeName: string;
    tagName: string;
    parentNode: any = null;
    childNodes: any[] = [];
    style: Record<string, string> = {};
    attributes: Record<string, string> = {};
    classList = {
      add: () => undefined,
      remove: () => undefined,
      contains: () => false,
    };
    ownerDocument: any = null;

    constructor(nodeType = 1, nodeName = 'DIV') {
      this.nodeType = nodeType;
      this.nodeName = nodeName;
      this.tagName = nodeName;
      this.ownerDocument = (globalThis as any).document;
    }

    appendChild(child: any) {
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }

    removeChild(child: any) {
      const idx = this.childNodes.indexOf(child);
      if (idx !== -1) {
        this.childNodes.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }

    insertBefore(newNode: any, referenceNode: any) {
      newNode.parentNode = this;
      const idx = this.childNodes.indexOf(referenceNode);
      if (idx !== -1) this.childNodes.splice(idx, 0, newNode);
      else this.childNodes.push(newNode);
      return newNode;
    }

    setAttribute(k: string, v: string) {
      this.attributes[k] = String(v);
    }

    getAttribute(k: string) {
      return this.attributes[k] || null;
    }

    removeAttribute(k: string) {
      delete this.attributes[k];
    }

    contains(node: any) {
      let cur = node;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    }

    getBoundingClientRect() {
      return { top: 100, left: 100, bottom: 140, right: 250, width: 150, height: 40 };
    }
  }

  const mockDoc: any = {
    nodeType: 9,
    nodeName: '#document',
    documentElement: new MockNode(1, 'HTML'),
    body: Object.assign(new MockNode(1, 'BODY'), {
      style: new Proxy(bodyStyle, {
        set(target, prop: string, val: string) {
          target[prop] = val;
          return true;
        },
        get(target, prop: string) {
          return target[prop] ?? '';
        },
      }),
      childNodes: bodyChildren,
    }),
    createElement(tag: string) {
      return new MockNode(1, tag.toUpperCase());
    },
    createElementNS(_ns: string, tag: string) {
      return new MockNode(1, tag.toUpperCase());
    },
    createTextNode(text: string) {
      const node = new MockNode(3, '#text');
      (node as any).nodeValue = text;
      return node;
    },
    createComment(data: string) {
      const node = new MockNode(8, '#comment');
      (node as any).nodeValue = data;
      return node;
    },
    addEventListener(type: string, listener: Function) {
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: Function) {
      docListeners.get(type)?.delete(listener);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
  };

  const mockWin: any = {
    document: mockDoc,
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener(type: string, listener: Function) {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: Function) {
      windowListeners.get(type)?.delete(listener);
    },
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
    setTimeout: (fn: any, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: any) => clearTimeout(id),
  };

  (globalThis as any).window = mockWin;
  (globalThis as any).document = mockDoc;
  (globalThis as any).HTMLIFrameElement = class {};

  return {
    window: mockWin,
    document: mockDoc,
    bodyStyle,
    getWindowListenerCount: (type: string) => windowListeners.get(type)?.size ?? 0,
    getDocListenerCount: (type: string) => docListeners.get(type)?.size ?? 0,
    dispatchWindowEvent: (type: string, eventObj: any) => {
      const listeners = windowListeners.get(type);
      if (listeners) {
        for (const fn of Array.from(listeners)) {
          fn(eventObj);
        }
      }
    },
    dispatchDocEvent: (type: string, eventObj: any) => {
      const listeners = docListeners.get(type);
      if (listeners) {
        for (const fn of Array.from(listeners)) {
          fn(eventObj);
        }
      }
    },
    restore: () => {
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
    },
  };
}
