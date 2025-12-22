import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { backupRunApi } from '../api';
import {
  BackupRunFilesCard,
  BackupRunInfoCard,
  BackupRunLogsCard,
  BackupRunStatsCard,
} from '../components/backup-profiles';
import type { BackupFile, BackupRun, BackupRunLog } from '../types';

function BackupRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<BackupRun | null>(null);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [logs, setLogs] = useState<BackupRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadRunDetails(parseInt(id));
    }
  }, [id]);

  // Poll for new logs when backup is running
  useEffect(() => {
    if (!run || run.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      if (id) {
        loadNewLogs(parseInt(id));
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [run?.status, id, logs.length]);

  // Periodically refresh run status when running (without loading state)
  useEffect(() => {
    if (!run || run.status !== 'running') {
      return;
    }

    const interval = setInterval(async () => {
      if (id) {
        try {
          const runData = await backupRunApi.get(parseInt(id));
          setRun(runData);

          // If backup completed, load final files list
          if (runData.status !== 'running') {
            const filesData = await backupRunApi.getFiles(parseInt(id));
            setFiles(filesData || []);
          }
        } catch (err) {
          console.error('Error refreshing run status:', err);
        }
      }
    }, 5000); // Check status every 5 seconds

    return () => clearInterval(interval);
  }, [run?.status, id]);

  const loadRunDetails = async (runId: number) => {
    try {
      setLoading(true);
      const [runData, filesData, logsData] = await Promise.all([
        backupRunApi.get(runId),
        backupRunApi.getFiles(runId),
        backupRunApi.getLogs(runId),
      ]);
      setRun(runData);
      setFiles(filesData || []);
      setLogs(logsData || []);
      setError(null);
    } catch (err) {
      console.error('Error loading backup run:', err);
      setError('Failed to load backup run details');
    } finally {
      setLoading(false);
    }
  };

  const loadNewLogs = async (runId: number) => {
    try {
      const logsData = await backupRunApi.getLogs(runId);
      if (logsData && logsData.length > logs.length) {
        // Only append new logs
        setLogs(logsData);
      }
    } catch (err) {
      console.error('Error loading new logs:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: 'Pending' },
      running: { color: 'info', text: 'Running' },
      success: { color: 'success', text: 'Success' },
      completed: { color: 'success', text: 'Completed' },
      failed: { color: 'error', text: 'Failed' },
      error: { color: 'error', text: 'Error' },
    };

    const key = status?.toLowerCase();
    const badge = Object.prototype.hasOwnProperty.call(badges, key)
      ? badges[key]
      : badges.pending;

    return (
      <Chip
        label={badge.text}
        color={badge.color as any}
        size="medium"
      />
    );
  };

  const formatSize = (bytes: number) => {
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

  const calculateDuration = () => {
    if (!run) return '-';
    const startTime = run.start_time || run.started_at || '';
    const endTime = run.end_time || run.finished_at || '';

    if (!startTime) return '-';

    if (endTime) {
      const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    } else if (run.status === 'running') {
      return 'Running...';
    }

    return '-';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={12}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !run) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/backup-runs')}
          sx={{ mb: 3 }}
        >
          Back to Backup Runs
        </Button>
        <Alert severity="error">{error || 'Backup run not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/backup-runs')}
          >
            Back
          </Button>
          <Typography variant="h4" component="h3">
            Backup Run #{run.id}
          </Typography>
          {getStatusBadge(run.status)}
        </Box>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <BackupRunInfoCard run={run} duration={calculateDuration()} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <BackupRunStatsCard
            run={run}
            formatSize={formatSize}
            getStatusBadge={getStatusBadge}
          />
        </Grid>
      </Grid>

      {run.error_message && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Error Message
          </Typography>
          <Typography variant="body2" fontFamily="monospace">
            {run.error_message}
          </Typography>
        </Alert>
      )}

      <BackupRunLogsCard logs={logs} isRunning={run.status === 'running'} />

      <Box mt={3}>
        <BackupRunFilesCard
          files={files}
          formatSize={formatSize}
          onDownload={handleDownloadFile}
        />
      </Box>
    </Box>
  );
}

export default BackupRunDetail;
