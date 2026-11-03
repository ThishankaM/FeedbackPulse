import { animate, stagger } from 'animejs';

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
