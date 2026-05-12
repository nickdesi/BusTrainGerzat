import { test, expect } from '@playwright/test';

test('homepage loads and displays correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Gerzat Live/i);
});

test('map page loads successfully', async ({ page }) => {
  await page.goto('/app/carte');
  // Just verify we navigated to the map page successfully by checking url and basic content
  await expect(page).toHaveURL(/.*\/app\/carte/);
});
