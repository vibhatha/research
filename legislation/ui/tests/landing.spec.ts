import { test, expect } from '@playwright/test';

test('Landing page loads and navigates to Explore Acts', async ({ page }) => {
    await page.goto('/');

    // Verify Title
    await expect(page.getByRole('heading', { name: 'Lanka Data Foundation Research' })).toBeVisible();

    // Verify Description
    await expect(page.getByText('Exploration of legislative acts')).toBeVisible();

    // Check Buttons
    const exploreBtn = page.getByRole('button', { name: 'Explore Acts' });
    await expect(exploreBtn).toBeVisible();

    const ocrBtn = page.getByRole('button', { name: 'DeepSeek OCR' });
    await expect(ocrBtn).toBeDisabled();

    // Navigation
    await exploreBtn.click();
    await expect(page).toHaveURL(/\/acts/);
});
