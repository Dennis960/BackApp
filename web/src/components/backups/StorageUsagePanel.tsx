import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { formatBytes, storageUsageApi, type TotalStorageUsage } from '../../api';

export default function StorageUsagePanel() {
  const [usage, setUsage] = useState<TotalStorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    storageUsageApi.getUsage()
      .then(setUsage)
      .catch((err) => {
        console.error('Error loading storage usage:', err);
        setError('Failed to load storage usage');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !usage) {
    return <Alert severity="error">{error || 'Storage usage is unavailable'}</Alert>;
  }

  return (
    <Box display="grid" gap={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Usage by profile</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Recorded size of non-deleted backup files, grouped by profile and storage location.
          </Typography>
          {usage.profiles.length === 0 ? (
            <Alert severity="info">No backup profiles found.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Profile</TableCell>
                    <TableCell>Storage location</TableCell>
                    <TableCell>Path</TableCell>
                    <TableCell align="right">Files</TableCell>
                    <TableCell align="right">Backup size</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usage.profiles.map((profile) => (
                    <TableRow key={profile.backup_profile_id}>
                      <TableCell>{profile.profile_name}</TableCell>
                      <TableCell>{profile.storage_location_name}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{profile.base_path}</TableCell>
                      <TableCell align="right">{profile.backup_count.toLocaleString()}</TableCell>
                      <TableCell align="right">{formatBytes(profile.backup_size_bytes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Usage by storage location</Typography>
          {usage.locations.length === 0 ? (
            <Alert severity="info">No storage locations found.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Location</TableCell>
                    <TableCell>Path</TableCell>
                    <TableCell align="right">Backup files</TableCell>
                    <TableCell align="right">Backup size on disk</TableCell>
                    <TableCell align="right">Filesystem used</TableCell>
                    <TableCell align="right">Free</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usage.locations.map((location) => (
                    <TableRow key={location.storage_location_id}>
                      <TableCell>{location.name}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{location.base_path}</TableCell>
                      <TableCell align="right">{location.backup_count.toLocaleString()}</TableCell>
                      <TableCell align="right">{formatBytes(location.backup_size_bytes)}</TableCell>
                      <TableCell align="right">
                        <Box minWidth={120}>
                          <Typography variant="body2">
                            {formatBytes(location.used_bytes)} ({location.used_percent.toFixed(1)}%)
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(Math.max(location.used_percent, 0), 100)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatBytes(location.free_bytes)}</TableCell>
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
