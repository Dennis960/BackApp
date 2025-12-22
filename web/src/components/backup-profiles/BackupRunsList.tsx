import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { BackupRun } from '../../types';
import { formatDate } from '../../utils/format';

interface BackupRunsListProps {
  runs: BackupRun[];
  compact?: boolean;
}

function BackupRunsList({ runs, compact = false }: BackupRunsListProps) {
  const navigate = useNavigate();
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

  if (runs.length === 0) {
    return (
      <Box textAlign="center" py={compact ? 8 : 12}>
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
            {!compact && <TableCell>Files</TableCell>}
            {!compact && <TableCell>Size</TableCell>}
            {!compact && <TableCell>Started</TableCell>}
            {!compact && <TableCell>Duration</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((run) => {
            const startTime = run.start_time || run.started_at || '';
            const endTime = run.end_time || run.finished_at || '';

            let duration = '-';
            if (!compact && startTime) {
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
                <TableCell>Profile #{run.backup_profile_id}</TableCell>
                <TableCell>
                  <Box>
                    {getStatusBadge(run.status)}
                    {!compact && run.error_message && (
                      <Tooltip title={run.error_message}>
                        <Typography variant="caption" color="error" display="block" mt={0.5}>
                          Error: {run.error_message.substring(0, 50)}...
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                {!compact && <TableCell>{run.total_files || 0}</TableCell>}
                {!compact && <TableCell>{formatSize(run.total_size_bytes || 0)}</TableCell>}
                {!compact && <TableCell>{formatDate(startTime)}</TableCell>}
                {!compact && <TableCell>{duration}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default BackupRunsList;
