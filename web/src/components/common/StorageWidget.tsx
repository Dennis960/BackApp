import StorageIcon from '@mui/icons-material/Storage';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { formatBytes, storageUsageApi, type TotalStorageUsage } from '../../api';

interface StorageWidgetProps {
  compact?: boolean;
}

export function StorageWidget({ compact = false }: StorageWidgetProps) {
  const [usage, setUsage] = useState<TotalStorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsage();
    const intervalId = window.setInterval(loadUsage, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const loadUsage = async () => {
    try {
      const data = await storageUsageApi.getUsage();
      setUsage(data);
    } catch (err) {
      console.error('Error loading storage usage:', err);
      setError('Failed to load storage usage');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={compact ? 60 : 120}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography color="text.secondary">{error || 'No data'}</Typography>
        </CardContent>
      </Card>
    );
  }

  const isLowStorage = usage.free_percent < 10;
  const isWarningStorage = usage.free_percent < 20;

  const getProgressColor = (percent: number): 'success' | 'warning' | 'error' => {
    if (percent > 90) return 'error';
    if (percent > 70) return 'warning';
    return 'success';
  };

  if (compact) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary" fontWeight="medium">
              Storage Usage
            </Typography>
            {isLowStorage ? (
              <WarningIcon color="error" />
            ) : isWarningStorage ? (
              <WarningIcon color="warning" />
            ) : (
              <StorageIcon color="primary" />
            )}
          </Box>
          <Typography variant="h4" fontWeight="bold">
            {usage.used_percent.toFixed(1)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={usage.used_percent}
            color={getProgressColor(usage.used_percent)}
            sx={{ mt: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {formatBytes(usage.free_bytes)} free of {formatBytes(usage.total_bytes)}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }} data-testid="storage-widget">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Storage Usage</Typography>
          {isLowStorage ? (
            <Tooltip title="Storage is critically low!">
              <WarningIcon color="error" />
            </Tooltip>
          ) : isWarningStorage ? (
            <Tooltip title="Storage is running low">
              <WarningIcon color="warning" />
            </Tooltip>
          ) : (
            <StorageIcon color="primary" />
          )}
        </Box>

        {/* Overall usage */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Total Usage
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {usage.used_percent.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={usage.used_percent}
            color={getProgressColor(usage.used_percent)}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Box display="flex" justifyContent="space-between" mt={0.5}>
            <Typography variant="caption" color="text.secondary">
              {formatBytes(usage.used_bytes)} used
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatBytes(usage.free_bytes)} free
            </Typography>
          </Box>
        </Box>

        {/* Backup stats */}
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {usage.total_backups.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Files
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="h5" fontWeight="bold">
              {formatBytes(usage.total_backup_size_bytes)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Backup Size
            </Typography>
          </Box>
        </Box>

        {/* Per-location breakdown */}
        {usage.locations.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              By Location
            </Typography>
            {usage.locations.map((loc) => (
              <Box key={loc.storage_location_id} mb={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" noWrap sx={{ maxWidth: '60%' }}>
                    {loc.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loc.enabled ? formatBytes(loc.backup_size_bytes) : 'Disabled'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={loc.total_bytes > 0 && loc.enabled ? loc.used_percent : 0}
                  color={getProgressColor(loc.used_percent)}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
