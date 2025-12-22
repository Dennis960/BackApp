import { TextField, Box, Typography } from '@mui/material';
import { useMemo } from 'react';
import cronParser from 'cron-parser';

interface CronTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  fullWidth?: boolean;
  helperText?: string;
}

export function CronTextField({
  value,
  onChange,
  required = false,
  fullWidth = true,
  helperText = 'Optional: Set a cron schedule for automatic backups',
}: CronTextFieldProps) {
  const cronDescription = useMemo(() => {
    if (!value) return '';
    try {
      const interval = cronParser.parseExpression(value);
      return `Next run: ${interval.next().toDate().toLocaleString()}`;
    } catch {
      return 'Invalid cron expression';
    }
  }, [value]);

  return (
    <Box>
      <TextField
        fullWidth={fullWidth}
        label="Schedule (Cron Expression)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0 2 * * * (optional)"
        helperText={helperText}
        required={required}
      />
      {cronDescription && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
          {cronDescription}
        </Typography>
      )}
    </Box>
  );
}
