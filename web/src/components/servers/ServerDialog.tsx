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
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { Server } from '../../types';

interface ServerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  server?: Server;
}

function ServerDialog({ open, onClose, onSubmit, server }: ServerDialogProps) {
  const [authType, setAuthType] = useState<'key' | 'password'>('key');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isEditMode = !!server;

  useEffect(() => {
    if (server) {
      setAuthType(server.auth_type === 'password' ? 'password' : 'key');
    }
  }, [server]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await onSubmit(formData);
    if (!isEditMode) {
      e.currentTarget.reset();
      setAuthType('key');
    }
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
  };

  const formId = isEditMode ? 'edit-server-form' : 'add-server-form';
  const testId = isEditMode ? 'edit-server-form-container' : 'add-server-form-container';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid={testId}
    >
      <DialogTitle>{isEditMode ? 'Edit Server' : 'Add New Server'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} data-testid={formId} id={formId}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            required
            placeholder="Production Server"
            margin="normal"
            defaultValue={server?.name || ''}
            data-testid="input-name"
          />
          <TextField
            fullWidth
            label="Host"
            name="host"
            required
            placeholder="192.168.1.100"
            margin="normal"
            defaultValue={server?.host || ''}
            data-testid="input-host"
          />
          <TextField
            fullWidth
            label="Port"
            name="port"
            type="number"
            defaultValue={server?.port || 22}
            required
            margin="normal"
            data-testid="input-port"
          />
          <TextField
            fullWidth
            label="Username"
            name="username"
            required
            placeholder="root"
            margin="normal"
            defaultValue={server?.username || ''}
            data-testid="input-username"
          />
          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend">Authentication Type</FormLabel>
            <RadioGroup
              row
              name="auth_type"
              value={authType}
              onChange={(e) => setAuthType(e.target.value as 'key' | 'password')}
            >
              <FormControlLabel
                value="key"
                control={<Radio data-testid="auth-type-key" />}
                label="SSH Key"
              />
              <FormControlLabel
                value="password"
                control={<Radio data-testid="auth-type-password" />}
                label="Password"
              />
            </RadioGroup>
          </FormControl>

          {authType === 'key' && (
            <Box mt={2} data-testid="keyfile-input">
              <Button variant="outlined" component="label" fullWidth startIcon={<AttachFileIcon />}>
                {selectedFile ? 'Change SSH Private Key' : isEditMode ? 'Upload New SSH Private Key (Optional)' : 'Upload SSH Private Key'}
                <input
                  type="file"
                  name="keyfile"
                  hidden
                  accept=".pem,.key,*"
                  data-testid="input-keyfile"
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
            <Box mt={2} data-testid="password-input">
              <TextField
                fullWidth
                label={isEditMode ? 'Password (Optional)' : 'Password'}
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={isEditMode ? 'Leave empty to keep existing password' : undefined}
                data-testid="input-password"
              />
              {isEditMode && (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Leave empty to keep the existing password
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          data-testid="cancel-server-btn"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form={formId}
          variant="contained"
          data-testid={isEditMode ? 'update-server-btn' : 'save-server-btn'}
        >
          {isEditMode ? 'Update Server' : 'Save Server'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ServerDialog;
