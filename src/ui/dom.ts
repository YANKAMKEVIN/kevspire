type Child = Node | string | null | undefined | false;

export interface Attrs {
  class?: string;
  id?: string;
  html?: string;
  style?: string;
  onClick?: (ev: MouseEvent) => void;
  [key: string]: unknown;
}

/** Petit utilitaire de création d'éléments DOM, sans framework. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k === 'onClick') el.addEventListener('click', v as EventListener);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.firstChild.remove();
}

/** Met à jour un texte seulement s'il change (évite les recalculs de mise en page). */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function assetUrl(id: string): string {
  return `${import.meta.env.BASE_URL}assets/${id}.webp`;
}
