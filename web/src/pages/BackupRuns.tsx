import { Refresh } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { backupRunApi } from '../api';
import { BackupRunsList } from '../components/backup-profiles';
import type { BackupRun } from '../types';

function BackupRuns() {
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadRuns();

    // Auto-refresh every 5 seconds if enabled
    const interval = autoRefresh ? setInterval(loadRuns, 5000) : undefined;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadRuns = async () => {
    try {
      const data = await backupRunApi.list();
      setRuns(data || []);
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={12}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h3">
          Backup Runs
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}>
            <Button
              variant={autoRefresh ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Refresh />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-refresh' : 'Refresh'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {autoRefresh && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Auto-refreshing every 5 seconds
        </Alert>
      )}

      <Card>
        <CardContent>
          <BackupRunsList runs={runs} />
        </CardContent>
      </Card>
    </Box>
  );
}

export default BackupRuns;
