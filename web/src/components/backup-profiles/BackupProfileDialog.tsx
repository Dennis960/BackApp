import { Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { CronTextField, NamingRuleSelector, ProfileNameTextField, ServerSelector, StorageLocationSelector } from '../forms';
import type { BackupProfile, NamingRule, Server, StorageLocation } from '../../types';

interface BackupProfileDialogProps {
  open: boolean;
  servers: Server[];
  storageLocations: StorageLocation[];
  namingRules: NamingRule[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  profile?: BackupProfile;
}

function BackupProfileDialog({
  open,
  servers,
  storageLocations,
  namingRules,
  onClose,
  onSubmit,
  profile,
}: BackupProfileDialogProps) {
  const [name, setName] = useState(profile?.name || '');
  const [serverId, setServerId] = useState<number | ''>(profile?.server_id || '');
  const [storageLocationId, setStorageLocationId] = useState<number | ''>(profile?.storage_location_id || '');
  const [namingRuleId, setNamingRuleId] = useState<number | ''>(profile?.naming_rule_id || '');
  const [scheduleCron, setScheduleCron] = useState(profile?.schedule_cron || '');
  const [enabled, setEnabled] = useState(profile?.enabled ?? true);
  const isEditMode = !!profile;

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setServerId(profile.server_id);
      setStorageLocationId(profile.storage_location_id);
      setNamingRuleId(profile.naming_rule_id);
      setScheduleCron(profile.schedule_cron || '');
      setEnabled(profile.enabled);
    } else {
      setName('');
      setServerId('');
      setStorageLocationId('');
      setNamingRuleId('');
      setScheduleCron('');
      setEnabled(true);
    }
  }, [profile, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {isEditMode ? 'Edit Backup Profile' : 'Create Backup Profile'}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <form onSubmit={(e) => {
        e.preventDefault();
        // Create FormData with current state values
        const formData = new FormData();
        formData.set('name', name);
        formData.set('server_id', String(serverId));
        formData.set('storage_location_id', String(storageLocationId));
        formData.set('naming_rule_id', String(namingRuleId));
        formData.set('schedule_cron', scheduleCron);
        formData.set('enabled', String(enabled));
        // Call the original onSubmit with a fake event that has currentTarget with FormData
        onSubmit(e);
      }}>
        <DialogContent>
          <Stack spacing={3}>
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="server_id" value={serverId} />
            <input type="hidden" name="storage_location_id" value={storageLocationId} />
            <input type="hidden" name="naming_rule_id" value={namingRuleId} />
            <input type="hidden" name="schedule_cron" value={scheduleCron} />
            <input type="hidden" name="enabled" value={String(enabled)} />

            <ProfileNameTextField value={name} onChange={setName} />

            <ServerSelector
              servers={servers}
              value={serverId}
              onChange={setServerId}
            />

            <StorageLocationSelector
              storageLocations={storageLocations}
              value={storageLocationId}
              onChange={setStorageLocationId}
              showPath
            />

            <NamingRuleSelector
              namingRules={namingRules}
              value={namingRuleId}
              onChange={setNamingRuleId}
              showPattern
              showPreview
            />

            <CronTextField
              value={scheduleCron}
              onChange={setScheduleCron}
              helperText="Optional. Examples: '0 2 * * *' (daily 2 AM), '*/15 * * * *' (every 15 min)"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              }
              label="Enabled"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {isEditMode ? 'Update Profile' : 'Create Profile'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default BackupProfileDialog;
