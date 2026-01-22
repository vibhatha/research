import { test, expect } from '@playwright/test';

test('Analytics page loads and displays telemetry', async ({ page }) => {
    await page.goto('/analytics');

    // Verify Title
    await expect(page.getByRole('heading', { name: 'System Telemetry' })).toBeVisible();

    // Verify Stats Cards
    await expect(page.getByText('Total Requests')).toBeVisible();
    await expect(page.getByText('Est. Cost')).toBeVisible();
    await expect(page.getByText('Token Usage')).toBeVisible();
    await expect(page.getByText('Avg Latency')).toBeVisible();

    // Verify Activity Log
    // Note: CardTitle renders as a div, so getByRole('heading') fails. Using getByText.
    await expect(page.getByText('Recent Activity Log')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Parameters' })).toBeVisible();

    // Check Backend Status indicator
    // Increase timeout as polling might take a moment if not immediate
    await expect(page.getByText('Backend Status: Online')).toBeVisible({ timeout: 15000 });
});
