import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import PathPickerField from '../common/PathPickerField';

interface AddFileRuleFormProps {
  formData: {
    remote_path: string;
    recursive: boolean;
    compress: boolean;
    compress_format: string;
    compress_password: string;
    exclude_pattern: string;
  };
  onFormDataChange: (data: {
    remote_path: string;
    recursive: boolean;
    compress: boolean;
    compress_format: string;
    compress_password: string;
    exclude_pattern: string;
  }) => void;
  onAdd: () => void;
  serverId?: number;
  onCancel?: () => void;
}

function AddFileRuleForm({ formData, onFormDataChange, onAdd, serverId, onCancel }: AddFileRuleFormProps) {
  const trimmedPath = formData.remote_path.trim();

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
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.compress}
                    onChange={(e) => onFormDataChange({ ...formData, compress: e.target.checked })}
                  />
                }
                label={(
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <span>Compress</span>
                    <Tooltip title="For SFTP storage, compression runs locally on the BackApp instance.">
                      <InfoOutlinedIcon fontSize="small" />
                    </Tooltip>
                  </Box>
                )}
              />
              {formData.compress && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Format</InputLabel>
                  <Select
                    label="Format"
                    value={formData.compress_format}
                    onChange={(e) => onFormDataChange({
                      ...formData,
                      compress_format: e.target.value,
                      compress_password: e.target.value === 'zip' ? '' : formData.compress_password,
                    })}
                  >
                    <MenuItem value="7z">7z (encrypted optional)</MenuItem>
                    <MenuItem value="zip">zip (no encryption)</MenuItem>
                  </Select>
                </FormControl>
              )}
              {formData.compress && formData.compress_format !== 'zip' && (
                <TextField
                  fullWidth
                  label="7z Password"
                  type="password"
                  value={formData.compress_password}
                  onChange={(e) => onFormDataChange({ ...formData, compress_password: e.target.value })}
                  placeholder="Optional"
                  size="small"
                />
              )}
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
                  disabled={!trimmedPath}
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
