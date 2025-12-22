export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

export const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

export interface StatusBadge {
  color: string;
  text: string;
}

export const getStatusBadge = (status?: string): StatusBadge => {
  const badges: Record<string, StatusBadge> = {
    pending: { color: 'gray', text: 'Pending' },
    running: { color: 'blue', text: 'Running' },
    success: { color: 'green', text: 'Success' },
    completed: { color: 'green', text: 'Completed' },
    failed: { color: 'red', text: 'Failed' },
    error: { color: 'red', text: 'Error' },
  };
  
  return badges[status?.toLowerCase() || ''] || badges.pending;
};
