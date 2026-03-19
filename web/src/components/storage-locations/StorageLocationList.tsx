import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { StorageLocation } from '../../types';

interface StorageLocationListProps {
  locations: StorageLocation[];
  onDelete: (id: number) => void;
  onEdit: (location: StorageLocation) => void;
  testingConnection: number | null;
  onTestConnection: (locationId: number) => void;
  onToggleEnabled: (location: StorageLocation) => void;
  togglingLocation: number | null;
}

function StorageLocationList({
  locations,
  onDelete,
  onEdit,
  testingConnection,
  onTestConnection,
  onToggleEnabled,
  togglingLocation,
}: StorageLocationListProps) {
  if (locations.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Typography variant="h1" sx={{ opacity: 0.5, mb: 2 }}>
          💾
        </Typography>
        <Typography variant="h6" gutterBottom>
          No storage locations yet
        </Typography>
        <Typography color="text.secondary">
          Add a storage location for your backups
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Path</TableCell>
            <TableCell>Enabled</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {locations.map((location) => (
            <TableRow key={location.id} hover>
              <TableCell>
                <Typography fontWeight="medium">{location.name}</Typography>
              </TableCell>
              <TableCell>
                <Typography textTransform="uppercase" fontSize="0.75rem" color="text.secondary">
                  {location.type || 'local'}
                </Typography>
              </TableCell>
              <TableCell>
                <Box
                  component="code"
                  sx={{
                    bgcolor: 'grey.100',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {location.type === 'sftp' ? location.remote_path || '' : location.base_path}
                </Box>
              </TableCell>
              <TableCell>
                <Switch
                  checked={location.enabled !== false}
                  onChange={() => onToggleEnabled(location)}
                  disabled={togglingLocation === location.id}
                  inputProps={{ 'aria-label': 'toggle storage location' }}
                />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  {location.type === 'sftp' && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={testingConnection === location.id ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                      onClick={() => onTestConnection(location.id)}
                      disabled={testingConnection === location.id || location.enabled === false}
                    >
                      Test
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => onEdit(location)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDelete(location.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default StorageLocationList;
