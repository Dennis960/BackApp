import AttachFileIcon from '@mui/icons-material/AttachFile';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { StorageLocation } from '../../types';
import PathPickerField from '../common/PathPickerField';

interface StorageLocationFormProps {
  open: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  initialData?: StorageLocation;
}

function StorageLocationDialog({ open, onSubmit, onCancel, initialData }: StorageLocationFormProps) {
  const [basePath, setBasePath] = useState(initialData?.base_path || '');
  const [storageType, setStorageType] = useState<StorageLocation['type']>(initialData?.type || 'local');
  const [authType, setAuthType] = useState<'key' | 'password'>('key');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isEditMode = !!initialData;

  useEffect(() => {
    setBasePath(initialData?.base_path || '');
    setStorageType(initialData?.type || 'local');
    if (initialData?.auth_type === 'password') {
      setAuthType('password');
    } else if (initialData?.password && !initialData?.ssh_key) {
      setAuthType('password');
    } else {
      setAuthType('key');
    }
    setSelectedFile(null);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Update the hidden input field with the selected path before submitting
    const pathInput = e.currentTarget.querySelector('input[name="base_path"]') as HTMLInputElement;
    if (pathInput) {
      pathInput.value = basePath;
    }
    onSubmit(e);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
  };

  return (
    <>
      <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth data-testid="storage-form-dialog">
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="base_path" value={basePath} />
          <DialogTitle>
            {initialData ? 'Edit Storage Location' : 'New Storage Location'}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                name="name"
                label="Name"
                required
                fullWidth
                placeholder="Production Backups"
                defaultValue={initialData?.name || ''}
                data-testid="input-name"
              />
              <TextField
                name="type"
                label="Type"
                select
                fullWidth
                value={storageType || 'local'}
                onChange={(event) => {
                  const nextType = event.target.value as StorageLocation['type'];
                  setStorageType(nextType);
                  if (nextType === 'sftp') {
                    setBasePath('');
                  }
                }}
              >
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="sftp">SFTP</MenuItem>
              </TextField>

              {storageType === 'local' ? (
                <PathPickerField
                  label="Base Path"
                  value={basePath}
                  onChange={setBasePath}
                  placeholder="/mnt/backups"
                  helperText="Absolute path where backups will be stored"
                  allowDirectories={true}
                  initialPath={basePath || '/'}
                />
              ) : (
                <Stack spacing={2}>
                  <TextField
                    name="address"
                    label="Address"
                    required
                    fullWidth
                    placeholder="backup.example.com"
                    defaultValue={initialData?.address || ''}
                  />
                  <TextField
                    name="port"
                    label="Port"
                    fullWidth
                    placeholder="22"
                    defaultValue={initialData?.port || 22}
                  />
                  <TextField
                    name="remote_path"
                    label="Remote Path"
                    required
                    fullWidth
                    placeholder="/backups"
                    defaultValue={initialData?.remote_path || ''}
                  />
                  <TextField
                    name="username"
                    label="User"
                    required
                    fullWidth
                    placeholder="backup-user"
                    defaultValue={initialData?.username || ''}
                  />
                  <FormControl component="fieldset" margin="normal">
                    <FormLabel component="legend">Authentication Type</FormLabel>
                    <RadioGroup
                      row
                      name="auth_type"
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as 'key' | 'password')}
                    >
                      <FormControlLabel value="key" control={<Radio />} label="SSH Key" />
                      <FormControlLabel value="password" control={<Radio />} label="Password" />
                    </RadioGroup>
                  </FormControl>

                  {authType === 'key' && (
                    <Box mt={1}>
                      <Button variant="outlined" component="label" fullWidth startIcon={<AttachFileIcon />}>
                        {selectedFile ? 'Change SSH Private Key' : isEditMode ? 'Upload New SSH Private Key (Optional)' : 'Upload SSH Private Key'}
                        <input
                          type="file"
                          name="keyfile"
                          hidden
                          accept=".pem,.key,*"
                          onChange={handleFileChange}
                        />
                      </Button>
                      {selectedFile && (
                        <Box mt={1}>
                          <Chip
                            label={selectedFile.name}
                            onDelete={() => setSelectedFile(null)}
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        {isEditMode ? 'Leave empty to keep the existing SSH key' : 'Upload your SSH private key file'}
                      </Typography>
                    </Box>
                  )}

                  {authType === 'password' && (
                    <Box mt={1}>
                      <TextField
                        fullWidth
                        label={isEditMode ? 'Password (Optional)' : 'Password'}
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder={isEditMode ? 'Leave empty to keep existing password' : undefined}
                      />
                      {isEditMode && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                          Leave empty to keep the existing password
                        </Typography>
                      )}
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="submit" variant="contained" data-testid="save-storage-btn">
              {initialData ? 'Update Location' : 'Save Location'}
            </Button>
            <Button onClick={onCancel} color="inherit">
              Cancel
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* FileExplorerDialog handled by PathPickerField */}
    </>
  );
}

export default StorageLocationDialog;
