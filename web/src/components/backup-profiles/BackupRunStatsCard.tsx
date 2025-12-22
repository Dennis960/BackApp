import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { JSX } from 'react';
import type { BackupRun } from '../../types';

interface BackupRunStatsCardProps {
  run: BackupRun;
  formatSize: (bytes: number) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

function BackupRunStatsCard({ run, formatSize, getStatusBadge }: BackupRunStatsCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statistics
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Total Files:</Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {run.total_files || 0}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Total Size:</Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {formatSize(run.total_size_bytes || 0)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Status:</Typography>
            {getStatusBadge(run.status)}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default BackupRunStatsCard;
