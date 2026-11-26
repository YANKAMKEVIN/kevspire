import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function tapSlot(page: Page, slot: number): Promise<void> {
  const p = await page.evaluate((s) => (window as unknown as { __kevspire: { session: { slotScreen(n: number): { x: number; y: number } } } }).__kevspire.session.slotScreen(s), slot);
  await page.mouse.click(p.x, p.y - 10);
}

const gold = async (page: Page) => Number(await page.getByTestId('or').textContent());

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('parcours joueur : construire, améliorer, vendre, jouer, mettre en pause, reprendre', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByTestId('ecran-titre')).toBeVisible();
  await page.getByTestId('jouer').click();
  await page.getByTestId('niveau-1').click();
  await page.getByTestId('dialogue').click();
  await expect(page.getByTestId('dialogue')).toHaveCount(0);

  const start = await gold(page);
  await tapSlot(page, 0);
  await expect(page.getByTestId('construire-baliste')).toBeVisible();
  await page.getByTestId('construire-baliste').click();
  await page.getByTestId('construire-baliste').click();
  await expect.poll(() => gold(page)).toBe(start - 60);

  await tapSlot(page, 0);
  await expect(page.getByTestId('fiche-tourelle')).toBeVisible();
  await page.getByTestId('ameliorer').click();
  await expect.poll(() => gold(page)).toBe(start - 60 - 70);
  await page.getByTestId('vendre').click();
  await expect.poll(() => gold(page)).toBe(start - 60 - 70 + Math.floor(130 * 0.7));

  await tapSlot(page, 1);
  await page.getByTestId('construire-baliste').click();
  await page.getByTestId('construire-baliste').click();
  await page.getByTestId('appel-vague').click();
  await expect(page.getByTestId('nouvelle-brumame')).toBeVisible();
  await page.getByTestId('compris').click();
  await expect(page.getByTestId('vague')).toHaveText('1/6');

  await page.getByTestId('pause').click();
  await expect(page.getByTestId('pause-modale')).toBeVisible();
  await page.getByTestId('continuer').click();
  await page.waitForTimeout(500);
  await page.getByTestId('pause').click();
  await page.getByTestId('quitter').click();
  await page.getByTestId('retour').click();
  await expect(page.getByTestId('reprendre')).toBeVisible();
  await page.getByTestId('reprendre').click();
  await expect(page.getByTestId('vague')).toHaveText('1/6');
  const towers = await page.evaluate(() => (window as unknown as { __kevspire: { session: { state: { slots: unknown[] } } } }).__kevspire.session.state.slots.filter(Boolean).length);
  expect(towers).toBe(1);
  expect(errors).toEqual([]);
});

test('l’atelier et les réglages sont sauvegardés', async ({ page }) => {
  // Progression obtenue par le jeu lui-même : le bot gagne le niveau 1 (3 étoiles).
  await page.goto('/?level=1&bot=1&speed=16&seed=1');
  await expect(page.getByTestId('victoire')).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('menu').click();
  await page.getByTestId('retour').click();
  await page.getByTestId('atelier').click();
  await expect(page.getByTestId('eclats')).toHaveText('3');
  await page.getByTestId('amel-fonds').click();
  await expect(page.getByTestId('eclats')).toHaveText('2');
  await page.goto('/');
  await page.getByTestId('atelier').click();
  await expect(page.getByTestId('eclats')).toHaveText('2');
});

test('une sauvegarde corrompue ne casse pas le jeu', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('kevspire.save', '{"sum":"0","data":"{oups'));
  await page.reload();
  await expect(page.getByTestId('ecran-titre')).toBeVisible();
  await page.getByTestId('jouer').click();
  await expect(page.getByTestId('niveau-1')).toBeEnabled();
});
