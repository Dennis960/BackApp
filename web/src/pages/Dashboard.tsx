import AddIcon from '@mui/icons-material/Add';
import BackupIcon from '@mui/icons-material/Backup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ComputerIcon from '@mui/icons-material/Computer';
import ErrorIcon from '@mui/icons-material/Error';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { backupProfileApi, backupRunApi, namingRuleApi, serverApi, storageLocationApi } from '../api';
import { BackupRunsList } from '../components/backup-profiles';
import { PrerequisitesAlert, StorageWidget } from '../components/common';
import type { BackupRun, NamingRule, StorageLocation } from '../types';

interface DashboardStats {
  servers: number;
  profiles: number;
  lastBackup: string;
  failed24h: number;
  lastFailedProfile: string;
  lastFailedAt: string;
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    servers: 0,
    profiles: 0,
    lastBackup: 'N/A',
    failed24h: 0,
    lastFailedProfile: 'N/A',
    lastFailedAt: 'N/A',
  });
  const [recentRuns, setRecentRuns] = useState<BackupRun[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [namingRules, setNamingRules] = useState<NamingRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getRunTimestamp = (run: BackupRun) => {
    const timestamp = run.end_time || run.start_time;
    return timestamp ? new Date(timestamp).getTime() : null;
  };

  const loadDashboardData = async () => {
    try {
      const [servers, profiles, runs, storageData, namingData] = await Promise.all([
        serverApi.list(),
        backupProfileApi.list(),
        backupRunApi.list(),
        storageLocationApi.list(),
        namingRuleApi.list(),
      ]);

      const lastSuccessfulRun = (runs || [])
        .filter((run) => run.status.toLowerCase() === 'success' || run.status.toLowerCase() === 'completed')
        .sort((a, b) => (getRunTimestamp(b) ?? 0) - (getRunTimestamp(a) ?? 0))[0];

      const failedRuns24h = (runs || []).filter((run) => {
        const runTime = getRunTimestamp(run);
        if (runTime === null) return false;
        const now = new Date();
        const diffHours = (now.getTime() - runTime) / (1000 * 60 * 60);
        return diffHours <= 24 && (run.status.toLowerCase() === 'failed' || run.status.toLowerCase() === 'error');
      });

      const profilesById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile.name]));
      const lastFailedRun = failedRuns24h
        .slice()
        .sort((a, b) => (getRunTimestamp(b) ?? 0) - (getRunTimestamp(a) ?? 0))[0];

      setStats({
        servers: servers.length || 0,
        profiles: profiles.length || 0,
        lastBackup: lastSuccessfulRun ? new Date(lastSuccessfulRun.end_time || lastSuccessfulRun.start_time || '').toLocaleString() : 'N/A',
        failed24h: failedRuns24h.length || 0,
        lastFailedProfile: lastFailedRun ? (profilesById[lastFailedRun.backup_profile_id] ?? `Profile #${lastFailedRun.backup_profile_id}`) : 'N/A',
        lastFailedAt: lastFailedRun ? new Date(lastFailedRun.end_time || lastFailedRun.start_time || '').toLocaleString() : 'N/A',
      });

      setRecentRuns(
        runs
          .sort((a, b) => new Date(b.start_time || '').getTime() - new Date(a.start_time || '').getTime())
          .slice(0, 5) || []
      );
      setStorageLocations(storageData || []);
      setNamingRules(namingData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  Total Servers
                </Typography>
                <ComputerIcon color="primary" />
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {stats.servers}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active connections
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  Backup Profiles
                </Typography>
                <BackupIcon color="primary" />
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {stats.profiles}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configured profiles
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  Last Backup
                </Typography>
                <CheckCircleIcon color="success" />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.lastBackup}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Latest successful run
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  Failed (24h)
                </Typography>
                <ErrorIcon color="error" />
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {stats.failed24h}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Needs attention
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Last failed: {stats.lastFailedProfile} at {stats.lastFailedAt}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StorageWidget />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ height: '100%' }}>
            <Box p={2} display="flex" justifyContent="space-between" alignItems="center" borderBottom={1} borderColor="divider">
              <Typography variant="h6">Recent Backup Runs</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={storageLocations.length === 0 || namingRules.length === 0}
                href="/backup-profiles"
              >
                Create Profile
              </Button>
            </Box>
            <Box p={2}>
              <BackupRunsList runs={recentRuns} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <PrerequisitesAlert storageLocationsCount={storageLocations.length} namingRulesCount={namingRules.length} />
    </Box>
  );
}

export default Dashboard;
