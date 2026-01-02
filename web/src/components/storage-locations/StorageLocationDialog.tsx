import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
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

  useEffect(() => {
    setBasePath(initialData?.base_path || '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Update the hidden input field with the selected path before submitting
    const pathInput = e.currentTarget.querySelector('input[name="base_path"]') as HTMLInputElement;
    if (pathInput) {
      pathInput.value = basePath;
    }
    onSubmit(e);
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
              <PathPickerField
                label="Base Path"
                value={basePath}
                onChange={setBasePath}
                placeholder="/mnt/backups"
                helperText="Absolute path where backups will be stored"
                allowDirectories={true}
                initialPath={basePath || '/'}
              />
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
