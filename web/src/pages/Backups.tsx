import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { backupProfileApi, backupRunApi, storageLocationApi } from '../api';
import type { BackupProfile, BackupRun, BackupFile, StorageLocation } from '../types';
import BackupFilesTable, { type BackupFileRow } from '../components/backups/BackupFilesTable';

export default function Backups() {
  const [profiles, setProfiles] = useState<BackupProfile[]>([]);
  const [locations, setLocations] = useState<Record<number, StorageLocation>>({});
  const [filesByProfile, setFilesByProfile] = useState<Record<number, BackupFileRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (autoRefresh) {
      interval = window.setInterval(async () => {
        await loadProfileFiles(profiles);
      }, 5000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [autoRefresh, profiles]);

  const loadProfileFiles = async (profilesData: BackupProfile[]) => {
    const filesEntries = await Promise.all(
      (profilesData || []).map(async (p) => {
        const runs = await backupRunApi.list({ profileId: p.id });
        const filesByRun = await Promise.all(
          (runs || []).map(async (run: BackupRun) => {
            const runFiles = await backupRunApi.getFiles(run.id);
            return (runFiles || []).map((file: BackupFile) => ({
              ...file,
              runId: run.id,
              runStatus: run.status,
              runStartedAt: run.start_time,
              runFinishedAt: run.end_time,
            } as BackupFileRow));
          })
        );
        return [p.id, filesByRun.flat()] as const;
      })
    );
    setFilesByProfile(Object.fromEntries(filesEntries));
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [profilesData, locationsData] = await Promise.all([
        backupProfileApi.list(),
        storageLocationApi.list(),
      ]);

      setProfiles(profilesData || []);
      const locMap = Object.fromEntries((locationsData || []).map((l) => [l.id, l]));
      setLocations(locMap);

      // Load files for each profile
      await loadProfileFiles(profilesData || []);

      setError(null);
    } catch (err) {
      console.error('Error loading backups page:', err);
      setError('Failed to load backups data');
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
        <Box display="flex" alignItems="center" gap={1}>
          <FolderOpenIcon />
          <Typography variant="h4" component="h3">Backups</Typography>
        </Box>
        <Tooltip title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}>
          <IconButton onClick={() => setAutoRefresh(!autoRefresh)} color={autoRefresh ? 'primary' : 'default'}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {profiles.length === 0 ? (
        <Alert severity="info">No backup profiles found.</Alert>
      ) : (
        <Grid container spacing={3}>
          {profiles.map((profile) => {
            const location = locations[profile.storage_location_id];
            const files = filesByProfile[profile.id] || [];
            return (
              <Grid key={profile.id} size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box>
                        <Typography variant="h6">{profile.name}</Typography>
                        {location && (
                          <Typography variant="body2" color="text.secondary">
                            Storage: {location.name} ({location.base_path})
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <BackupFilesTable
                      files={files}
                      title={`Backup Files (${files.length})`}
                      groupByRun={true}
                      emptyMessage="No backup files for this profile."
                    />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
