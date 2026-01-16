import { fetchJSON, fetchWithoutResponse } from './client';

export interface PushSubscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  created_at: string;
}

export interface NotificationPreference {
  id: number;
  subscription_id: number;
  backup_profile_id?: number;
  server_id?: number;
  notify_on_start: boolean;
  notify_on_success: boolean;
  notify_on_failure: boolean;
  notify_on_consecutive_failures: boolean;
  consecutive_failure_threshold: number;
  notify_on_low_storage: boolean;
  low_storage_threshold: number;
  backup_profile?: {
    id: number;
    name: string;
  };
  server?: {
    id: number;
    name: string;
  };
}

export interface NotificationPreferenceInput {
  backup_profile_id?: number;
  server_id?: number;
  notify_on_start: boolean;
  notify_on_success: boolean;
  notify_on_failure: boolean;
  notify_on_consecutive_failures: boolean;
  consecutive_failure_threshold: number;
  notify_on_low_storage: boolean;
  low_storage_threshold: number;
}

export interface StorageUsage {
  storage_location_id: number;
  name: string;
  base_path: string;
  enabled: boolean;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  used_percent: number;
  free_percent: number;
  backup_count: number;
  backup_size_bytes: number;
}

export interface TotalStorageUsage {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  used_percent: number;
  free_percent: number;
  total_backups: number;
  total_backup_size_bytes: number;
  locations: StorageUsage[];
}

export const notificationApi = {
  // Get VAPID public key for subscription
  getVapidKey: (): Promise<{ public_key: string }> =>
    fetchJSON('/notifications/vapid-key'),

  // Subscribe to push notifications
  subscribe: (subscription: PushSubscriptionJSON & { user_agent?: string }): Promise<PushSubscription> =>
    fetchJSON('/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    }),

  // Unsubscribe from push notifications
  unsubscribe: (endpoint: string): Promise<void> =>
    fetchJSON('/notifications/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }),

  // Get current subscription
  getSubscription: (endpoint: string): Promise<PushSubscription> =>
    fetchJSON(`/notifications/subscription?endpoint=${encodeURIComponent(endpoint)}`),

  // Get notification preferences
  getPreferences: (endpoint: string): Promise<NotificationPreference[]> =>
    fetchJSON(`/notifications/preferences?endpoint=${encodeURIComponent(endpoint)}`),

  // Create a new preference
  createPreference: (endpoint: string, preference: NotificationPreferenceInput): Promise<NotificationPreference> =>
    fetchJSON(`/notifications/preferences?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    }),

  // Update a preference
  updatePreference: (id: number, preference: NotificationPreferenceInput): Promise<NotificationPreference> =>
    fetchJSON(`/notifications/preferences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    }),

  // Delete a preference
  deletePreference: (id: number): Promise<boolean> =>
    fetchWithoutResponse(`/notifications/preferences/${id}`, {
      method: 'DELETE',
    }),

  // Send test notification
  sendTest: (endpoint: string): Promise<void> =>
    fetchJSON(`/notifications/test?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'POST',
    }),
};

export const storageUsageApi = {
  // Get total storage usage
  getUsage: (): Promise<TotalStorageUsage> =>
    fetchJSON('/storage-usage'),

  // Get storage usage for a specific location
  getLocationUsage: (locationId: number): Promise<StorageUsage> =>
    fetchJSON(`/storage-locations/${locationId}/usage`),
};

// Helper to convert bytes to human readable format
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
