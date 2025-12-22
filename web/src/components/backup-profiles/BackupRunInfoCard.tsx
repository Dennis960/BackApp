import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import type { BackupRun } from '../../types';
import { formatDate } from '../../utils/format';

interface BackupRunInfoCardProps {
  run: BackupRun;
  duration: string;
}

function BackupRunInfoCard({ run, duration }: BackupRunInfoCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          General Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Profile ID:</Typography>
            <Typography fontWeight="medium">#{run.backup_profile_id}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Started:</Typography>
            <Typography fontWeight="medium">
              {formatDate(run.start_time || run.started_at || '')}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Finished:</Typography>
            <Typography fontWeight="medium">
              {run.end_time || run.finished_at
                ? formatDate(run.end_time || run.finished_at || '')
                : '-'}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Duration:</Typography>
            <Typography fontWeight="medium">{duration}</Typography>
          </Box>
          {run.local_backup_path && (
            <Box display="flex" justifyContent="space-between">
              <Typography color="text.secondary">Backup Path:</Typography>
              <Typography
                fontWeight="medium"
                fontFamily="monospace"
                fontSize="0.875rem"
              >
                {run.local_backup_path}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default BackupRunInfoCard;
