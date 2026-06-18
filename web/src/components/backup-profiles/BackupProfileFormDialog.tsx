import {
  Box,
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
import BackupProfileCommandsList from './BackupProfileCommandsList';
import BackupProfileFileRulesList from './BackupProfileFileRulesList';

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
  const isEditMode = !!profile;
  const hasProfileId = isEditMode || createdProfileId;

  useEffect(() => {
    if (open) {
      if (profile) {
        setProfileData(profile);
      } else {
        setProfileData({});
        setCreatedProfileId(null);
      }
      setTab(0);
    }
  }, [open, profile]);

  const handleBasicFormChange = (newData: Partial<BackupProfile>) => {
    setProfileData((current) => ({ ...(current ?? {}), ...newData }));
  };

  const handleSave = async (closeAfterSave = false) => {
    if (!profileData || !profileData.name || !profileData.server_id || !profileData.storage_location_id || !profileData.naming_rule_id) return;

    setLoading(true);
    try {
      const data = {
        name: profileData.name,
        server_id: profileData.server_id,
        storage_location_id: profileData.storage_location_id,
        naming_rule_id: profileData.naming_rule_id,
        schedule_cron: profileData.schedule_cron,
        retention_days: profileData.retention_days,
        enabled: profileData.enabled || false,
      };

      let newProfileId: number;
      if (isEditMode) {
        await backupProfileApi.update(profile!.id, data);
        newProfileId = profile!.id;
      } else {
        const createdProfile = await backupProfileApi.create(data);
        newProfileId = createdProfile.id;
        setCreatedProfileId(newProfileId);
        setProfileData(createdProfile);
        if (closeAfterSave) {
          onSuccess();
          onClose();
        }
        // After creating, stay on the dialog and allow adding commands/file rules
        return;
      }

      if (closeAfterSave) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = async () => {
    if (isEditMode) {
      await handleSave(true);
      return;
    }
    // In create-and-continue flow, the profile is already created; just close and refresh
    onSuccess();
    onClose();
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
            <Tab label="Commands" disabled={!hasProfileId} />
            <Tab label="File Rules" disabled={!hasProfileId} />
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

        {hasProfileId && (
          <>
            <TabPanel value={tab} index={1}>
              <BackupProfileCommandsList profileId={isEditMode ? profile!.id : createdProfileId!} />
            </TabPanel>

            <TabPanel value={tab} index={2}>
              <BackupProfileFileRulesList
                profileId={isEditMode ? profile!.id : createdProfileId!}
                serverId={profileData?.server_id}
              />
            </TabPanel>
          </>
        )}
      </DialogContent>
      <DialogActions>
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
