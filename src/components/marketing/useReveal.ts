import { useEffect, type RefObject } from 'react';

/**
 * Scroll-reveal for the marketing pages. Elements with `data-reveal`, and the children of elements with
 * `data-reveal-children` (staggered), fade and rise in the first time they scroll into view.
 *
 * Content stays visible without JavaScript or with reduced motion: the hidden starting state only applies
 * once the root carries the `reveal-ready` class, which this hook adds.
 */
export function useReveal(root: RefObject<HTMLElement>): void {
  useEffect(() => {
    const container = root.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const targets: HTMLElement[] = [...container.querySelectorAll<HTMLElement>('[data-reveal]')];
    container.querySelectorAll<HTMLElement>('[data-reveal-children]').forEach((group) => {
      [...group.children].forEach((child, index) => {
        if (!(child instanceof HTMLElement) || child.hasAttribute('data-reveal')) return;
        child.setAttribute('data-reveal', '');
        child.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 90}ms`);
        targets.push(child);
      });
    });

    // After the entrance, `reveal-done` hands transitions back to the element's own styles (e.g. card hover).
    const reveal = (el: Element) => {
      el.classList.add('is-revealed');
      const done = (event: Event) => {
        if (event.target !== el) return;
        el.classList.add('reveal-done');
        el.removeEventListener('transitionend', done);
      };
      el.addEventListener('transitionend', done);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    // Anything already on screen (e.g. after a hash jump) shows at once.
    const viewport = window.innerHeight;
    targets.forEach((el) => {
      if (el.getBoundingClientRect().top < viewport * 0.92) el.classList.add('is-revealed', 'reveal-done');
      else observer.observe(el);
    });
    container.classList.add('reveal-ready');

    return () => observer.disconnect();
  }, [root]);
}
