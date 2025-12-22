import { Box, Button, Card, CardContent, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import PathPickerField from '../common/PathPickerField';

interface AddFileRuleFormProps {
  formData: {
    remote_path: string;
    recursive: boolean;
    exclude_pattern: string;
  };
  onFormDataChange: (data: {
    remote_path: string;
    recursive: boolean;
    exclude_pattern: string;
  }) => void;
  onAdd: () => void;
  serverId?: number;
  onCancel?: () => void;
}

function AddFileRuleForm({ formData, onFormDataChange, onAdd, serverId, onCancel }: AddFileRuleFormProps) {
  return (
    <>
      <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Stack spacing={2}>
            <PathPickerField
              label="Remote Path"
              value={formData.remote_path}
              onChange={(v) => onFormDataChange({ ...formData, remote_path: v })}
              placeholder="/home/user/documents"
              serverId={serverId}
              allowDirectories={true}
              initialPath={formData.remote_path || '/'}
            />
            <Box display="flex" gap={2} alignItems="center">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.recursive}
                    onChange={(e) => onFormDataChange({ ...formData, recursive: e.target.checked })}
                  />
                }
                label="Recursive"
              />
              <TextField
                fullWidth
                label="Exclude Pattern"
                value={formData.exclude_pattern}
                onChange={(e) => onFormDataChange({ ...formData, exclude_pattern: e.target.value })}
                placeholder="*.tmp,*.cache (optional)"
                size="small"
              />
              <Stack direction="row" gap={1}>
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
                  disabled={!formData.remote_path.trim()}
                  size="small"
                >
                  Add
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* FileExplorerDialog handled by PathPickerField */}
    </>
  );
}

export default AddFileRuleForm;
