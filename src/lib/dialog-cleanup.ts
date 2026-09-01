/** Clear scroll/pointer locks left by nested Radix layers (dialog + select + menu). */
export function releaseStuckDialogLayers() {
  if (document.querySelector('[role="dialog"][data-state="open"]')) return;

  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
  document.body.style.removeProperty('pointer-events');
  document.documentElement.style.removeProperty('overflow');
  document.body.removeAttribute('data-scroll-locked');

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
