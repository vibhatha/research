import { test, expect } from '@playwright/test';

test('Dashboard loads and displays data', async ({ page }) => {
    await page.goto('/acts');

    // Verify Title
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify Charts specific elements
    // Tabs "By Year", "By Category", "Dependency Graph"
    await expect(page.getByRole('tab', { name: 'By Year' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'By Category' })).toBeVisible();

    // Verify Table presence
    await expect(page.getByRole('heading', { name: 'All Acts' })).toBeVisible();

    // Verify table is not empty
    // Assuming table rows > 0. ActsTable uses ShadCN Table which renders tr inside tbody
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} acts in the table.`);
    expect(rowCount).toBeGreaterThan(0);

    // Check against "No results."
    await expect(page.getByText('No results.')).not.toBeVisible();
});
