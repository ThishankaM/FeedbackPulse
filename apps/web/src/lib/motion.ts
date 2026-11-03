import { animate, stagger } from 'animejs';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animate an element's width between its current value and a target px value.
 * Used by the collapsible sidebar rail.
 */
export function animateSidebarWidth(element: Element | null, toPx: number, duration = 260) {
  if (!element) return;
  if (prefersReducedMotion()) {
    (element as HTMLElement).style.width = `${toPx}px`;
    return;
  }
  const from = (element as HTMLElement).getBoundingClientRect().width;
  animate(element, {
    width: [`${from}px`, `${toPx}px`],
    duration,
    ease: 'outCubic',
  });
}

/**
 * Fade sidebar labels in or out. On collapse, the callback unmounts the labels
 * after the fade completes.
 */
export function fadeLabels(elements: HTMLElement[], visible: boolean, onComplete?: () => void) {
  if (elements.length === 0) {
    onComplete?.();
    return;
  }
  if (prefersReducedMotion()) {
    elements.forEach((el) => {
      el.style.opacity = visible ? '1' : '0';
    });
    onComplete?.();
    return;
  }
  animate(elements, {
    opacity: visible ? [0, 1] : [1, 0],
    translateX: visible ? [-6, 0] : [0, -6],
    duration: 140,
    delay: visible ? stagger(20) : stagger(8),
    ease: 'outQuad',
    ...(onComplete ? { complete: onComplete } : {}),
  });
}

/**
 * Gentle scale pulse for icon hover feedback.
 */
export function scalePulse(element: Element | null, duration = 160) {
  if (!element || prefersReducedMotion()) return;
  animate(element, { scale: [1, 1.12, 1], duration, ease: 'outQuad' });
}

/**
 * Quick rotation for the theme toggle icon swap.
 */
export function spinIn(element: Element | null, duration = 240) {
  if (!element || prefersReducedMotion()) return;
  animate(element, { rotate: [0, 180], duration, ease: 'outCubic' });
}

/**
 * Animate a counter element from start to end with exponential easing
 */
export function animateCounter(
  element: HTMLElement | null,
  start: number,
  end: number,
  duration: number = 1000,
  formatter?: (val: number) => string
) {
  if (!element) return;

  const counter = { val: start };

  animate(counter, {
    val: end,
    duration,
    ease: 'outExpo',
    onUpdate: () => {
      if (element) {
        if (formatter) {
          element.innerText = formatter(counter.val);
        } else {
          element.innerText = Math.round(counter.val).toLocaleString();
        }
      }
    },
  });
}

/**
 * Animate a quick spring pulse on an element (e.g. upvote button)
 */
export function pulseVote(element: HTMLElement | null) {
  if (!element) return;

  animate(element, {
    scale: [1, 1.35, 1],
    duration: 350,
    ease: 'outBack',
  });
}

/**
 * Stagger entrance animation for Kanban cards
 */
export function staggerCards(elements: HTMLElement[]) {
  if (!elements || elements.length === 0) return;

  try {
    animate(elements, {
      translateY: [16, 0],
      opacity: [0, 1],
      duration: 400,
      delay: stagger(60),
      ease: 'outQuad',
    });
  } catch {
    // Graceful fallback
  }
}
