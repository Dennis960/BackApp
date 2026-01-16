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
import { useEffect, useState, useCallback } from 'react';
import { backupRunApi } from '../api';
import { BackupRunsList } from '../components/backup-profiles';
import type { BackupRun } from '../types';

function BackupRuns() {
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadRuns = useCallback(async () => {
    try {
      const data = await backupRunApi.list();
      const sorted = (data || []).slice().sort((a, b) => b.id - a.id);
      setRuns(sorted);
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();

    // Auto-refresh every 5 seconds if enabled
    const interval = autoRefresh ? setInterval(loadRuns, 5000) : undefined;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, loadRuns]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={12}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Typography variant="h5" component="h3">
          Backup Runs
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}>
            <Button
              variant={autoRefresh ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Refresh />}
              onClick={() => setAutoRefresh(!autoRefresh)}
              fullWidth
              sx={{ maxWidth: { sm: 'fit-content' } }}
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
          <BackupRunsList runs={runs} onRunDeleted={loadRuns} />
        </CardContent>
      </Card>
    </Box>
  );
}

export default BackupRuns;
