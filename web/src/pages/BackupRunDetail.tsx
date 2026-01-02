import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Snackbar,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { backupRunApi, backupFileApi } from '../api';
import {
  BackupRunFilesCard,
  BackupRunInfoCard,
  BackupRunLogsCard,
  BackupRunStatsCard,
} from '../components/backup-profiles';
import { DestructiveActionDialog, type DestructiveAction } from '../components/common';
import type { BackupFile, BackupRun, BackupRunLog, DeletionImpact } from '../types';

function BackupRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<BackupRun | null>(null);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [logs, setLogs] = useState<BackupRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Delete run confirmation state
  const [deleteRunDialogOpen, setDeleteRunDialogOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Delete file confirmation state
  const [deleteFileDialogOpen, setDeleteFileDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<BackupFile | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);

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
    const startTime = run.start_time || '';
    const endTime = run.end_time || '';

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

  // Delete run handlers
  const handleDeleteRunRequest = async () => {
    if (!id) return;

    setLoadingImpact(true);
    setDeleteRunDialogOpen(true);

    try {
      const impact = await backupRunApi.getDeletionImpact(parseInt(id));
      setDeletionImpact(impact);
    } catch (error) {
      console.error('Error loading deletion impact:', error);
      setDeletionImpact({ backup_profiles: 0, backup_runs: 1, backup_files: files.length, total_size_bytes: 0 });
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleConfirmDeleteRun = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      await backupRunApi.delete(parseInt(id));
      setSnackbar({
        open: true,
        message: 'Backup run deleted successfully',
        severity: 'success',
      });
      navigate('/backup-runs');
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete backup run',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteRunDialogOpen(false);
      setDeletionImpact(null);
    }
  };

  const handleCancelDeleteRun = () => {
    setDeleteRunDialogOpen(false);
    setDeletionImpact(null);
  };

  // Delete file handlers
  const handleDeleteFileRequest = (fileId: number) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    setFileToDelete(file);
    setDeleteFileDialogOpen(true);
  };

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;

    setDeletingFile(true);
    try {
      await backupFileApi.delete(fileToDelete.id);
      setSnackbar({
        open: true,
        message: 'File deleted successfully',
        severity: 'success',
      });
      // Refresh files list
      if (id) {
        const filesData = await backupRunApi.getFiles(parseInt(id));
        setFiles(filesData || []);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete file',
        severity: 'error',
      });
    } finally {
      setDeletingFile(false);
      setDeleteFileDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleCancelDeleteFile = () => {
    setDeleteFileDialogOpen(false);
    setFileToDelete(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getDeleteRunActions = (): DestructiveAction[] => {
    if (!deletionImpact) return [];
    const actions: DestructiveAction[] = [];

    if (deletionImpact.backup_files > 0) {
      actions.push({
        type: 'delete',
        label: `Delete ${deletionImpact.backup_files} backup file${deletionImpact.backup_files !== 1 ? 's' : ''} from disk`,
        details: `Total size: ${formatSize(deletionImpact.total_size_bytes)}`,
      });
    }

    actions.push({
      type: 'delete',
      label: 'Delete backup run logs and metadata',
    });

    return actions;
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
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/backup-runs')}
          >
            Back
          </Button>
          <Typography variant="h5" component="h3">
            Backup Run #{run.id}
          </Typography>
          {getStatusBadge(run.status)}
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteRunRequest}
          fullWidth
          sx={{ maxWidth: { sm: 'fit-content' } }}
        >
          Delete Run
        </Button>
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
          onDeleteFile={handleDeleteFileRequest}
        />
      </Box>

      {/* Delete Run Confirmation Dialog */}
      <DestructiveActionDialog
        open={deleteRunDialogOpen}
        title={`Delete Backup Run #${run.id}`}
        description="Are you sure you want to delete this backup run? This will permanently delete all associated files from disk."
        actionType="delete"
        impact={{
          backupRuns: 1,
          backupFiles: deletionImpact?.backup_files,
          totalSizeBytes: deletionImpact?.total_size_bytes,
          filePaths: deletionImpact?.file_paths,
        }}
        actions={getDeleteRunActions()}
        onConfirm={handleConfirmDeleteRun}
        onCancel={handleCancelDeleteRun}
        confirmText="Delete Backup Run"
        loading={deleting || loadingImpact}
      />

      {/* Delete File Confirmation Dialog */}
      <DestructiveActionDialog
        open={deleteFileDialogOpen}
        title="Delete Backup File"
        description={`Are you sure you want to delete "${fileToDelete?.remote_path || ''}"?`}
        actionType="delete"
        impact={{
          backupFiles: 1,
          totalSizeBytes: fileToDelete?.size_bytes ?? fileToDelete?.file_size ?? 0,
        }}
        actions={[
          {
            type: 'delete',
            label: 'Delete file from disk',
            details: fileToDelete?.local_path,
          },
          {
            type: 'delete',
            label: 'Mark file as deleted in database',
          },
        ]}
        onConfirm={handleConfirmDeleteFile}
        onCancel={handleCancelDeleteFile}
        confirmText="Delete File"
        loading={deletingFile}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default BackupRunDetail;
