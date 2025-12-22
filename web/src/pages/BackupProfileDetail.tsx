import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ComputerIcon from '@mui/icons-material/Computer';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
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
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { backupProfileApi, backupRunApi } from '../api';
import type { BackupFile, BackupProfile, BackupRun } from '../types';
import { formatDate } from '../utils/format';

interface ProfileFileRow extends BackupFile {
  runId: number;
  runStatus?: string;
  runStartedAt?: string;
  runFinishedAt?: string;
}

function BackupProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<BackupProfile | null>(null);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [files, setFiles] = useState<ProfileFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            runStartedAt: run.start_time || run.started_at,
            runFinishedAt: run.end_time || run.finished_at,
          } as ProfileFileRow));
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

  const totalSize = useMemo(
    () => files.reduce((acc, f) => acc + (f.size_bytes || f.file_size || 0), 0),
    [files]
  );

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const handleDownloadFile = (fileId: number, filePath: string) => {
    const downloadUrl = `/api/v1/backup-files/${fileId}/download`;
    const fileName = filePath.split('/').pop() || 'download';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/backup-profiles')} sx={{ mb: 2 }}>
          Back to Backup Profiles
        </Button>
        <Alert severity="error">{error || 'Backup profile not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/backup-profiles')}>
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
                      {formatSize(totalSize)}
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
                      {runs.length ? formatDate(runs[0].finished_at || runs[0].end_time || runs[0].start_time || runs[0].started_at) : ''}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FolderIcon color="action" />
            <Typography variant="h6" fontWeight={600}>
              Backup Files
            </Typography>
          </Box>

          {files.length === 0 ? (
            <Alert severity="info">No backup files found for this profile.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Run</TableCell>
                    <TableCell>Remote Path</TableCell>
                    <TableCell>Local Path</TableCell>
                    <TableCell align="right">Size</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id} hover>
                      <TableCell>
                        <Button size="small" onClick={() => navigate(`/backup-runs/${file.runId}`)}>
                          #{file.runId}
                        </Button>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {file.runStatus}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {file.remote_path}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {file.local_path}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatSize(file.size_bytes || file.file_size)}</TableCell>
                      <TableCell>{formatDate(file.created_at)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Download file">
                          <IconButton size="small" onClick={() => handleDownloadFile(file.id, file.remote_path || file.local_path)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default BackupProfileDetail;
