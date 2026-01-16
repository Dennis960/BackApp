import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ComputerIcon from '@mui/icons-material/Computer';
import LabelIcon from '@mui/icons-material/Label';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { backupFileApi, backupProfileApi, backupRunApi } from '../api';
import BackupFilesTable, { type BackupFileRow, formatFileSize } from '../components/backups/BackupFilesTable';
import type { BackupProfile, BackupRun } from '../types';
import { formatDate } from '../utils/format';

function BackupProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<BackupProfile | null>(null);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [files, setFiles] = useState<BackupFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/backup-profiles');
  };

  useEffect(() => {
    if (!id) return;
    loadProfileAndFiles(parseInt(id, 10));
  }, [id]);

  const loadProfileAndFiles = async (profileId: number) => {
    try {
      setLoading(true);
      const [profileData, runsData] = await Promise.all([
        backupProfileApi.get(profileId),
        backupRunApi.list({ profileId }),
      ]);

      setProfile(profileData);
      setRuns(runsData || []);

      const filesByRun = await Promise.all(
        (runsData || []).map(async (run) => {
          const runFiles = await backupRunApi.getFiles(run.id);
          return (runFiles || []).map((file) => ({
            ...file,
            runId: run.id,
            runStatus: run.status,
            runStartedAt: run.start_time,
            runFinishedAt: run.end_time,
          } as BackupFileRow));
        })
      );

      setFiles(filesByRun.flat());
      setError(null);
    } catch (err) {
      console.error('Failed to load backup profile detail', err);
      setError('Failed to load backup profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!id) return;
    if (!confirm('Delete this backup file?')) return;
    try {
      await backupFileApi.delete(fileId);
      await loadProfileAndFiles(parseInt(id, 10));
    } catch (err) {
      console.error('Failed to delete backup file', err);
    }
  };

  const totalSize = useMemo(
    () => files.reduce((acc, f) => acc + (f.size_bytes || f.file_size || 0), 0),
    [files]
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={12}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error">{error || 'Backup profile not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back
        </Button>
        <Typography variant="h4" component="h3" fontWeight={700}>
          {profile.name}
        </Typography>
        <Chip label={profile.enabled ? 'Enabled' : 'Disabled'} color={profile.enabled ? 'success' : 'default'} />
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ComputerIcon fontSize="small" color="action" />
                  <Typography variant="body2">Server ID: {profile.server_id}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StorageIcon fontSize="small" color="action" />
                  <Typography variant="body2">Storage ID: {profile.storage_location_id}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LabelIcon fontSize="small" color="action" />
                  <Typography variant="body2">Naming Rule ID: {profile.naming_rule_id}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PlayArrowIcon fontSize="small" color="action" />
                  <Typography variant="body2">Runs: {runs.length}</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Backup Files Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Files
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {files.length}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Size
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {formatFileSize(totalSize)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last Run
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {runs.length ? `#${runs[0].id}` : 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {runs.length ? formatDate(runs[0].end_time || runs[0].start_time) : ''}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <BackupFilesTable
        files={files}
        title="Backup Files"
        groupByRun={true}
        initialLimit={10}
        showStatus={true}
        onDeleteFile={handleDeleteFile}
        emptyMessage="No backup files found for this profile."
      />
    </Box>
  );
}

export default BackupProfileDetail;
