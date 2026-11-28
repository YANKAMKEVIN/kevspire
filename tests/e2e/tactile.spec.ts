import { expect, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

/**
 * Parcours au doigt (écran tactile émulé, Pixel 7) : vrais événements tactiles,
 * pas de souris. Poser, améliorer, vendre une tourelle, faire défiler la tour,
 * et vérifier que le jeu s'arrête quand l'onglet passe en arrière-plan.
 */
interface Win {
  __kevspire: {
    app: { frames: number };
    session: {
      slotScreen(n: number): { x: number; y: number };
      state: { gold: number; time: number; slots: ({ kind: string; level: number } | null)[]; phase: string; floors: (string | null)[]; maxFloors: number };
      replay: { entries: { cmd: { c: string } }[] };
    };
  };
}

const slotScreen = (page: Page, slot: number) =>
  page.evaluate((s) => (window as unknown as Win).__kevspire.session.slotScreen(s), slot);
const gold = async (page: Page) => Number(await page.getByTestId('or').textContent());
const towerAt = (page: Page, slot: number) =>
  page.evaluate((s) => (window as unknown as Win).__kevspire.session.state.slots[s], slot);

async function fingerTap(page: Page, slot: number): Promise<void> {
  const p = await slotScreen(page, slot);
  await page.touchscreen.tap(p.x, p.y - 10);
}

/** Glissé au doigt via le protocole DevTools (touchStart → touchMove… → touchEnd). */
async function fingerDrag(cdp: CDPSession, x: number, y0: number, y1: number, steps = 12): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / steps }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('au doigt : poser, améliorer et vendre une tourelle', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByTestId('jouer').tap();
  await page.getByTestId('niveau-1').tap();
  await page.getByTestId('dialogue').tap();
  await expect(page.getByTestId('dialogue')).toHaveCount(0);
  const start = await gold(page);

  // Premier appui sur un balcon : menu radial ; premier appui sur une tourelle : aperçu ; second : construction.
  await fingerTap(page, 1);
  await expect(page.getByTestId('construire-baliste')).toBeVisible();
  await page.getByTestId('construire-baliste').tap();
  expect(await towerAt(page, 1)).toBeNull();
  await page.getByTestId('construire-baliste').tap();
  await expect.poll(() => towerAt(page, 1)).toMatchObject({ kind: 'baliste', level: 1 });
  await expect.poll(() => gold(page)).toBe(start - 60);
  await expect(page.getByTestId('menu-construction')).toHaveCount(0);

  // Toucher la tourelle : fiche, amélioration.
  await fingerTap(page, 1);
  await expect(page.getByTestId('fiche-tourelle')).toBeVisible();
  await page.getByTestId('ameliorer').tap();
  await expect.poll(() => towerAt(page, 1)).toMatchObject({ level: 2 });
  await expect.poll(() => gold(page)).toBe(start - 130);

  // Revente : 70 % de l'investissement.
  await page.getByTestId('vendre').tap();
  await expect.poll(() => towerAt(page, 1)).toBeNull();
  await expect.poll(() => gold(page)).toBe(start - 130 + Math.floor(130 * 0.7));

  // Toucher dans le vide referme les menus.
  await fingerTap(page, 1);
  await expect(page.getByTestId('construire-baliste')).toBeVisible();
  await page.touchscreen.tap(20, 300);
  await expect(page.getByTestId('menu-construction')).toHaveCount(0);

  // Les commandes passées au doigt sont enregistrées pour le rejeu.
  const cmds = await page.evaluate(() => (window as unknown as Win).__kevspire.session.replay.entries.map((e) => e.cmd.c));
  expect(cmds).toEqual(['build', 'upgrade', 'sell']);
  expect(errors).toEqual([]);
});

test('au doigt : glisser fait défiler la tour sans rien construire', async ({ page }) => {
  await page.goto('/?level=9&seed=3');
  await page.getByTestId('dialogue').tap();
  // Tour haute (10 étages) : sur un téléphone elle dépasse l'écran et doit défiler.
  await page.evaluate(() => {
    const s = (window as unknown as Win).__kevspire.session.state;
    while (s.floors.length < s.maxFloors) s.floors.push(null);
  });
  const cdp = await page.context().newCDPSession(page);
  const before = await slotScreen(page, 2);
  const vw = page.viewportSize()!;
  // Doigt qui descend : on monte dans la tour, les balcons du bas descendent à l'écran.
  await fingerDrag(cdp, vw.width / 2, vw.height * 0.3, vw.height * 0.8);
  await page.waitForTimeout(400);
  const after = await slotScreen(page, 2);
  expect(Math.abs(after.y - before.y)).toBeGreaterThan(60);
  await expect(page.getByTestId('menu-construction')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as Win).__kevspire.session.state.slots.every((t) => t === null))).toBe(true);
});

test('onglet caché : pause, plus aucune image ni simulation, reprise propre', async ({ page }) => {
  await page.goto('/?level=1&seed=1');
  await page.getByTestId('dialogue').tap();
  await page.getByTestId('appel-vague').tap();
  await page.getByTestId('compris').tap();
  await page.waitForTimeout(500);
  await setHidden(page, true);
  await expect(page.getByTestId('pause-modale')).toBeVisible();
  const read = () => page.evaluate(() => {
    const k = (window as unknown as Win).__kevspire;
    return { frames: k.app.frames, time: k.session.state.time };
  });
  const a = await read();
  await page.waitForTimeout(700);
  const b = await read();
  expect(b.frames).toBe(a.frames);
  expect(b.time).toBe(a.time);
  await setHidden(page, false);
  await page.waitForTimeout(300);
  expect((await read()).frames).toBeGreaterThan(b.frames);
  await page.getByTestId('continuer').tap();
  await page.waitForTimeout(600);
  expect((await read()).time).toBeGreaterThan(b.time);
});

test.describe('écran très dense', () => {
  test.use({ deviceScaleFactor: 3 });
  test('la résolution du canvas est plafonnée (2× au plus en qualité auto, 1× en éco)', async ({ page }) => {
    await page.goto('/?level=1&seed=1');
    await page.getByTestId('dialogue').tap();
    const ratio = () => page.evaluate(() => {
      const c = document.querySelector('canvas')!;
      return c.width / c.clientWidth;
    });
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(3);
    // Qualité auto : 2× au plus (elle peut encore baisser si la machine de test peine).
    const auto = await ratio();
    expect(auto).toBeLessThanOrEqual(2.01);
    expect(auto).toBeGreaterThanOrEqual(0.99);
    await page.evaluate(() => {
      const app = (window as unknown as { __kevspire: { app: { save: { settings: { quality: string } }; applySettings(): void } } }).__kevspire.app;
      app.save.settings.quality = 'eco';
      app.applySettings();
    });
    expect(await ratio()).toBeCloseTo(1, 1);
  });
});
