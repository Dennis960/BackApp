import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';

interface AddCommandFormProps {
  formData: {
    command: string;
    run_stage: 'pre' | 'post';
  };
  onFormDataChange: (data: {
    command: string;
    run_stage: 'pre' | 'post';
  }) => void;
  onAdd: () => void;
  onCancel?: () => void;
}

function AddCommandForm({ formData, onFormDataChange, onAdd, onCancel }: AddCommandFormProps) {
  return (
    <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
      <CardContent>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Command"
            value={formData.command}
            onChange={(e) => onFormDataChange({ ...formData, command: e.target.value })}
            placeholder="echo 'Backup starting...'"
            size="small"
          />
          <Box display="flex" gap={2}>
            <TextField
              select
              label="Stage"
              value={formData.run_stage}
              onChange={(e) => onFormDataChange({ ...formData, run_stage: e.target.value as 'pre' | 'post' })}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="pre">Pre-backup</MenuItem>
              <MenuItem value="post">Post-backup</MenuItem>
            </TextField>
            <Stack direction="row" gap={1} ml="auto">
              {onCancel && (
                <Button
                  onClick={onCancel}
                  size="small"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={onAdd}
                variant="contained"
                disabled={!formData.command.trim()}
                size="small"
              >
                Add
              </Button>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default AddCommandForm;
