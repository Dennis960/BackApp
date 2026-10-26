import {
  Box,
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { backupProfileApi } from '../../api';
import type { BackupProfile, NamingRule, Server, StorageLocation } from '../../types';
import { TabPanel } from '../common';
import BackupProfileBasicForm from './BackupProfileBasicForm';
import YamlProfileEditor from './YamlProfileEditor';
import { defaultProfileConfigurationYAML } from './default-profile-configuration';

interface BackupProfileFormDialogProps {
  open: boolean;
  profile?: BackupProfile;
  servers: Server[];
  storageLocations: StorageLocation[];
  namingRules: NamingRule[];
  onClose: () => void;
  onSuccess: () => void;
}

function BackupProfileFormDialog({
  open,
  profile,
  servers,
  storageLocations,
  namingRules,
  onClose,
  onSuccess,
}: BackupProfileFormDialogProps) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<Partial<BackupProfile> | null>(null);
  const [createdProfileId, setCreatedProfileId] = useState<number | null>(null);
  const [configurationYAML, setConfigurationYAML] = useState(defaultProfileConfigurationYAML);
  const [formError, setFormError] = useState<string | null>(null);
  const isEditMode = !!profile;
  const hasProfileId = isEditMode || createdProfileId;

  useEffect(() => {
    if (open) {
      if (profile) {
        setProfileData(profile);
        setConfigurationYAML(profile.configuration_yaml || defaultProfileConfigurationYAML);
      } else {
        setProfileData({});
        setCreatedProfileId(null);
        setConfigurationYAML(defaultProfileConfigurationYAML);
      }
      setTab(0);
      setFormError(null);
    }
  }, [open, profile]);

  const handleBasicFormChange = (newData: Partial<BackupProfile>) => {
    setProfileData((current) => ({ ...(current ?? {}), ...newData }));
  };

  const handleSave = async (closeAfterSave = false) => {
    if (!profileData || !profileData.name || !profileData.server_id || !profileData.storage_location_id || !profileData.naming_rule_id) return;

    setLoading(true);
    try {
      setFormError(null);
      const data = {
        name: profileData.name,
        server_id: profileData.server_id,
        storage_location_id: profileData.storage_location_id,
        naming_rule_id: profileData.naming_rule_id,
        schedule_cron: profileData.schedule_cron,
        retention_days: profileData.retention_days,
        enabled: profileData.enabled || false,
        configuration_yaml: configurationYAML,
      };

      let newProfileId: number;
      if (isEditMode || createdProfileId) {
        newProfileId = profile?.id || createdProfileId!;
        await backupProfileApi.update(newProfileId, data);
      } else {
        const createdProfile = await backupProfileApi.create(data);
        newProfileId = createdProfile.id;
        setCreatedProfileId(newProfileId);
        setProfileData(createdProfile);
        if (closeAfterSave) {
          onSuccess();
          onClose();
        }
        // After creating, stay on the dialog so the YAML can be reviewed.
        return;
      }

      if (closeAfterSave) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setFormError('Failed to save backup profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = async () => {
    setLoading(true);
    setFormError(null);
    try {
      await handleSave(true);
    } catch (error) {
      console.error('Error saving profile configuration:', error);
      setFormError('Failed to save profile configuration. Check the YAML and try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit Backup Profile' : 'Create Backup Profile'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
            <Tab label="Profile" />
            <Tab label="Configuration YAML" />
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}>
          {profileData && (
            <BackupProfileBasicForm
              initialData={profileData}
              servers={servers}
              storageLocations={storageLocations}
              namingRules={namingRules}
              onChange={handleBasicFormChange}
            />
          )}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <YamlProfileEditor value={configurationYAML} onChange={setConfigurationYAML} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        {formError && <Alert severity="error" sx={{ mr: 'auto' }}>{formError}</Alert>}
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {!hasProfileId && (
          <Button onClick={() => handleSave(false)} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Create & Continue'}
          </Button>
        )}
        {hasProfileId && (
          <Button onClick={handleDone} variant="contained" disabled={loading}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default BackupProfileFormDialog;
