import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import {
  Box,
  Chip,
  Paper,
  TablePagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BackupRun, DeletionImpact } from '../../types';
import { formatDate } from '../../utils/format';
import { backupProfileApi, backupRunApi } from '../../api';
import { DestructiveActionDialog, type DestructiveAction } from '../common';

interface BackupRunsListProps {
  runs: BackupRun[];
  onRunDeleted?: () => void;
}

function BackupRunsList({ runs, onRunDeleted }: BackupRunsListProps) {
  const navigate = useNavigate();
  const [profilesMap, setProfilesMap] = useState<Record<number, string>>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState<BackupRun | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profiles = await backupProfileApi.list();
        const map = Object.fromEntries((profiles || []).map((p) => [p.id, p.name])) as Record<number, string>;
        setProfilesMap(map);
      } catch (e) {
        console.error('Error loading profiles for mapping:', e);
      }
    })();
  }, []);

  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) => {
      const aTime = new Date(a.start_time || a.end_time || 0).getTime();
      const bTime = new Date(b.start_time || b.end_time || 0).getTime();
      return bTime - aTime;
    });
  }, [runs]);

  const paginatedRuns = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedRuns.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, sortedRuns]);

  useEffect(() => {
    setPage(0);
  }, [sortedRuns.length]);
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
        size="small"
      />
    );
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const handleDeleteRequest = async (run: BackupRun, e: React.MouseEvent) => {
    e.stopPropagation();
    setRunToDelete(run);
    setLoadingImpact(true);
    setDeleteDialogOpen(true);

    try {
      const impact = await backupRunApi.getDeletionImpact(run.id);
      setDeletionImpact(impact);
    } catch (error) {
      console.error('Error loading deletion impact:', error);
      setDeletionImpact({ backup_profiles: 0, backup_runs: 1, backup_files: 0, total_size_bytes: 0 });
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!runToDelete) return;

    setDeleting(true);
    try {
      await backupRunApi.delete(runToDelete.id);
      if (onRunDeleted) {
        onRunDeleted();
      } else {
        navigate(0); // Refresh page if no callback provided
      }
    } catch (error) {
      console.error('Failed to delete run:', error);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRunToDelete(null);
      setDeletionImpact(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setRunToDelete(null);
    setDeletionImpact(null);
  };

  const getDeleteActions = (): DestructiveAction[] => {
    if (!deletionImpact) return [];
    const actions: DestructiveAction[] = [];

    if (deletionImpact.backup_files > 0) {
      actions.push({
        type: 'delete',
        label: `Delete ${deletionImpact.backup_files} backup file${deletionImpact.backup_files !== 1 ? 's' : ''} from disk`,
        details: `Total size: ${formatSize(deletionImpact.total_size_bytes)}`,
      });
    }

    if (deletionImpact.backup_files === 0 && deletionImpact.backup_path) {
      actions.push({
        type: 'delete',
        label: 'Delete leftover backup directory from disk',
        details: deletionImpact.backup_path,
      });
    }

    actions.push({
      type: 'delete',
      label: 'Delete backup run logs and metadata',
    });

    return actions;
  };

  if (runs.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <PlayArrowIcon sx={{ fontSize: 80, opacity: 0.5, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No backup runs yet
        </Typography>
        <Typography color="text.secondary">
          Run a backup profile to see results here
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Profile</TableCell>
            <TableCell>Status</TableCell>
              <TableCell>Files</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedRuns.map((run) => {
            const startTime = run.start_time || '';
            const endTime = run.end_time || '';

            let duration = '-';
            if (startTime) {
              if (endTime) {
                const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
                duration = Math.round(durationMs / 1000) + 's';
              } else if (run.status === 'running') {
                duration = 'Running...';
              }
            }

            return (
              <TableRow
                key={run.id}
                hover
                onClick={() => navigate(`/backup-runs/${run.id}`)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  }
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    #{run.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/backup-profiles/${run.backup_profile_id}`);
                    }}
                  >
                    {profilesMap[run.backup_profile_id] ?? `Profile #${run.backup_profile_id}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {getStatusBadge(run.status)}
                    {run.retention_cleaned_up && (
                      <Tooltip title="Files cleaned up by retention policy">
                        <CleaningServicesIcon fontSize="small" color="warning" />
                      </Tooltip>
                    )}
                    {run.error_message && (
                      <Tooltip title={run.error_message}>
                        <Typography variant="caption" color="error" display="block" mt={0.5}>
                          Error: {run.error_message.substring(0, 50)}...
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{run.total_files || 0}</TableCell>
                <TableCell>{formatSize(run.total_size_bytes || 0)}</TableCell>
                <TableCell>{formatDate(startTime)}</TableCell>
                <TableCell>{duration}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete backup run">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteRequest(run, e)}
                      aria-label={`Delete run #${run.id}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={sortedRuns.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />

      <DestructiveActionDialog
        open={deleteDialogOpen}
        title={`Delete Backup Run #${runToDelete?.id || ''}`}
        description="Are you sure you want to delete this backup run? This will permanently delete all associated files from disk."
        actionType="delete"
        impact={{
          backupRuns: 1,
          backupFiles: deletionImpact?.backup_files,
          totalSizeBytes: deletionImpact?.total_size_bytes,
          filePaths: deletionImpact?.file_paths,
          backupPath: deletionImpact?.backup_path,
        }}
        actions={getDeleteActions()}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete Backup Run"
        loading={deleting || loadingImpact}
      />
    </TableContainer>
  );
}

export default BackupRunsList;
