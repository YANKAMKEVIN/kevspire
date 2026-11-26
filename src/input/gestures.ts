/**
 * Gestes sur le canvas : glisser pour faire défiler la tour (avec inertie),
 * toucher pour sélectionner, molette sur ordinateur.
 */
export interface GestureHandlers {
  drag(dy: number): void;
  release(velocity: number): void;
  tap(x: number, y: number): void;
  wheel(dy: number): void;
  begin(): void;
}

const TAP_SLOP = 9;

export function attachGestures(el: HTMLElement, hd: GestureHandlers): () => void {
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;
  let dragging = false;

  const down = (e: PointerEvent) => {
    if (pointerId !== -1) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = lastY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    dragging = false;
    el.setPointerCapture?.(e.pointerId);
    hd.begin();
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const dy = e.clientY - lastY;
    if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > TAP_SLOP) dragging = true;
    if (dragging) {
      const now = performance.now();
      const dt = Math.max(1, now - lastT) / 1000;
      velocity = velocity * 0.6 + (dy / dt) * 0.4;
      lastT = now;
      hd.drag(dy);
    }
    lastY = e.clientY;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    if (dragging) hd.release(performance.now() - lastT > 80 ? 0 : velocity);
    else hd.tap(e.clientX, e.clientY);
    dragging = false;
  };
  const cancel = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    hd.release(0);
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    hd.wheel(e.deltaY);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('wheel', wheel, { passive: false });
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('wheel', wheel);
  };
}
