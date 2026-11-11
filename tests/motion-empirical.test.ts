import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDuration,
  prefersReducedMotion,
  animateSidebarWidth,
  fadeLabels,
  scalePulse,
  spinIn,
  animateCounter,
  pulseVote,
  staggerCards,
  slideInDrawer,
  slideOutDrawer,
  modalEntrance,
  cardHoverEnter,
  cardHoverLeave,
} from '../apps/web/src/lib/motion.ts';
import {
  setupMotionEnvironment,
  createMockElement,
  type MockElement,
} from './helpers/motion-harness.ts';
import {
  loadAndParseStylesheets,
  assertTokenExists,
  assertGlassUtility,
  assertMediaQuery,
} from './helpers/token-parser.ts';

test('1. Duration clamping behavior in clampDuration()', async (t) => {
  await t.test('clamps values < 200ms to 200ms', () => {
    assert.equal(clampDuration(0), 200, '0ms must clamp to 200ms');
    assert.equal(clampDuration(1), 200, '1ms must clamp to 200ms');
    assert.equal(clampDuration(50), 200, '50ms must clamp to 200ms');
    assert.equal(clampDuration(100), 200, '100ms must clamp to 200ms');
    assert.equal(clampDuration(199), 200, '199ms must clamp to 200ms');
    assert.equal(clampDuration(199.99), 200, '199.99ms must clamp to 200ms');
    assert.equal(clampDuration(-1), 200, '-1ms must clamp to 200ms');
    assert.equal(clampDuration(-500), 200, '-500ms must clamp to 200ms');
  });

  await t.test('clamps values > 500ms to 500ms', () => {
    assert.equal(clampDuration(500.01), 500, '500.01ms must clamp to 500ms');
    assert.equal(clampDuration(501), 500, '501ms must clamp to 500ms');
    assert.equal(clampDuration(600), 500, '600ms must clamp to 500ms');
    assert.equal(clampDuration(1000), 500, '1000ms must clamp to 500ms');
    assert.equal(clampDuration(99999), 500, '99999ms must clamp to 500ms');
  });

  await t.test('preserves boundary and in-range values [200, 500]', () => {
    assert.equal(clampDuration(200), 200, '200ms boundary must be exactly 200ms');
    assert.equal(clampDuration(201), 201, '201ms must be 201ms');
    assert.equal(clampDuration(260), 260, '260ms default must be 260ms');
    assert.equal(clampDuration(300), 300, '300ms must be 300ms');
    assert.equal(clampDuration(350), 350, '350ms must be 350ms');
    assert.equal(clampDuration(400), 400, '400ms must be 400ms');
    assert.equal(clampDuration(499), 499, '499ms must be 499ms');
    assert.equal(clampDuration(500), 500, '500ms boundary must be exactly 500ms');
  });
});

test('2. prefersReducedMotion() behavior & synchronous bypass', async (t) => {
  await t.test('detects active system preference', () => {
    const env = setupMotionEnvironment({ reducedMotion: true });
    try {
      assert.equal(prefersReducedMotion(), true, 'Must return true when reduced-motion matches');
    } finally {
      env.restore();
    }
  });

  await t.test('detects inactive system preference', () => {
    const env = setupMotionEnvironment({ reducedMotion: false });
    try {
      assert.equal(prefersReducedMotion(), false, 'Must return false when reduced-motion does not match');
    } finally {
      env.restore();
    }
  });

  await t.test('safe when window is undefined (SSR mode)', () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      assert.equal(prefersReducedMotion(), false, 'Must return false safely during SSR');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await t.test('safe when window.matchMedia is undefined (headless runner)', () => {
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {};
      assert.equal(prefersReducedMotion(), false, 'Must return false safely if matchMedia is missing');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await t.test('synchronously completes animateSidebarWidth without animation hanging', () => {
    const env = setupMotionEnvironment({ reducedMotion: true });
    try {
      const mockEl = createMockElement(256);
      let completed = false;

      animateSidebarWidth(mockEl as any, true, () => {
        completed = true;
      });

      assert.equal(completed, true, 'onComplete must be called synchronously');
      assert.equal(mockEl.style.width, '72px', 'Element style width must be set immediately to 72px');

      completed = false;
      animateSidebarWidth(mockEl as any, false, () => {
        completed = true;
      });
      assert.equal(completed, true, 'onComplete must be called synchronously on expand');
      assert.equal(mockEl.style.width, '256px', 'Element style width must be set immediately to 256px');
    } finally {
      env.restore();
    }
  });

  await t.test('synchronously completes fadeLabels without animation hanging', () => {
    const env = setupMotionEnvironment({ reducedMotion: true });
    try {
      const el1 = createMockElement();
      const el2 = createMockElement();
      let completed = false;

      fadeLabels([el1, el2] as any, false, () => {
        completed = true;
      });

      assert.equal(completed, true, 'fadeLabels onComplete must be synchronous');
      assert.equal(el1.style.opacity, '0');
      assert.equal(el1.style.transform, 'none');
      assert.equal(el2.style.opacity, '0');

      completed = false;
      fadeLabels([el1, el2] as any, true, () => {
        completed = true;
      });
      assert.equal(completed, true, 'fadeLabels onComplete must be synchronous on visible=true');
      assert.equal(el1.style.opacity, '1');
      assert.equal(el1.style.transform, 'none');
    } finally {
      env.restore();
    }
  });

  await t.test('synchronously completes slideOutDrawer without animation hanging', () => {
    const env = setupMotionEnvironment({ reducedMotion: true });
    try {
      const el = createMockElement();
      let completed = false;

      slideOutDrawer(el as any, () => {
        completed = true;
      });

      assert.equal(completed, true, 'slideOutDrawer onComplete must be synchronous under reduced motion');
      assert.equal(el.style.transform, 'translateX(100.5%)');
    } finally {
      env.restore();
    }
  });

  await t.test('immediately applies final DOM state for animateCounter under reduced motion', () => {
    const env = setupMotionEnvironment({ reducedMotion: true });
    try {
      const el = createMockElement();
      animateCounter(el as any, 100);
      assert.equal(el.innerText, '100', 'Counter value must update synchronously to 100');

      animateCounter(el as any, 50, '$', '/mo');
      assert.equal(el.innerText, '$50/mo', 'Counter with prefix and suffix must update synchronously');

      animateCounter(el as any, 0, 42, 300, (v) => `#${v}`);
      assert.equal(el.innerText, '#42', 'Counter with custom formatter must update synchronously');
    } finally {
      env.restore();
    }
  });

  await t.test('immediately sets transform and opacity for slideInDrawer and modalEntrance under reduced motion', () => {
    const env = setupMotionEnvironment({ reducedMotion: true });
    try {
      const drawerEl = createMockElement();
      slideInDrawer(drawerEl as any);
      assert.equal(drawerEl.style.transform, 'translateX(0%)');
      assert.equal(drawerEl.style.opacity, '1');

      const modalEl = createMockElement();
      modalEntrance(modalEl as any);
      assert.equal(modalEl.style.opacity, '1');
      assert.equal(modalEl.style.transform, 'none');
    } finally {
      env.restore();
    }
  });
});

test('3. Missing optional arguments safety across all 12 motion helpers', async (t) => {
  const env = setupMotionEnvironment({ reducedMotion: false });

  try {
    const el = createMockElement();

    await t.test('Helper 1: animateSidebarWidth with missing arguments and null element', () => {
      assert.doesNotThrow(() => animateSidebarWidth(el as any, true));
      assert.doesNotThrow(() => animateSidebarWidth(el as any, false));
      assert.doesNotThrow(() => animateSidebarWidth(el as any, 200));
      assert.doesNotThrow(() => animateSidebarWidth(null, true));
      let called = false;
      assert.doesNotThrow(() => animateSidebarWidth(null, true, () => { called = true; }));
      assert.equal(called, true, 'null element must synchronously call onComplete');
    });

    await t.test('Helper 2: fadeLabels with missing onComplete, empty array, and null', () => {
      assert.doesNotThrow(() => fadeLabels([el] as any, true));
      assert.doesNotThrow(() => fadeLabels([el] as any, false));
      assert.doesNotThrow(() => fadeLabels([], true));
      assert.doesNotThrow(() => fadeLabels(null, true));
      let called = false;
      assert.doesNotThrow(() => fadeLabels(null, true, () => { called = true; }));
      assert.equal(called, true, 'null elements must synchronously call onComplete');
    });

    await t.test('Helper 3: scalePulse with missing duration and null element', () => {
      assert.doesNotThrow(() => scalePulse(el as any));
      assert.doesNotThrow(() => scalePulse(null));
      assert.doesNotThrow(() => scalePulse(el as any, undefined));
    });

    await t.test('Helper 4: spinIn with missing duration and null element', () => {
      assert.doesNotThrow(() => spinIn(el as any));
      assert.doesNotThrow(() => spinIn(null));
      assert.doesNotThrow(() => spinIn(el as any, undefined));
    });

    await t.test('Helper 5: animateCounter with missing optional parameters and null element', () => {
      assert.doesNotThrow(() => animateCounter(el as any, 100));
      assert.doesNotThrow(() => animateCounter(null, 100));
      assert.doesNotThrow(() => animateCounter(el as any, 0, 100));
      assert.doesNotThrow(() => animateCounter(el as any, 100, undefined, undefined));
    });

    await t.test('Helper 6: pulseVote with missing duration and null element', () => {
      assert.doesNotThrow(() => pulseVote(el as any));
      assert.doesNotThrow(() => pulseVote(null));
      assert.doesNotThrow(() => pulseVote(el as any, undefined));
    });

    await t.test('Helper 7: staggerCards with missing selector, empty arrays, and string query', () => {
      assert.doesNotThrow(() => staggerCards([el] as any));
      assert.doesNotThrow(() => staggerCards([]));
      assert.doesNotThrow(() => staggerCards('.non-existent-selector'));
      assert.doesNotThrow(() => staggerCards('.non-existent-selector', '.item'));
    });

    await t.test('Helper 8: slideInDrawer with missing duration and null element', () => {
      assert.doesNotThrow(() => slideInDrawer(el as any));
      assert.doesNotThrow(() => slideInDrawer(null));
      assert.doesNotThrow(() => slideInDrawer(el as any, undefined));
    });

    await t.test('Helper 9: slideOutDrawer with missing onComplete, missing duration, and null element', () => {
      assert.doesNotThrow(() => slideOutDrawer(el as any));
      assert.doesNotThrow(() => slideOutDrawer(null));
      let called = false;
      assert.doesNotThrow(() => slideOutDrawer(null, () => { called = true; }));
      assert.equal(called, true, 'null element must synchronously invoke onComplete');
    });

    await t.test('Helper 10: modalEntrance with missing duration and null element', () => {
      assert.doesNotThrow(() => modalEntrance(el as any));
      assert.doesNotThrow(() => modalEntrance(null));
      assert.doesNotThrow(() => modalEntrance(el as any, undefined));
    });

    await t.test('Helper 11: cardHoverEnter with missing duration and null element', () => {
      assert.doesNotThrow(() => cardHoverEnter(el as any));
      assert.doesNotThrow(() => cardHoverEnter(null));
      assert.doesNotThrow(() => cardHoverEnter(el as any, undefined));
    });

    await t.test('Helper 12: cardHoverLeave with missing duration and null element', () => {
      assert.doesNotThrow(() => cardHoverLeave(el as any));
      assert.doesNotThrow(() => cardHoverLeave(null));
      assert.doesNotThrow(() => cardHoverLeave(el as any, undefined));
    });
  } finally {
    env.restore();
  }
});

test('4. CSS Theme Tokens and Glassmorphic Utilities in apps/web/src/index.css', async (t) => {
  const { indexCss, rootTokens, darkTokens } = loadAndParseStylesheets();

  await t.test('contains all 20 required semantic custom properties in :root', () => {
    const requiredTokens = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring',
      '--radius',
    ];

    for (const token of requiredTokens) {
      assertTokenExists(rootTokens, token);
    }

    assert.equal(rootTokens['--radius'], '0.625rem', '--radius must be 0.625rem');
  });

  await t.test('contains all 20 required semantic custom properties in .dark', () => {
    const requiredTokens = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring',
      '--radius',
    ];

    for (const token of requiredTokens) {
      assertTokenExists(darkTokens, token);
    }
  });

  await t.test('defines all 5 standard glassmorphism utilities with backdrop-filter', () => {
    assertGlassUtility(indexCss, 'glass-panel');
    assertGlassUtility(indexCss, 'glass-card');
    assertGlassUtility(indexCss, 'glass-header');
    assertGlassUtility(indexCss, 'glass-input');
    assert.ok(indexCss.includes('@utility glass-border'), 'Must define @utility glass-border');
  });

  await t.test('respects prefers-reduced-motion in CSS', () => {
    assertMediaQuery(indexCss, 'prefers-reduced-motion: reduce');
    assert.ok(
      indexCss.includes('.glass-card') && indexCss.includes('transition: none !important'),
      'Must disable glass-card transitions under prefers-reduced-motion'
    );
  });
});
