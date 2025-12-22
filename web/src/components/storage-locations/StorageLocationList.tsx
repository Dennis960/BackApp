import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Paper,
  Stack,
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
}

function StorageLocationList({ locations, onDelete, onEdit }: StorageLocationListProps) {
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
            <TableCell>Base Path</TableCell>
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
                  {location.base_path}
                </Box>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
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
