import { FolderOpen as FolderOpenIcon } from '@mui/icons-material';
import { Box, IconButton, TextField, Tooltip } from '@mui/material';
import { useState } from 'react';
import FileExplorerDialog from '../storage-locations/FileExplorerDialog';

interface PathPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  serverId?: number; // remote when provided, local when undefined
  allowDirectories?: boolean;
  initialPath?: string;
  title?: string;
}

function PathPickerField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  size = 'small',
  fullWidth = true,
  disabled = false,
  serverId,
  allowDirectories = true,
  initialPath,
  title,
}: PathPickerFieldProps) {
  const [open, setOpen] = useState(false);

  const dialogTitle = title || (serverId ? 'Select Remote Path' : 'Select Local Path');

  return (
    <>
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          fullWidth={fullWidth}
          disabled={disabled}
          size={size}
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          helperText={helperText}
          data-testid="input-base-path"
        />
        <Tooltip title="Browse">
          <IconButton size="small" onClick={() => setOpen(true)} sx={{ mt: size === 'small' ? 0.5 : 1 }}>
            <FolderOpenIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <FileExplorerDialog
        open={open}
        serverId={serverId}
        onSelect={(path) => {
          onChange(path);
        }}
        onClose={() => setOpen(false)}
        allowDirectories={allowDirectories}
        initialPath={initialPath || value || '/'}
        title={dialogTitle}
      />
    </>
  );
}

export default PathPickerField;
