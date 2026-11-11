import test from 'node:test';
import assert from 'node:assert/strict';
import { globals, JSAnimation } from 'animejs';
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
} from './helpers/motion-harness.ts';
import {
  loadAndParseStylesheets,
  assertTokenExists,
  assertGlassUtility,
} from './helpers/token-parser.ts';

// Hook into Anime.js v4 via globals.editor
let lastAnimateCall: { targets: any; parameters: any } | null = null;
let animateCallCount = 0;

globals.editor = {
  addAnimation: (targets: any, parameters: any) => {
    lastAnimateCall = { targets, parameters };
    animateCallCount++;
    return new JSAnimation(targets, parameters, null, 0, false).init();
  },
} as any;

test('CHALLENGE SUITE 1: Duration Clamping & Boundary Precision', async (t) => {
  await t.test('Boundary values (0, 199, 200, 500, 501, 1000)', () => {
    assert.equal(clampDuration(0), 200, '0ms must clamp to 200ms');
    assert.equal(clampDuration(199), 200, '199ms must clamp to 200ms');
    assert.equal(clampDuration(200), 200, '200ms is exactly on the lower boundary');
    assert.equal(clampDuration(500), 500, '500ms is exactly on the upper boundary');
    assert.equal(clampDuration(501), 500, '501ms must clamp to 500ms');
    assert.equal(clampDuration(1000), 500, '1000ms must clamp to 500ms');
  });

  await t.test('Sub-millisecond float boundaries (199.999, 200.001, 499.999, 500.001)', () => {
    assert.equal(clampDuration(199.999), 200, '199.999ms must clamp to 200ms');
    assert.equal(clampDuration(200.001), 200.001, '200.001ms must be preserved');
    assert.equal(clampDuration(499.999), 499.999, '499.999ms must be preserved');
    assert.equal(clampDuration(500.001), 500, '500.001ms must clamp to 500ms');
  });

  await t.test('Extreme negative numbers, zero, and infinite values', () => {
    assert.equal(clampDuration(-0), 200, '-0 must clamp to 200ms');
    assert.equal(clampDuration(-1), 200, '-1 must clamp to 200ms');
    assert.equal(clampDuration(-999999), 200, '-999999 must clamp to 200ms');
    assert.equal(clampDuration(-Infinity), 200, '-Infinity must clamp to 200ms');
    assert.equal(clampDuration(Infinity), 500, '+Infinity must clamp to 500ms');
  });

  await t.test('Non-number resilience (NaN)', () => {
    // Math.min(Math.max(NaN, 200), 500) results in NaN
    const res = clampDuration(NaN);
    assert.ok(Number.isNaN(res), 'clampDuration(NaN) evaluates to NaN as expected per IEEE-754');
  });
});

test('CHALLENGE SUITE 2: Duration Clamping Across All 12 Helpers Under Normal Motion', async (t) => {
  const env = setupMotionEnvironment({ reducedMotion: false });

  try {
    const el = createMockElement();

    // 1. animateSidebarWidth
    lastAnimateCall = null;
    animateSidebarWidth(el as any, true, 50); // <200
    assert.ok(lastAnimateCall, 'animate must have been called for animateSidebarWidth');
    assert.equal(lastAnimateCall.parameters.duration, 200, 'animateSidebarWidth(50) duration clamped to 200');

    lastAnimateCall = null;
    animateSidebarWidth(el as any, true, 1000); // >500
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'animateSidebarWidth(1000) duration clamped to 500');

    lastAnimateCall = null;
    animateSidebarWidth(el as any, true); // default
    assert.equal(lastAnimateCall?.parameters.duration, 260, 'animateSidebarWidth default duration is 260 (in [200, 500])');

    // 2. fadeLabels
    lastAnimateCall = null;
    fadeLabels([el] as any, true);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'fadeLabels duration is 200 (in [200, 500])');

    // 3. scalePulse
    lastAnimateCall = null;
    scalePulse(el as any, 10);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'scalePulse(10) duration clamped to 200');
    scalePulse(el as any, 900);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'scalePulse(900) duration clamped to 500');
    scalePulse(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 220, 'scalePulse default duration is 220 (in [200, 500])');

    // 4. spinIn
    lastAnimateCall = null;
    spinIn(el as any, 10);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'spinIn(10) duration clamped to 200');
    spinIn(el as any, 800);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'spinIn(800) duration clamped to 500');
    spinIn(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 260, 'spinIn default duration is 260 (in [200, 500])');

    // 5. animateCounter
    lastAnimateCall = null;
    animateCounter(el as any, 100, undefined, undefined, 50); // duration 50
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'animateCounter(50) duration clamped to 200');
    animateCounter(el as any, 100, undefined, undefined, 800); // duration 800
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'animateCounter(800) duration clamped to 500');
    animateCounter(el as any, 100); // default
    assert.equal(lastAnimateCall?.parameters.duration, 400, 'animateCounter default duration is 400 (in [200, 500])');

    // 6. pulseVote
    lastAnimateCall = null;
    pulseVote(el as any, 50);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'pulseVote(50) duration clamped to 200');
    pulseVote(el as any, 700);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'pulseVote(700) duration clamped to 500');
    pulseVote(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 300, 'pulseVote default duration is 300 (in [200, 500])');

    // 7. staggerCards
    lastAnimateCall = null;
    staggerCards([el] as any, undefined, 80);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'staggerCards(80) duration clamped to 200');
    staggerCards([el] as any, undefined, 650);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'staggerCards(650) duration clamped to 500');
    staggerCards([el] as any);
    assert.equal(lastAnimateCall?.parameters.duration, 350, 'staggerCards default duration is 350 (in [200, 500])');

    // 8. slideInDrawer
    lastAnimateCall = null;
    slideInDrawer(el as any, 50);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'slideInDrawer(50) duration clamped to 200');
    slideInDrawer(el as any, 999);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'slideInDrawer(999) duration clamped to 500');
    slideInDrawer(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 280, 'slideInDrawer default duration is 280 (in [200, 500])');

    // 9. slideOutDrawer
    lastAnimateCall = null;
    slideOutDrawer(el as any, undefined, 50);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'slideOutDrawer(50) duration clamped to 200');
    slideOutDrawer(el as any, undefined, 999);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'slideOutDrawer(999) duration clamped to 500');
    slideOutDrawer(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 240, 'slideOutDrawer default duration is 240 (in [200, 500])');

    // 10. modalEntrance
    lastAnimateCall = null;
    modalEntrance(el as any, 50);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'modalEntrance(50) duration clamped to 200');
    modalEntrance(el as any, 850);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'modalEntrance(850) duration clamped to 500');
    modalEntrance(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 250, 'modalEntrance default duration is 250 (in [200, 500])');

    // 11. cardHoverEnter
    lastAnimateCall = null;
    cardHoverEnter(el as any, 50);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'cardHoverEnter(50) duration clamped to 200');
    cardHoverEnter(el as any, 850);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'cardHoverEnter(850) duration clamped to 500');
    cardHoverEnter(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'cardHoverEnter default duration is 200 (in [200, 500])');

    // 12. cardHoverLeave
    lastAnimateCall = null;
    cardHoverLeave(el as any, 50);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'cardHoverLeave(50) duration clamped to 200');
    cardHoverLeave(el as any, 850);
    assert.equal(lastAnimateCall?.parameters.duration, 500, 'cardHoverLeave(850) duration clamped to 500');
    cardHoverLeave(el as any);
    assert.equal(lastAnimateCall?.parameters.duration, 200, 'cardHoverLeave default duration is 200 (in [200, 500])');
  } finally {
    env.restore();
  }
});

test('CHALLENGE SUITE 3: prefersReducedMotion() Complete Bypass & Zero Hanging', async (t) => {
  const env = setupMotionEnvironment({ reducedMotion: true });

  try {
    const el = createMockElement();
    const callsBefore = animateCallCount;

    // Helper 1: animateSidebarWidth
    let h1Called = false;
    animateSidebarWidth(el as any, true, () => {
      h1Called = true;
    });
    assert.equal(h1Called, true, 'H1 onComplete called synchronously');
    assert.equal(el.style.width, '72px');

    // Helper 2: fadeLabels
    let h2Called = false;
    const label1 = createMockElement();
    fadeLabels([label1] as any, false, () => {
      h2Called = true;
    });
    assert.equal(h2Called, true, 'H2 onComplete called synchronously');
    assert.equal(label1.style.opacity, '0');
    assert.equal(label1.style.transform, 'none');

    // Helper 3: scalePulse
    scalePulse(el as any);

    // Helper 4: spinIn
    spinIn(el as any);

    // Helper 5: animateCounter
    animateCounter(el as any, 1234);
    assert.equal(el.innerText, '1,234');

    // Helper 6: pulseVote
    pulseVote(el as any);

    // Helper 7: staggerCards
    const cardEl = createMockElement();
    staggerCards([cardEl] as any);
    assert.equal(cardEl.style.opacity, '1');
    assert.equal(cardEl.style.transform, 'none');

    // Helper 8: slideInDrawer
    const drawerIn = createMockElement();
    slideInDrawer(drawerIn as any);
    assert.equal(drawerIn.style.transform, 'translateX(0%)');
    assert.equal(drawerIn.style.opacity, '1');

    // Helper 9: slideOutDrawer
    let h9Called = false;
    const drawerOut = createMockElement();
    slideOutDrawer(drawerOut as any, () => {
      h9Called = true;
    });
    assert.equal(h9Called, true, 'H9 onComplete called synchronously');
    assert.equal(drawerOut.style.transform, 'translateX(100.5%)');

    // Helper 10: modalEntrance
    const modalEl = createMockElement();
    modalEntrance(modalEl as any);
    assert.equal(modalEl.style.opacity, '1');
    assert.equal(modalEl.style.transform, 'none');

    // Helper 11: cardHoverEnter
    cardHoverEnter(el as any);

    // Helper 12: cardHoverLeave
    const hoverCard = createMockElement();
    cardHoverLeave(hoverCard as any);
    assert.equal(hoverCard.style.transform, 'none');

    // CRUCIAL: Verify ZERO Anime.js animate calls were made while reduced motion was active!
    const callsAfter = animateCallCount;
    assert.equal(
      callsAfter,
      callsBefore,
      'Anime.js animate() MUST NEVER be called when prefersReducedMotion() is active'
    );
  } finally {
    env.restore();
  }
});

test('CHALLENGE SUITE 4: Adversarial Null/Undefined/Malformed Edge Inputs across all 12 helpers', async (t) => {
  const env = setupMotionEnvironment({ reducedMotion: false });

  try {
    // 1. animateSidebarWidth
    assert.doesNotThrow(() => (animateSidebarWidth as any)());
    assert.doesNotThrow(() => animateSidebarWidth(null, false));
    assert.doesNotThrow(() => animateSidebarWidth(undefined as any, true));
    let h1NullCompleted = false;
    animateSidebarWidth(null, true, () => { h1NullCompleted = true; });
    assert.equal(h1NullCompleted, true, 'Null element must trigger onComplete synchronously');

    // 2. fadeLabels
    assert.doesNotThrow(() => (fadeLabels as any)());
    assert.doesNotThrow(() => fadeLabels(null, true));
    assert.doesNotThrow(() => fadeLabels([] as any, false));
    let h2NullCompleted = false;
    fadeLabels(null, false, () => { h2NullCompleted = true; });
    assert.equal(h2NullCompleted, true, 'Null elements must trigger onComplete synchronously');
    let h2EmptyCompleted = false;
    fadeLabels([], false, () => { h2EmptyCompleted = true; });
    assert.equal(h2EmptyCompleted, true, 'Empty elements must trigger onComplete synchronously');

    // 3. scalePulse
    assert.doesNotThrow(() => (scalePulse as any)());
    assert.doesNotThrow(() => scalePulse(null));
    assert.doesNotThrow(() => scalePulse(null, undefined));
    assert.doesNotThrow(() => scalePulse(null, -100));

    // 4. spinIn
    assert.doesNotThrow(() => (spinIn as any)());
    assert.doesNotThrow(() => spinIn(null));
    assert.doesNotThrow(() => spinIn(null, undefined));

    // 5. animateCounter
    assert.doesNotThrow(() => (animateCounter as any)());
    assert.doesNotThrow(() => animateCounter(null, 50));
    assert.doesNotThrow(() => animateCounter(null, 0, 100));
    assert.doesNotThrow(() => animateCounter(null, 50, undefined, undefined, undefined));

    // 6. pulseVote
    assert.doesNotThrow(() => (pulseVote as any)());
    assert.doesNotThrow(() => pulseVote(null));
    assert.doesNotThrow(() => pulseVote(null, undefined));

    // 7. staggerCards
    assert.doesNotThrow(() => (staggerCards as any)());
    assert.doesNotThrow(() => staggerCards([]));
    assert.doesNotThrow(() => staggerCards(null as any));
    assert.doesNotThrow(() => staggerCards('.non-existent-class', '.non-existent-item'));

    // 8. slideInDrawer
    assert.doesNotThrow(() => (slideInDrawer as any)());
    assert.doesNotThrow(() => slideInDrawer(null));
    assert.doesNotThrow(() => slideInDrawer(null, undefined));

    // 9. slideOutDrawer
    assert.doesNotThrow(() => (slideOutDrawer as any)());
    assert.doesNotThrow(() => slideOutDrawer(null));
    let h9NullCompleted = false;
    slideOutDrawer(null, () => { h9NullCompleted = true; });
    assert.equal(h9NullCompleted, true, 'Null element must trigger onComplete synchronously');

    // 10. modalEntrance
    assert.doesNotThrow(() => (modalEntrance as any)());
    assert.doesNotThrow(() => modalEntrance(null));
    assert.doesNotThrow(() => modalEntrance(null, undefined));

    // 11. cardHoverEnter
    assert.doesNotThrow(() => (cardHoverEnter as any)());
    assert.doesNotThrow(() => cardHoverEnter(null));
    assert.doesNotThrow(() => cardHoverEnter(null, undefined));

    // 12. cardHoverLeave
    assert.doesNotThrow(() => (cardHoverLeave as any)());
    assert.doesNotThrow(() => cardHoverLeave(null));
    assert.doesNotThrow(() => cardHoverLeave(null, undefined));
  } finally {
    env.restore();
  }
});

test('CHALLENGE SUITE 5: Full CSS Token & Glassmorphism Exhaustive Audit', async (t) => {
  const { indexCss, rootTokens, darkTokens } = loadAndParseStylesheets();

  const expectedTokens = [
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

  await t.test('All 20 semantic tokens in :root and .dark match specifications', () => {
    for (const t of expectedTokens) {
      assertTokenExists(rootTokens, t);
      assertTokenExists(darkTokens, t);
    }
    assert.equal(rootTokens['--radius'], '0.625rem');
    assert.equal(darkTokens['--radius'], '0.625rem');
  });

  await t.test('All 5 glass utilities present and properly defined', () => {
    assertGlassUtility(indexCss, 'glass-panel');
    assertGlassUtility(indexCss, 'glass-card');
    assertGlassUtility(indexCss, 'glass-header');
    assertGlassUtility(indexCss, 'glass-input');
    assert.ok(indexCss.includes('@utility glass-border'), 'Must define @utility glass-border');
    assert.ok(indexCss.includes('.dark .glass-panel'), 'Must define dark variant for glass-panel');
    assert.ok(indexCss.includes('.dark .glass-card'), 'Must define dark variant for glass-card');
    assert.ok(indexCss.includes('.dark .glass-header'), 'Must define dark variant for glass-header');
    assert.ok(indexCss.includes('.dark .glass-input'), 'Must define dark variant for glass-input');
  });
});
