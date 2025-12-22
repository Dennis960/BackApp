import { TextField } from '@mui/material';

interface ProfileNameTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  fullWidth?: boolean;
}

export function ProfileNameTextField({
  value,
  onChange,
  required = true,
  fullWidth = true,
}: ProfileNameTextFieldProps) {
  return (
    <TextField
      fullWidth={fullWidth}
      label="Profile Name"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    />
  );
}
