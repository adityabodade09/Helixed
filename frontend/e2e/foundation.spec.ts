import { expect, test } from '@playwright/test';

test('protects the student application behind sign-in', async ({ page }) => {
  await page.goto('/student');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to Helixed' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Login identifier' })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
});
