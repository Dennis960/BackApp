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
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { backupProfileApi, backupRunApi, storageLocationApi } from '../api';
import type { BackupProfile, BackupRun, BackupFile, StorageLocation } from '../types';
import BackupFilesTable, { type BackupFileRow } from '../components/backups/BackupFilesTable';

export default function Backups() {
  const [profiles, setProfiles] = useState<BackupProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [locations, setLocations] = useState<Record<number, StorageLocation>>({});
  const [files, setFiles] = useState<BackupFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadProfileFiles = useCallback(async (profileId: number) => {
    const runs = await backupRunApi.list({ profileId });
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
    setFiles(filesByRun.flat());
  }, []);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (autoRefresh && selectedProfileId !== null) {
      interval = window.setInterval(async () => {
        await loadProfileFiles(selectedProfileId);
      }, 5000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [autoRefresh, selectedProfileId, loadProfileFiles]);

  useEffect(() => {
    if (selectedProfileId !== null) {
      loadProfileFiles(selectedProfileId).catch((err) => {
        console.error('Error loading profile files:', err);
        setError('Failed to load backups data');
      });
    }
  }, [selectedProfileId, loadProfileFiles]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [profilesData, locationsData] = await Promise.all([
        backupProfileApi.list(),
        storageLocationApi.list(),
      ]);

      const nextProfiles = profilesData || [];
      setProfiles(nextProfiles);
      const locMap = Object.fromEntries((locationsData || []).map((l) => [l.id, l]));
      setLocations(locMap);

      if (nextProfiles.length > 0) {
        setSelectedProfileId((current) => current ?? nextProfiles[0].id);
      }

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
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <FolderOpenIcon />
          <Typography variant="h5" component="h3">Backups</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            select
            size="small"
            label="Profile"
            value={selectedProfileId?.toString() ?? ''}
            onChange={(event) => setSelectedProfileId(Number(event.target.value))}
            sx={{ minWidth: 220 }}
            disabled={profiles.length === 0}
          >
            {profiles.map((profile) => (
              <MenuItem key={profile.id} value={String(profile.id)}>
                {profile.name}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}>
            <IconButton onClick={() => setAutoRefresh(!autoRefresh)} color={autoRefresh ? 'primary' : 'default'}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {profiles.length === 0 ? (
        <Alert severity="info">No backup profiles found.</Alert>
      ) : selectedProfileId === null ? (
        <Alert severity="info">Select a backup profile to view its files.</Alert>
      ) : (
        (() => {
          const profile = profiles.find((item) => item.id === selectedProfileId);
          const location = profile ? locations[profile.storage_location_id] : undefined;

          return profile ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
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
            </Grid>
          ) : null;
        })()
      )}
    </Box>
  );
}
