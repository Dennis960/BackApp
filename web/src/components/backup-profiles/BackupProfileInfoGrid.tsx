import {
  Computer as ComputerIcon,
  Error as ErrorIcon,
  History as HistoryIcon,
  Label as LabelIcon,
  HourglassEmpty as RunningIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { Box, Chip, Grid, Typography } from '@mui/material';
import { parseExpression } from 'cron-parser';
import { useMemo } from 'react';
import type { BackupProfile } from '../../types';

interface BackupProfileInfoGridProps {
  profile: BackupProfile;
}

function BackupProfileInfoGrid({ profile }: BackupProfileInfoGridProps) {
  const lastRun = profile.backup_runs && profile.backup_runs.length > 0 ? profile.backup_runs[0] : null;
  const totalRuns = profile.backup_runs?.length || 0;

  const nextRunTime = useMemo(() => {
    if (!profile.schedule_cron) return null;
    try {
      const interval = parseExpression(profile.schedule_cron, {
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      return interval.next().toDate();
    } catch (error) {
      console.error('Invalid cron expression for schedule:', error);
      return null;
    }
  }, [profile.schedule_cron]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <SuccessIcon fontSize="small" color="success" />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'running':
        return <RunningIcon fontSize="small" color="primary" />;
      default:
        return <HistoryIcon fontSize="small" color="action" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid size={{ xs: 12, md: 3, sm: 6 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <ComputerIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            Server: <strong>{profile.server?.name || `ID ${profile.server_id}`}</strong>
          </Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 3, sm: 6 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <StorageIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            Storage: <strong>{profile.storage_location?.name || `ID ${profile.storage_location_id}`}</strong>
          </Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 3, sm: 6 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LabelIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            Naming: <strong>{profile.naming_rule?.name || `ID ${profile.naming_rule_id}`}</strong>
          </Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 3, sm: 6 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            Runs: <strong>{totalRuns} total</strong>
          </Typography>
        </Box>
      </Grid>
      {lastRun && (
        <Grid size={{ xs: 12 }}>
          <Box display="flex" alignItems="center" gap={1}>
            {getStatusIcon(lastRun.status)}
            <Typography variant="body2" color="text.secondary">Last run:</Typography>
            <Chip
              label={lastRun.status || 'unknown'}
              size="small"
              color={getStatusColor(lastRun.status) as any}
              sx={{ textTransform: 'capitalize' }}
            />
            {lastRun.start_time && (
              <Typography variant="body2" color="text.secondary">
                • {new Date(lastRun.start_time).toLocaleString()}
              </Typography>
            )}
          </Box>
        </Grid>
      )}
      {profile.schedule_cron && (
        <Grid size={{ xs: 12 }}>
          <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Schedule: <strong>{profile.schedule_cron}</strong>
              </Typography>
            </Box>
            {nextRunTime && (
              <Typography variant="body2" color="text.secondary" sx={{ pl: 3 }}>
                Next run: <strong>{nextRunTime.toLocaleString()}</strong>
              </Typography>
            )}
          </Box>
        </Grid>
      )}
    </Grid>
  );
}

export default BackupProfileInfoGrid;
