/**
 * Naming Rule CRUD Tests
 * 
 * Tests for naming rule management: create, read, update, delete, translate
 */
import { expect, test } from '@playwright/test';
import { resetDatabase, createNamingRuleViaApi, deleteNamingRuleViaApi } from '../helpers/api-helpers';
import { createNamingRuleViaUI } from '../helpers/ui-helpers';

test.describe('Naming Rule CRUD Operations', () => {
  test.beforeEach(async ({ request }) => {
    await resetDatabase(request);
  });

  test.describe('API Tests', () => {
    test('should create naming rule', async ({ request }) => {
      const ruleId = await createNamingRuleViaApi(request, 'Test Rule', '{profile}-{TIMESTAMP}');

      expect(ruleId).toBeGreaterThan(0);

      // Verify naming rule exists
      const response = await request.get('/api/v1/naming-rules');
      expect(response.ok()).toBeTruthy();
      const rules = await response.json();
      const rule = rules.find((r: any) => r.id === ruleId);
      expect(rule.name).toBe('Test Rule');
      expect(rule.pattern).toBe('{profile}-{TIMESTAMP}');
    });

    test('should list all naming rules', async ({ request }) => {
      await createNamingRuleViaApi(request, 'Rule 1', '{date}');
      await createNamingRuleViaApi(request, 'Rule 2', '{TIMESTAMP}');

      const response = await request.get('/api/v1/naming-rules');
      expect(response.ok()).toBeTruthy();
      const rules = await response.json();
      // Default naming rules are created on database reset, so there will be more than 2
      expect(rules.length).toBeGreaterThanOrEqual(2);
      expect(rules.map((r: any) => r.name)).toContain('Rule 1');
      expect(rules.map((r: any) => r.name)).toContain('Rule 2');
    });

    test('should update naming rule', async ({ request }) => {
      const ruleId = await createNamingRuleViaApi(request, 'Original', '{date}');

      const updateResponse = await request.put(`/api/v1/naming-rules/${ruleId}`, {
        data: {
          name: 'Updated',
          pattern: '{TIMESTAMP}',
        },
      });
      expect(updateResponse.ok()).toBeTruthy();

      const response = await request.get('/api/v1/naming-rules');
      const rules = await response.json();
      const rule = rules.find((r: any) => r.id === ruleId);
      expect(rule.name).toBe('Updated');
      expect(rule.pattern).toBe('{TIMESTAMP}');
    });

    test('should delete naming rule', async ({ request }) => {
      const ruleId = await createNamingRuleViaApi(request, 'To Delete', '{date}');

      await deleteNamingRuleViaApi(request, ruleId);

      const response = await request.get('/api/v1/naming-rules');
      const rules = await response.json();
      const rule = rules.find((r: any) => r.id === ruleId);
      expect(rule).toBeUndefined();
    });

    test('should translate naming rule pattern', async ({ request }) => {
      const response = await request.post('/api/v1/naming-rules/translate', {
        data: {
          pattern: 'backup-{date}',
        },
      });
      expect(response.ok()).toBeTruthy();
      const result = await response.json();

      // The result should be a date string like 'backup-2026-01-02'
      expect(result.result).toMatch(/^backup-\d{4}-\d{2}-\d{2}$/);
    });

    test('should translate pattern with TIMESTAMP placeholder', async ({ request }) => {
      const response = await request.post('/api/v1/naming-rules/translate', {
        data: {
          pattern: '{TIMESTAMP}',
        },
      });
      expect(response.ok()).toBeTruthy();
      const result = await response.json();

      // Should be a Unix timestamp (integer)
      expect(result.result).toMatch(/^\d+$/);
    });

    test('should translate pattern with profile_name placeholder', async ({ request }) => {
      const response = await request.post('/api/v1/naming-rules/translate', {
        data: {
          pattern: '{profile}/data',
        },
      });
      expect(response.ok()).toBeTruthy();
      const result = await response.json();

      // profile_name gets replaced with a dummy value (my_database) during preview
      expect(result.result).toBe('my_database/data');
    });
  });

  test.describe('UI Tests', () => {
    test('should create naming rule via UI', async ({ page }) => {
      await createNamingRuleViaUI(page, 'UI Rule', '{profile}-{date}');

      // Verify naming rule appears in list
      await expect(page.getByText('UI Rule')).toBeVisible();
    });

    test('should show naming rules list', async ({ page, request }) => {
      await createNamingRuleViaApi(request, 'Rule Alpha', '{date}-alpha');
      await createNamingRuleViaApi(request, 'Rule Beta', '{date}-beta');

      await page.goto('/naming-rules');

      await expect(page.getByText('Rule Alpha')).toBeVisible();
      await expect(page.getByText('Rule Beta')).toBeVisible();
    });

    test('should edit naming rule via UI', async ({ page, request }) => {
      await createNamingRuleViaApi(request, 'Edit Rule', '{date}');

      await page.goto('/naming-rules');

      // Click edit button
      await page.locator('tr', { hasText: 'Edit Rule' }).getByRole('button', { name: /edit/i }).click();

      // Wait for dialog
      await expect(page.getByTestId('naming-rule-dialog')).toBeVisible();

      // Update name
      await page.getByTestId('input-name').locator('input').fill('Edited Rule');
      await page.getByTestId('save-naming-rule-btn').click();

      // Verify update
      await expect(page.getByTestId('naming-rule-dialog')).not.toBeVisible();
      await expect(page.getByText('Edited Rule')).toBeVisible();
    });

    test('should delete naming rule via UI', async ({ page, request }) => {
      await createNamingRuleViaApi(request, 'Delete Rule', '{date}');

      await page.goto('/naming-rules');
      await expect(page.getByText('Delete Rule')).toBeVisible();

      // Set up dialog handler BEFORE clicking delete (native confirm dialog)
      page.on('dialog', dialog => dialog.accept());

      // Click delete button
      await page.locator('tr', { hasText: 'Delete Rule' }).getByRole('button', { name: /delete/i }).click();

      // Wait for the row to be removed from the DOM
      await expect(page.locator('tr', { hasText: 'Delete Rule' })).not.toBeVisible();
    });
  });
});
