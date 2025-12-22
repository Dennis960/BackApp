import {
  Alert,
  Box,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { backupProfileApi, namingRuleApi, serverApi, storageLocationApi } from '../../api';
import type { BackupProfile, NamingRule, Server, StorageLocation } from '../../types';
import BackupProfileCardActions from './BackupProfileCardActions';
import BackupProfileCardDetails from './BackupProfileCardDetails';
import BackupProfileCardHeader from './BackupProfileCardHeader';
import BackupProfileFormDialog from './BackupProfileFormDialog';

interface BackupProfileCardProps {
  profile: BackupProfile;
  onRefresh?: () => void;
}

function BackupProfileCard({ profile, onRefresh }: BackupProfileCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile.name);
  const [enabled, setEnabled] = useState(profile.enabled);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [namingRules, setNamingRules] = useState<NamingRule[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    setEditedName(profile.name);
    setEnabled(profile.enabled);
  }, [profile]);

  const loadFormData = async () => {
    try {
      const [serversData, storageData, namingData] = await Promise.all([
        serverApi.list(),
        storageLocationApi.list(),
        namingRuleApi.list(),
      ]);
      setServers(serversData || []);
      setStorageLocations(storageData || []);
      setNamingRules(namingData || []);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const handleNameClick = () => {
    setIsEditingName(true);
    setEditedName(profile.name);
  };

  const handleNameSave = async () => {
    if (editedName.trim() && editedName !== profile.name) {
      try {
        await backupProfileApi.update(profile.id, {
          name: editedName.trim(),
          server_id: profile.server_id,
          storage_location_id: profile.storage_location_id,
          naming_rule_id: profile.naming_rule_id,
          schedule_cron: profile.schedule_cron,
          enabled,
        });
        profile.name = editedName.trim();
      } catch (error) {
        console.error('Failed to update profile name:', error);
        setEditedName(profile.name);
      }
    } else {
      setEditedName(profile.name);
    }
    setIsEditingName(false);
  };

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked);
    try {
      await backupProfileApi.update(profile.id, {
        name: editedName.trim() || profile.name,
        server_id: profile.server_id,
        storage_location_id: profile.storage_location_id,
        naming_rule_id: profile.naming_rule_id,
        schedule_cron: profile.schedule_cron,
        enabled: checked,
      });
      profile.enabled = checked;
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update enabled state:', error);
      setEnabled(!checked);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(profile.name);
      setIsEditingName(false);
    }
  };

  const handleEdit = () => {
    setShowFormDialog(true);
    loadFormData();
  };

  const handleExecute = async () => {
    try {
      const result = await backupProfileApi.execute(profile.id);
      setSnackbar({
        open: true,
        message: result.message || 'Backup started successfully',
        severity: 'success',
      });
      onRefresh?.();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to execute backup',
        severity: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this backup profile?')) return;

    try {
      await backupProfileApi.delete(profile.id);
      setSnackbar({
        open: true,
        message: 'Profile deleted successfully',
        severity: 'success',
      });
      onRefresh?.();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete profile',
        severity: 'error',
      });
    }
  };

  const handleDuplicate = async () => {
    try {
      const duplicatedProfile = await backupProfileApi.duplicate(profile.id);
      setSnackbar({
        open: true,
        message: `Profile duplicated successfully as "${duplicatedProfile.name}"`,
        severity: 'success',
      });
      onRefresh?.();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to duplicate profile',
        severity: 'error',
      });
    }
  };

  const handleFormSuccess = () => {
    setShowFormDialog(false);
    onRefresh?.();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Card variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
        <CardContent sx={{ p: 3 }}>
          {/* Header Section */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={3} mb={2}>
            <BackupProfileCardHeader
              profile={profile}
              isEditingName={isEditingName}
              editedName={editedName}
              enabled={enabled}
              onNameClick={handleNameClick}
              onNameSave={handleNameSave}
              onNameChange={setEditedName}
              onNameKeyDown={handleNameKeyDown}
              onToggleEnabled={handleToggleEnabled}
            />

            {/* Action Buttons */}
            <BackupProfileCardActions
              profileId={profile.id}
              onExecute={handleExecute}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </Box>

          {/* Expandable Details Section */}
          <BackupProfileCardDetails profile={profile} onRefresh={onRefresh} />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <BackupProfileFormDialog
        profile={profile}
        open={showFormDialog}
        onClose={() => setShowFormDialog(false)}
        onSuccess={handleFormSuccess}
        servers={servers}
        storageLocations={storageLocations}
        namingRules={namingRules}
      />

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default BackupProfileCard;
