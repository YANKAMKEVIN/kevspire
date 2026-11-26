import { expect, test } from '@playwright/test';
import { LEVELS } from '../../src/data/levels';

test.use({ deviceScaleFactor: 1 });

/**
 * Parcours complet automatisé dans le vrai jeu (rendu, interface, sauvegarde) :
 * le bot enchaîne les 9 niveaux via le bouton « Niveau suivant », puis on vérifie la carte.
 */
test('la campagne entière se termine et débloque l’Ascension infinie', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?level=1&bot=1&speed=16&seed=1');
  for (const level of LEVELS) {
    await expect(page.getByTestId('victoire')).toBeVisible({ timeout: 240_000 });
    if (level.id < LEVELS.length) await page.getByTestId('suivant').click();
  }
  await page.getByTestId('menu').click();
  for (const level of LEVELS) await expect(page.getByTestId(`niveau-${level.id}`)).toBeEnabled();
  await expect(page.getByTestId('niveau-infini')).toBeEnabled();
  const stars = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('kevspire.save') ?? '{}') as { data?: string };
    const data = JSON.parse(raw.data ?? '{}') as { levels?: Record<string, { stars: number }> };
    return Object.values(data.levels ?? {}).reduce((n, l) => n + l.stars, 0);
  });
  expect(stars).toBeGreaterThanOrEqual(18);
  await page.getByTestId('niveau-infini').click();
  await expect(page.getByTestId('vague')).toBeVisible();
  expect(errors).toEqual([]);
});
