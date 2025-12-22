import {
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { BackupProfile, NamingRule, Server, StorageLocation } from '../../types';
import { CronTextField, NamingRuleSelector, ProfileNameTextField, ServerSelector, StorageLocationSelector } from '../forms';

interface BackupProfileBasicFormProps {
  initialData?: BackupProfile;
  servers: Server[];
  storageLocations: StorageLocation[];
  namingRules: NamingRule[];
  onChange: (data: Partial<BackupProfile>) => void;
}

function BackupProfileBasicForm({
  initialData,
  servers,
  storageLocations,
  namingRules,
  onChange,
}: BackupProfileBasicFormProps) {
  const [formData, setFormData] = useState<Partial<BackupProfile>>(() => {
    // Initialize with initialData or set enabled to false for new profiles
    return initialData ? initialData : { enabled: false };
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (field: keyof BackupProfile, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <ProfileNameTextField value={formData.name || ''} onChange={(v) => handleChange('name' as keyof BackupProfile, v)} />

      <ServerSelector
        servers={servers}
        value={formData.server_id || ''}
        onChange={(v) => handleChange('server_id' as keyof BackupProfile, v)}
      />

      <StorageLocationSelector
        storageLocations={storageLocations}
        value={formData.storage_location_id || ''}
        onChange={(v) => handleChange('storage_location_id' as keyof BackupProfile, v)}
        showPath
      />

      <NamingRuleSelector
        namingRules={namingRules}
        value={formData.naming_rule_id || ''}
        onChange={(v) => handleChange('naming_rule_id' as keyof BackupProfile, v)}
        showPattern
        showPreview
      />

      <CronTextField
        value={formData.schedule_cron || ''}
        onChange={(v) => handleChange('schedule_cron' as keyof BackupProfile, v)}
        helperText="Leave empty to disable scheduling"
      />

      <FormControlLabel
        control={
          <Checkbox
            name="enabled"
            checked={formData.enabled || false}
            onChange={(e) => handleChange('enabled' as keyof BackupProfile, e.target.checked)}
          />
        }
        label="Enabled"
      />
    </Stack>
  );
}

export default BackupProfileBasicForm;
