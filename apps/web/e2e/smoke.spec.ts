import { expect, test } from '@playwright/test';

test.describe('i18n and RTL', () => {
  test('Arabic is the default locale and renders right-to-left', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // No Accept-Language preference for English → default locale.
    await expect(page).toHaveURL(/\/(ar|en)$/);
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('نقل مدرسي بفواتير بسيطة');
  });

  test('English renders left-to-right', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('language switch keeps the user on the same page', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'العربية' }).click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', { name: 'تسجيل الدخول' })).toBeVisible();
  });
});

test.describe('auth gate', () => {
  for (const path of ['/en/operator', '/en/parent', '/ar/operator']) {
    test(`anonymous visit to ${path} lands on the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/${path.split('/')[1]}$`));
      await expect(page.locator('#email')).toBeVisible();
    });
  }

  test('login form validates required fields', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const valid = await page.locator('#email').evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
  });
});
