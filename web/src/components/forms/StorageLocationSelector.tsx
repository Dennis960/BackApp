import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { StorageLocation } from '../../types';

interface StorageLocationSelectorProps {
  storageLocations: StorageLocation[];
  value: number | '';
  onChange: (locationId: number) => void;
  showPath?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  label?: string;
  placeholder?: string;
  helperText?: string;
}

export function StorageLocationSelector({
  storageLocations,
  value,
  onChange,
  showPath = false,
  required = true,
  fullWidth = true,
  label = 'Storage Location',
  placeholder = 'Select storage location',
  helperText,
}: StorageLocationSelectorProps) {
  const selectedLocation = storageLocations.find((loc) => loc.id === value);

  return (
    <Box>
      <TextField
        fullWidth={fullWidth}
        select
        label={label}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        required={required}
        helperText={helperText}
      >
        <MenuItem value="">{placeholder}</MenuItem>
        {storageLocations.map((location) => {
          const isDisabled = location.enabled === false;
          const isSelected = location.id === value;
          return (
          <MenuItem key={location.id} value={location.id} disabled={isDisabled && !isSelected}>
            {showPath ? (
              <Stack direction="column" spacing={0.25}>
                <Typography variant="body2">
                  {location.name}{isDisabled ? ' (disabled)' : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {location.base_path}
                </Typography>
              </Stack>
            ) : (
              `${location.name}${isDisabled ? ' (disabled)' : ''}`
            )}
          </MenuItem>
        )})}
      </TextField>
      {showPath && selectedLocation && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 0.5 }}>
          Path: <code>{selectedLocation.base_path}</code>
        </Typography>
      )}
    </Box>
  );
}
