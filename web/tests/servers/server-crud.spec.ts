/**
 * Server CRUD Tests
 * 
 * Tests for server management: create, read, update, delete
 */
import { expect, test } from '@playwright/test';
import type { Server as SSHServer } from 'ssh2';
import { resetDatabase, createServerViaApi, deleteServerViaApi } from '../helpers/api-helpers';
import { startFakeSSHServer, SSH_PRIVATE_KEY } from '../helpers/fake-ssh-server';
import { createServerViaUI, createServerWithKeyViaUI, testServerConnectionViaUI } from '../helpers/ui-helpers';

test.describe('Server CRUD Operations', () => {
  let sshServer: SSHServer;
  const SSH_PORT = 2230;

  test.beforeAll(async () => {
    sshServer = await startFakeSSHServer(SSH_PORT, 'testuser', 'testpass');
  });

  test.afterAll(async () => {
    if (sshServer) {
      sshServer.close();
    }
  });

  test.beforeEach(async ({ request }) => {
    await resetDatabase(request);
  });

  test.describe('API Tests', () => {
    test('should create server with password auth', async ({ request }) => {
      const serverId = await createServerViaApi(
        request,
        'Test Server',
        'localhost',
        SSH_PORT,
        'testuser',
        'testpass'
      );

      expect(serverId).toBeGreaterThan(0);

      // Verify server exists
      const response = await request.get(`/api/v1/servers/${serverId}`);
      expect(response.ok()).toBeTruthy();
      const server = await response.json();
      expect(server.name).toBe('Test Server');
      expect(server.host).toBe('localhost');
      expect(server.port).toBe(SSH_PORT);
      expect(server.username).toBe('testuser');
      expect(server.auth_type).toBe('password');
    });

    test('should list all servers', async ({ request }) => {
      await createServerViaApi(request, 'Server 1', 'host1', SSH_PORT, 'user1', 'pass1');
      await createServerViaApi(request, 'Server 2', 'host2', SSH_PORT, 'user2', 'pass2');

      const response = await request.get('/api/v1/servers');
      expect(response.ok()).toBeTruthy();
      const servers = await response.json();
      expect(servers.length).toBe(2);
      expect(servers.map((s: any) => s.name)).toContain('Server 1');
      expect(servers.map((s: any) => s.name)).toContain('Server 2');
    });

    test('should update server details', async ({ request }) => {
      const serverId = await createServerViaApi(
        request,
        'Original Name',
        'localhost',
        SSH_PORT,
        'testuser',
        'testpass'
      );

      const updateResponse = await request.put(`/api/v1/servers/${serverId}`, {
        data: {
          name: 'Updated Name',
          host: 'newhost',
          port: 3333,
          username: 'newuser',
          auth_type: 'password',
        },
      });
      expect(updateResponse.ok()).toBeTruthy();

      const getResponse = await request.get(`/api/v1/servers/${serverId}`);
      const server = await getResponse.json();
      expect(server.name).toBe('Updated Name');
      expect(server.host).toBe('newhost');
      expect(server.port).toBe(3333);
      expect(server.username).toBe('newuser');
    });

    test('should delete server', async ({ request }) => {
      const serverId = await createServerViaApi(
        request,
        'To Delete',
        'localhost',
        SSH_PORT,
        'testuser',
        'testpass'
      );

      await deleteServerViaApi(request, serverId);

      const response = await request.get(`/api/v1/servers/${serverId}`);
      expect(response.status()).toBe(404);
    });

    test('should test connection successfully', async ({ request }) => {
      const serverId = await createServerViaApi(
        request,
        'Test Server',
        'localhost',
        SSH_PORT,
        'testuser',
        'testpass'
      );

      const response = await request.post(`/api/v1/servers/${serverId}/test-connection`);
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    test('should fail connection test with wrong credentials', async ({ request }) => {
      const serverId = await createServerViaApi(
        request,
        'Test Server',
        'localhost',
        SSH_PORT,
        'testuser',
        'wrongpass'
      );

      const response = await request.post(`/api/v1/servers/${serverId}/test-connection`);
      expect(response.ok()).toBeFalsy();
    });

    test('should return 404 for non-existent server', async ({ request }) => {
      const response = await request.get('/api/v1/servers/99999');
      expect(response.status()).toBe(404);
    });
  });

  test.describe('UI Tests', () => {
    test('should create server via UI with password auth', async ({ page }) => {
      await createServerViaUI(page, 'UI Server', 'localhost', SSH_PORT.toString(), 'testuser', 'testpass');

      // Verify server appears in list
      await expect(page.getByText('UI Server')).toBeVisible();
    });

    test('should create server via UI with SSH key', async ({ page }) => {
      await createServerWithKeyViaUI(
        page,
        'Key Server',
        'localhost',
        SSH_PORT.toString(),
        'testuser',
        SSH_PRIVATE_KEY
      );

      // Verify server appears in list
      await expect(page.getByText('Key Server')).toBeVisible();
    });

    test('should test connection via UI', async ({ page, request }) => {
      const serverId = await createServerViaApi(
        request,
        'Connection Test',
        'localhost',
        SSH_PORT,
        'testuser',
        'testpass'
      );

      await page.goto('/servers');
      const response = await testServerConnectionViaUI(page, serverId, 200);
      expect(response.ok()).toBeTruthy();
    });

    test('should show server list', async ({ page, request }) => {
      await createServerViaApi(request, 'Server A', 'hostA', SSH_PORT, 'userA', 'passA');
      await createServerViaApi(request, 'Server B', 'hostB', SSH_PORT, 'userB', 'passB');

      await page.goto('/servers');

      await expect(page.getByText('Server A')).toBeVisible();
      await expect(page.getByText('Server B')).toBeVisible();
    });

    test('should delete server via UI', async ({ page, request }) => {
      const serverId = await createServerViaApi(
        request,
        'To Delete Server',
        'localhost',
        SSH_PORT,
        'testuser',
        'testpass'
      );

      await page.goto('/servers');
      await expect(page.getByText('To Delete Server')).toBeVisible();

      // Click delete button
      await page.getByTestId(`delete-server-btn-${serverId}`).click();

      // Confirm deletion in dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: /delete/i }).click();

      // Verify dialog closes and server is removed
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText('To Delete Server')).not.toBeVisible();
    });
  });
});
