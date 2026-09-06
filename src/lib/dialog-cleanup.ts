/** Clear scroll/pointer locks left by nested Radix layers (dialog + select + menu). */
export function releaseStuckDialogLayers() {
  if (document.querySelector('[role="dialog"][data-state="open"]')) return;

  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
  document.body.style.removeProperty('pointer-events');
  document.documentElement.style.removeProperty('overflow');
  document.body.removeAttribute('data-scroll-locked');

  // Remove any lingering scrim/backdrop elements that may still be in the DOM
  // (these are portaled overlays with the .ui-scrim class — if left behind they
  //  can create visual blur and block pointer events).
  Array.from(document.querySelectorAll('.ui-scrim')).forEach((el) => {
    if (el instanceof HTMLElement) {
      // If an element is still marked open for some reason, skip removing it.
      // We already returned above if there's any open dialog, so this is just defensive.
      if ((el as HTMLElement).dataset.state === 'open') return;
      el.remove();
    }
  });

  Array.from(document.body.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    child.style.removeProperty('pointer-events');
    if (child.getAttribute('aria-hidden') === 'true') {
      child.removeAttribute('aria-hidden');
    }
  });

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}
