import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const passthroughPortal = (children: any) => children;

// Patch root react-dom
try {
  const rootRd = require('react-dom');
  Object.defineProperty(rootRd, 'createPortal', {
    get: () => passthroughPortal,
    set: () => undefined,
    configurable: true,
  });
} catch {}

// Patch apps/web/node_modules/react-dom
try {
  const webRdPath = path.resolve('apps/web/node_modules/react-dom');
  const webRd = require(webRdPath);
  Object.defineProperty(webRd, 'createPortal', {
    get: () => passthroughPortal,
    set: () => undefined,
    configurable: true,
  });
} catch {}
