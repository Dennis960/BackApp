import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { StorageLocation } from '../../types';

interface StorageLocationSelectorProps {
  storageLocations: StorageLocation[];
  value: number | '';
  onChange: (locationId: number) => void;
  showPath?: boolean;
  required?: boolean;
  fullWidth?: boolean;
}

export function StorageLocationSelector({
  storageLocations,
  value,
  onChange,
  showPath = false,
  required = true,
  fullWidth = true,
}: StorageLocationSelectorProps) {
  const selectedLocation = storageLocations.find((loc) => loc.id === value);

  return (
    <Box>
      <TextField
        fullWidth={fullWidth}
        select
        label="Storage Location"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        required={required}
      >
        <MenuItem value="">Select storage location</MenuItem>
        {storageLocations.map((location) => (
          <MenuItem key={location.id} value={location.id}>
            {showPath ? (
              <Stack direction="column" spacing={0.25}>
                <Typography variant="body2">{location.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {location.base_path}
                </Typography>
              </Stack>
            ) : (
              location.name
            )}
          </MenuItem>
        ))}
      </TextField>
      {showPath && selectedLocation && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 0.5 }}>
          Path: <code>{selectedLocation.base_path}</code>
        </Typography>
      )}
    </Box>
  );
}
