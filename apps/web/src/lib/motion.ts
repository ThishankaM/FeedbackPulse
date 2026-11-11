import { animate, stagger } from 'animejs';

/**
 * Checks whether user has enabled prefers-reduced-motion in system settings.
 * Safe for SSR and headless test runners.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Enforces duration strictly between 200ms and 500ms as required by design system.
 */
export const clampDuration = (duration: number): number =>
  Math.min(Math.max(duration, 200), 500);

const EXPANDED_SIDEBAR_WIDTH = 256;
const COLLAPSED_SIDEBAR_WIDTH = 72;
const activeAnimations = new WeakMap<Element, ReturnType<typeof animate>>();

function cancelActiveAnimation(element: Element) {
  const previous = activeAnimations.get(element);
  if (previous && typeof previous.cancel === 'function') {
    previous.cancel();
  }
  activeAnimations.delete(element);
}

/**
 * Animate sidebar width between expanded and collapsed states.
 * Accepts either boolean (true = collapsed, false = expanded) or explicit target pixel width.
 * Backwards compatible with (element, collapsedOrWidth, onComplete) and (element, collapsedOrWidth, duration, onComplete).
 */
export function animateSidebarWidth(
  element: Element | null,
  collapsedOrWidth: boolean | number,
  durationOrComplete?: number | (() => void),
  maybeComplete?: () => void
) {
  const onComplete =
    typeof durationOrComplete === 'function' ? durationOrComplete : maybeComplete;
  const rawDuration =
    typeof durationOrComplete === 'number' ? durationOrComplete : 260;

  if (!element || typeof window === 'undefined') {
    onComplete?.();
    return;
  }
  const htmlEl = element as HTMLElement;
  const toPx =
    typeof collapsedOrWidth === 'boolean'
      ? collapsedOrWidth
        ? COLLAPSED_SIDEBAR_WIDTH
        : EXPANDED_SIDEBAR_WIDTH
      : collapsedOrWidth;

  cancelActiveAnimation(element);

  if (prefersReducedMotion()) {
    htmlEl.style.width = `${toPx}px`;
    onComplete?.();
    return;
  }

  const from = htmlEl.getBoundingClientRect().width;
  const anim = animate(element, {
    width: [`${from}px`, `${toPx}px`],
    duration: clampDuration(rawDuration),
    ease: 'outCubic',
    onComplete: () => {
      activeAnimations.delete(element);
      onComplete?.();
    },
  });
  activeAnimations.set(element, anim);
}

/**
 * Fade sidebar labels in or out.
 * On collapse, onComplete is executed to allow the parent to unmount labels.
 */
export function fadeLabels(
  elements: HTMLElement[] | NodeListOf<HTMLElement> | null,
  visible: boolean,
  onComplete?: () => void
) {
  const elList = elements ? Array.from(elements) : [];
  if (elList.length === 0) {
    onComplete?.();
    return;
  }

  elList.forEach(cancelActiveAnimation);

  if (prefersReducedMotion()) {
    elList.forEach((el) => {
      el.style.opacity = visible ? '1' : '0';
      el.style.transform = 'none';
    });
    onComplete?.();
    return;
  }

  const anim = animate(elList, {
    opacity: visible ? [0, 1] : [1, 0],
    translateX: visible ? [-6, 0] : [0, -6],
    duration: clampDuration(200),
    delay: visible ? stagger(15) : stagger(8),
    ease: 'outQuad',
    onComplete: () => {
      elList.forEach((el) => activeAnimations.delete(el));
      onComplete?.();
    },
  });
  elList.forEach((el) => activeAnimations.set(el, anim));
}

/**
 * Subtle scale bounce for icon or button hover feedback.
 */
export function scalePulse(element: Element | null, duration: number = 220) {
  if (!element || prefersReducedMotion()) return;
  animate(element, {
    scale: [1, 1.12, 1],
    duration: clampDuration(duration),
    ease: 'outQuad',
  });
}

/**
 * Quick rotation for theme switcher and icon toggle swaps.
 */
export function spinIn(element: Element | null, duration: number = 260) {
  if (!element || prefersReducedMotion()) return;
  animate(element, {
    rotate: [0, 180],
    duration: clampDuration(duration),
    ease: 'outCubic',
  });
}

/**
 * Animate a counter element to a target value.
 * Supports both:
 *   animateCounter(element, targetValue, prefix?, suffix?)
 *   animateCounter(element, start, end, duration?, formatter?)
 */
export function animateCounter(
  element: HTMLElement | null,
  targetValueOrStart: number,
  prefixOrEnd?: string | number,
  suffixOrDuration?: string | number,
  durationOrFormatter?: number | ((val: number) => string),
  maybeFormatter?: (val: number) => string
) {
  if (!element) return;

  let start = 0;
  let end = targetValueOrStart;
  let prefix = '';
  let suffix = '';
  let duration = 400;
  let formatter: ((val: number) => string) | undefined;

  if (typeof prefixOrEnd === 'number') {
    start = targetValueOrStart;
    end = prefixOrEnd;
    duration = typeof suffixOrDuration === 'number' ? suffixOrDuration : 400;
    formatter =
      typeof durationOrFormatter === 'function'
        ? durationOrFormatter
        : maybeFormatter;
  } else {
    prefix = typeof prefixOrEnd === 'string' ? prefixOrEnd : '';
    suffix = typeof suffixOrDuration === 'string' ? suffixOrDuration : '';
    duration = typeof durationOrFormatter === 'number' ? durationOrFormatter : 400;
    formatter = maybeFormatter;
  }

  const formatValue = (val: number) => {
    if (formatter) return formatter(val);
    return `${prefix}${Math.round(val).toLocaleString()}${suffix}`;
  };

  if (prefersReducedMotion()) {
    element.innerText = formatValue(end);
    return;
  }

  const counter = { val: start };
  animate(counter, {
    val: end,
    duration: clampDuration(duration),
    ease: 'outExpo',
    onUpdate: () => {
      if (element) {
        element.innerText = formatValue(counter.val);
      }
    },
  });
}

/**
 * Animate spring bounce feedback on upvote buttons.
 */
export function pulseVote(element: HTMLElement | null, duration: number = 300) {
  if (!element || prefersReducedMotion()) return;
  animate(element, {
    scale: [1, 1.35, 1],
    duration: clampDuration(duration),
    ease: 'outBack',
  });
}

/**
 * Cascading entrance animation for card grids and Kanban columns.
 * Supports passing container selector + item selector, or element array directly.
 */
export function staggerCards(
  containerOrElements: string | HTMLElement[] | NodeListOf<HTMLElement>,
  itemSelector?: string,
  duration: number = 350
) {
  let targets: HTMLElement[] = [];

  if (typeof containerOrElements === 'string') {
    const container = document.querySelector(containerOrElements);
    if (!container) return;
    targets = itemSelector
      ? Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
      : Array.from(document.querySelectorAll<HTMLElement>(containerOrElements));
  } else if (Array.isArray(containerOrElements)) {
    targets = containerOrElements;
  } else if (containerOrElements instanceof NodeList) {
    targets = Array.from(containerOrElements) as HTMLElement[];
  }

  if (!targets || targets.length === 0) return;

  if (prefersReducedMotion()) {
    targets.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  try {
    animate(targets, {
      translateY: [16, 0],
      opacity: [0, 1],
      duration: clampDuration(duration),
      delay: stagger(40),
      ease: 'outCubic',
    });
  } catch {
    // Graceful fallback if elements unmount mid-animation
  }
}

/**
 * Slide-over drawer entrance from the right side.
 */
export function slideInDrawer(element: HTMLElement | null, duration: number = 280) {
  if (!element) return;
  if (prefersReducedMotion()) {
    element.style.transform = 'translateX(0%)';
    element.style.opacity = '1';
    return;
  }

  element.style.willChange = 'transform';
  animate(element, {
    translateX: ['100%', '0%'],
    duration: clampDuration(duration),
    ease: 'outCubic',
    onComplete: () => {
      element.style.willChange = '';
    },
  });
}

/**
 * Slide-over drawer exit towards the right side.
 * Synchronously calls onComplete if reduced motion is enabled.
 */
export function slideOutDrawer(
  element: HTMLElement | null,
  onComplete?: () => void,
  duration: number = 240
) {
  if (!element) {
    onComplete?.();
    return;
  }
  if (prefersReducedMotion()) {
    element.style.transform = 'translateX(100.5%)';
    onComplete?.();
    return;
  }

  element.style.willChange = 'transform';
  animate(element, {
    translateX: ['0%', '100.5%'],
    duration: clampDuration(duration),
    ease: 'inCubic',
    onComplete: () => {
      element.style.willChange = '';
      onComplete?.();
    },
  });
}

/**
 * Modal / Dialog pop-in entrance animation.
 */
export function modalEntrance(element: HTMLElement | null, duration: number = 250) {
  if (!element) return;
  if (prefersReducedMotion()) {
    element.style.opacity = '1';
    element.style.transform = 'none';
    return;
  }

  animate(element, {
    opacity: [0, 1],
    scale: [0.95, 1],
    translateY: [8, 0],
    duration: clampDuration(duration),
    ease: 'outCubic',
  });
}

/**
 * Card lift on mouse enter.
 */
export function cardHoverEnter(element: HTMLElement | null, duration: number = 200) {
  if (!element || prefersReducedMotion()) return;
  animate(element, {
    translateY: -3,
    scale: 1.01,
    duration: clampDuration(duration),
    ease: 'outQuad',
  });
}

/**
 * Card reset on mouse leave.
 */
export function cardHoverLeave(element: HTMLElement | null, duration: number = 200) {
  if (!element) return;
  if (prefersReducedMotion()) {
    element.style.transform = 'none';
    return;
  }
  animate(element, {
    translateY: 0,
    scale: 1,
    duration: clampDuration(duration),
    ease: 'outQuad',
  });
}
