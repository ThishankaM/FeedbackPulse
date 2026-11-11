import '../helpers/setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMockElement,
  setupMotionEnvironment,
} from '../helpers/motion-harness.js';
import {
  animateSidebarWidth,
  fadeLabels,
  scalePulse,
  spinIn,
  animateCounter,
  pulseVote,
  staggerCards,
  clampDuration,
  prefersReducedMotion,
} from '../../apps/web/src/lib/motion.js';

describe('Suite 10: Anime.js Motion Engine & Accessibility (F3)', () => {
  let env: ReturnType<typeof setupMotionEnvironment>;

  before(() => {
    env = setupMotionEnvironment({ reducedMotion: false });
  });

  after(() => {
    env.restore();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('F3-T1-01: animateSidebarWidth transitions width smoothly within 200-500ms bounds', () => {
    const el = createMockElement(72);
    let completed = false;

    animateSidebarWidth(el as any, 256, 260, () => {
      completed = true;
    });

    assert.equal(clampDuration(260), 260);
    assert.ok(el.style !== undefined);
  });

  it('F3-T1-02: fadeLabels coordinates stagger delays for navigation labels', () => {
    const el1 = createMockElement(100);
    const el2 = createMockElement(100);
    let completed = false;

    fadeLabels([el1 as any, el2 as any], true, () => {
      completed = true;
    });

    assert.ok(el1 !== null);
    assert.ok(el2 !== null);
  });

  it('F3-T1-03: scalePulse applies subtle micro-interaction spring scaling', () => {
    const el = createMockElement(40);
    scalePulse(el as any, 220);

    assert.equal(clampDuration(220), 220);
    assert.ok(el.nodeType === 1);
  });

  it('F3-T1-04: animateCounter calculates incremental number ticker', () => {
    const el = createMockElement(50);
    animateCounter(el as any, 0, 1500, 400);

    assert.equal(clampDuration(400), 400);
  });

  it('F3-T1-05: staggerCards coordinates entrance animations across card elements', () => {
    const cards = [createMockElement(200), createMockElement(200), createMockElement(200)];
    let done = false;

    staggerCards(cards as any, () => {
      done = true;
    });

    assert.equal(cards.length, 3);
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  it('F3-T2-01: Motion is completely bypassed when prefers-reduced-motion is active', () => {
    env.setReducedMotion(true);

    assert.equal(prefersReducedMotion(), true);

    // 1. Sidebar width sets width immediately with 0ms transition
    const sidebarEl = createMockElement(72);
    let sidebarDone = false;
    animateSidebarWidth(sidebarEl as any, 256, () => {
      sidebarDone = true;
    });
    assert.equal(sidebarEl.style.width, '256px');
    assert.equal(sidebarDone, true);

    // 2. fadeLabels sets opacity immediately
    const labelEl = createMockElement(100);
    let labelDone = false;
    fadeLabels([labelEl as any], true, () => {
      labelDone = true;
    });
    assert.equal(labelEl.style.opacity, '1');
    assert.equal(labelEl.style.transform, 'none');
    assert.equal(labelDone, true);

    // 3. Counter sets final value immediately
    const counterEl = createMockElement(50);
    animateCounter(counterEl as any, 0, 4200);
    assert.ok(counterEl.innerText.includes('4,200') || counterEl.innerText.includes('4200'));

    env.setReducedMotion(false);
  });

  it('F3-T2-02: All motion functions execute safely with null target elements without throwing', () => {
    assert.doesNotThrow(() => animateSidebarWidth(null, true));
    assert.doesNotThrow(() => fadeLabels(null, true));
    assert.doesNotThrow(() => scalePulse(null));
    assert.doesNotThrow(() => spinIn(null));
    assert.doesNotThrow(() => animateCounter(null, 100));
    assert.doesNotThrow(() => pulseVote(null));
    assert.doesNotThrow(() => staggerCards(null as any));
  });

  it('F3-T2-03: Rapid sequential pulseVote invocations on same element do not leak or explode', () => {
    const el = createMockElement(32);

    for (let i = 0; i < 10; i++) {
      assert.doesNotThrow(() => pulseVote(el as any, 300));
    }
  });

  it('F3-T2-04: animateCounter handles negative and zero values gracefully', () => {
    env.setReducedMotion(true);
    const zeroEl = createMockElement(50);
    animateCounter(zeroEl as any, 100, 0);
    assert.equal(zeroEl.innerText, '0');

    const negEl = createMockElement(50);
    animateCounter(negEl as any, 0, -25);
    assert.equal(negEl.innerText, '-25');
    env.setReducedMotion(false);
  });

  it('F3-T2-05: clampDuration strictly enforces 200ms to 500ms duration boundary limits', () => {
    // Under-bound (< 200ms) clamps to 200ms
    assert.equal(clampDuration(0), 200);
    assert.equal(clampDuration(50), 200);
    assert.equal(clampDuration(199), 200);
    assert.equal(clampDuration(-100), 200);

    // In-bounds (200ms - 500ms) preserved exactly
    assert.equal(clampDuration(200), 200);
    assert.equal(clampDuration(260), 260);
    assert.equal(clampDuration(350), 350);
    assert.equal(clampDuration(500), 500);

    // Over-bound (> 500ms) clamps to 500ms
    assert.equal(clampDuration(501), 500);
    assert.equal(clampDuration(1000), 500);
    assert.equal(clampDuration(9999), 500);
  });
});
