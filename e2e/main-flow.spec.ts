import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { garmentPng } from './png';

async function expectNoA11yViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  // Deterministic and offline: Open-Meteo is never reached unless a test stubs it.
  await page.route(/open-meteo\.com/, (r) => r.abort());
});

test('main flow: samples, look, save, wear, diary — accessible at every step', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'An empty rail' })).toBeVisible();
  await expectNoA11yViolations(page, 'empty state');

  await page.getByRole('button', { name: 'Load sample wardrobe' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Look 01' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Why it works' })).toBeVisible();
  await page.waitForTimeout(600); // let the dressing animation settle before measuring contrast
  await expectNoA11yViolations(page, 'today');

  await page.getByRole('radio', { name: 'Office' }).check();
  const topName = (await page.locator('article p').first().innerText()).split('\n')[0];

  await page.getByRole('button', { name: 'Save look' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Wore this today' }).click();
  await expect(page.getByText(/Logged in your diary/)).toBeVisible();

  await page.goto('/saved');
  await expect(page.getByRole('heading', { level: 1, name: 'Saved' })).toBeVisible();
  await expect(page.getByText(topName).first()).toBeVisible();
  await expectNoA11yViolations(page, 'saved');

  await page.goto('/diary');
  await expect(page.getByText('Office', { exact: true })).toBeVisible();
  await expectNoA11yViolations(page, 'diary');

  await page.goto('/missing');
  await expect(page.getByText('If you buy one thing, make it')).toBeVisible();
  await expectNoA11yViolations(page, 'missing piece');

  await page.goto('/closet');
  await expect(page.getByRole('heading', { name: /Tops/ })).toBeVisible();
  await expectNoA11yViolations(page, 'closet');

  // NFR-6: no horizontal page scroll.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('AC-1, AC-2: uploading a photo reads its colour on-device and names the piece', async ({ page }) => {
  await page.goto('/closet');
  await page.getByRole('button', { name: 'Add your first piece' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a piece' });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page, 'add dialog');

  await dialog.locator('input[type=file]:not([capture])').setInputFiles({
    name: 'red-tee.png',
    mimeType: 'image/png',
    buffer: garmentPng(1500, 2000, [248, 248, 246], [196, 32, 40]),
  });
  await expect(dialog.getByText('Red', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/read from your photo/)).toBeVisible();
  await expect(dialog.getByLabel('Name (optional)')).toHaveAttribute('placeholder', 'Red t-shirt');

  // FR-5: the preview is the stored, downscaled photo.
  const longest = await dialog.getByRole('img', { name: 'Your photo' }).evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return Math.max(img.naturalWidth, img.naturalHeight);
  });
  expect(longest).toBe(1200);

  await dialog.getByRole('button', { name: 'Add to closet' }).click();
  await expect(dialog).toBeHidden();
  // The new piece is first on the rail and actually on screen, not scrolled out of view.
  await expect(page.getByRole('button', { name: /Red t-shirt/ })).toBeInViewport();
});

test('AC-20: keyboard only — skip link, occasions, save, pick another look', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow is checked on desktop');
  await page.goto('/');
  await page.getByRole('button', { name: 'Load sample wardrobe' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Look 01' })).toBeVisible();
  await page.reload(); // start keyboard navigation from the top of a fresh page
  await expect(page.getByRole('heading', { level: 1, name: 'Look 01' })).toBeVisible();

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  const everyday = page.getByRole('radio', { name: 'Everyday' });
  for (let i = 0; i < 12 && !(await everyday.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(everyday).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Office' })).toBeChecked();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Save look' })).toBeFocused();
  const outline = await page.getByRole('button', { name: 'Save look' }).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

  await page.getByRole('button', { name: /^Look 02/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Look 02' })).toBeFocused();
});

test('FR-17, AC-16: searching a city loads weather into the suggestions', async ({ page }) => {
  await page.unroute(/open-meteo\.com/);
  await page.route(/geocoding-api\.open-meteo\.com/, (r) =>
    r.fulfill({ json: { results: [{ name: 'Pune', admin1: 'Maharashtra', country: 'India', latitude: 18.52, longitude: 73.86 }] } }),
  );
  await page.route(/\/\/api\.open-meteo\.com/, (r) =>
    r.fulfill({
      json: {
        daily: {
          time: ['2026-10-04'],
          temperature_2m_max: [31],
          temperature_2m_min: [22],
          precipitation_probability_max: [70],
          weather_code: [61],
        },
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Load sample wardrobe' }).click();
  await page.getByRole('button', { name: 'Add city' }).click();
  await page.getByLabel('City').fill('Pune');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Pune, Maharashtra, India' }).click();
  await expect(page.getByText(/31° high, 22° low, 70% chance of rain/)).toBeVisible();
  await page.waitForTimeout(600);
  await expectNoA11yViolations(page, 'today with weather');
});

test('EC-5: weather service down still shows looks', async ({ page }) => {
  await page.unroute(/open-meteo\.com/);
  await page.route(/geocoding-api\.open-meteo\.com/, (r) =>
    r.fulfill({ json: { results: [{ name: 'Lisbon', country: 'Portugal', latitude: 38.72, longitude: -9.14 }] } }),
  );
  await page.route(/\/\/api\.open-meteo\.com/, (r) => r.fulfill({ status: 503, body: 'busy' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Load sample wardrobe' }).click();
  await page.getByRole('button', { name: 'Add city' }).click();
  await page.getByLabel('City').fill('Lisbon');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Lisbon, Portugal' }).click();
  await expect(page.getByText(/Looks below ignore the weather/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Look 01' })).toBeVisible();
});
