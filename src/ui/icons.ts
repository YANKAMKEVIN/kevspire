/** Pictogrammes vectoriels maison (nets à toutes les tailles). */
const svg = (body: string, vb = '0 0 24 24'): string =>
  `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  coin: svg('<circle cx="12" cy="12" r="9.5" fill="#FFC857" stroke="#8a5a14" stroke-width="1.6"/><circle cx="12" cy="12" r="6" fill="none" stroke="#c98a22" stroke-width="1.6"/><path d="M12 8.2l1.2 2.6 2.6 1.2-2.6 1.2L12 15.8l-1.2-2.6L8.2 12l2.6-1.2z" fill="#fff6d8"/>'),
  heart: svg('<path d="M12 3.2l5.6 7.3L12 21 6.4 10.5z" fill="#6FF3E0" stroke="#1d6f78" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 6.5l3 4L12 16.6 9 10.5z" fill="#FFC857" opacity=".9"/>'),
  wave: svg('<path d="M3 15c2.5-4 4.5-4 7 0s4.5 4 7 0 3-3.5 4-2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 9c2.5-4 4.5-4 7 0s4.5 4 7 0 3-3.5 4-2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>'),
  pause: svg('<rect x="6" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor"/>'),
  play: svg('<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>'),
  speed: svg('<path d="M3.5 5l8 7-8 7zM12.5 5l8 7-8 7z" fill="currentColor"/>'),
  star: svg('<path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z" fill="currentColor"/>'),
  crystal: svg('<path d="M12 2l6 7-6 13-6-13z" fill="#6FF3E0" stroke="#1d6f78" stroke-width="1.3"/><path d="M6 9h12M12 2v20" stroke="#1d6f78" stroke-width="1" opacity=".6"/>'),
  burst: svg('<circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g>'),
  wind: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>'),
  gear: svg('<path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  book: svg('<path d="M4 4.5h6.5A2.5 2.5 0 0 1 13 7v13a2 2 0 0 0-2-2H4zM20 4.5h-6.5A2.5 2.5 0 0 0 11 7v13a2 2 0 0 1 2-2h7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  hammer: svg('<path d="M14 4l6 6-2.5 2.5-6-6zM12.2 8.8l2.9 2.9L6 20.8a2 2 0 0 1-2.9-2.9z" fill="currentColor"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>'),
  back: svg('<path d="M15 4.5L7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  up: svg('<path d="M12 4l7 8h-4.5v8h-5v-8H5z" fill="currentColor"/>'),
  sell: svg('<path d="M4 12l8-8h8v8l-8 8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="8" r="1.6" fill="currentColor"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/>'),
  infinity: svg('<path d="M7 8.5c-2 0-3.5 1.6-3.5 3.5S5 15.5 7 15.5c3.5 0 6.5-7 10-7 2 0 3.5 1.6 3.5 3.5S19 15.5 17 15.5c-3.5 0-6.5-7-10-7z" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
  sound: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
} as const;

export type IconId = keyof typeof ICONS;

export function icon(id: IconId, cls = 'ico'): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = cls;
  s.innerHTML = ICONS[id];
  return s;
}
