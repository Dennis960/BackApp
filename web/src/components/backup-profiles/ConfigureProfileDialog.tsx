import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { backupProfileApi } from '../../api';
import YamlProfileEditor from './YamlProfileEditor';
import { defaultProfileConfigurationYAML } from './default-profile-configuration';

interface ConfigureProfileDialogProps {
  open: boolean;
  profileId: number;
  onClose: () => void;
}

function ConfigureProfileDialog({ open, profileId, onClose }: ConfigureProfileDialogProps) {
  const [configurationYAML, setConfigurationYAML] = useState(defaultProfileConfigurationYAML);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    backupProfileApi.get(profileId)
      .then((profile) => setConfigurationYAML(profile.configuration_yaml || defaultProfileConfigurationYAML))
      .catch((loadError) => {
        console.error('Error loading profile configuration:', loadError);
        setError('Failed to load profile configuration.');
      })
      .finally(() => setLoading(false));
  }, [open, profileId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await backupProfileApi.updateConfiguration(profileId, configurationYAML);
      onClose();
    } catch (saveError) {
      console.error('Error saving profile configuration:', saveError);
      setError('Failed to save configuration. Check the YAML syntax and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Configure Backup Profile
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <YamlProfileEditor
            value={configurationYAML}
            onChange={setConfigurationYAML}
            error={error}
            height="520px"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || saving}>
          {saving ? <CircularProgress size={22} /> : 'Save configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfigureProfileDialog;
