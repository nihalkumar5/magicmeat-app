import { Dimensions, Platform } from 'react-native';

// On a desktop browser the app is shown as a centred phone-width column
// (the way Swiggy, Blinkit and Zepto run on the web) instead of stretching
// the phone layout across a 1440px screen. Screens size themselves with
// useWindowDimensions, so on wide windows we report the column's width as
// the window width; every screen then lays out exactly as on a phone.
export const APP_COLUMN = 480;
const DESKTOP_FROM = 768;

type Win = { width: number; height: number; scale: number; fontScale: number };
const clamp = (w: Win): Win => (w.width >= DESKTOP_FROM ? { ...w, width: APP_COLUMN } : w);

function install(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const D = Dimensions as unknown as {
    get: (k: 'window' | 'screen') => Win;
    addEventListener: (t: string, h: (d: { window: Win; screen: Win }) => void) => { remove: () => void };
    removeEventListener: (t: string, h: unknown) => void;
    __mmFrame?: boolean;
  };
  if (D.__mmFrame) return;
  D.__mmFrame = true;

  const get = D.get.bind(D);
  D.get = (k) => (k === 'window' ? clamp(get('window')) : get(k));

  // Listeners get the raw sizes; hand them the clamped window instead.
  const wrapped = new Map<unknown, (d: { window: Win; screen: Win }) => void>();
  const add = D.addEventListener.bind(D);
  const remove = D.removeEventListener.bind(D);
  D.addEventListener = (t, h) => {
    const w = (d: { window: Win; screen: Win }) => h({ ...d, window: clamp(d.window) });
    wrapped.set(h, w);
    const sub = add(t, w);
    return { remove: () => sub.remove() };
  };
  D.removeEventListener = (t, h) => remove(t, wrapped.get(h) ?? h);

  const style = document.createElement('style');
  style.id = 'magicmeat-web-frame';
  style.textContent = `
@media (min-width: ${DESKTOP_FROM}px) {
  html, body { background: #E9E9EE !important; }
  html body #root {
    max-width: ${APP_COLUMN}px !important;
    margin: 0 auto !important;
    position: relative;
    background: #F2F2F7;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 24px 70px rgba(0,0,0,0.12);
  }
}`;
  document.head.appendChild(style);
}

install();
