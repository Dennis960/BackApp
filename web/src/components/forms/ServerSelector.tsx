import { MenuItem, TextField } from '@mui/material';
import type { Server } from '../../types';

interface ServerSelectorProps {
  servers: Server[];
  value: number | '';
  onChange: (serverId: number) => void;
  required?: boolean;
  fullWidth?: boolean;
}

export function ServerSelector({
  servers,
  value,
  onChange,
  required = true,
  fullWidth = true,
}: ServerSelectorProps) {
  return (
    <TextField
      fullWidth={fullWidth}
      select
      label="Server"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      required={required}
    >
      <MenuItem value="">Select server</MenuItem>
      {servers.map((server) => (
        <MenuItem key={server.id} value={server.id}>
          {server.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
