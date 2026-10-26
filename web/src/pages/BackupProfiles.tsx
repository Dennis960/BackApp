import { Add as AddIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { backupProfileApi, namingRuleApi, serverApi, storageLocationApi } from '../api';
import { BackupProfileFormDialog, BackupProfileList } from '../components/backup-profiles';
import { PrerequisitesAlert } from '../components/common';
import { DestructiveActionDialog, type DestructiveAction } from '../components/common';
import { TemplateSelectionDialog } from '../components/dialogs';
import type { DeletionImpact, NamingRule, Server, StorageLocation } from '../types';

function BackupProfiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<Server[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [namingRules, setNamingRules] = useState<NamingRule[]>([]);
  const [profileToDelete, setProfileToDelete] = useState<any | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfiles();
    loadFormData();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await backupProfileApi.list();
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const openCreateForm = () => {
    // Check for required resources
    if (storageLocations.length === 0 || namingRules.length === 0) {
      return;
    }
    setShowTemplateDialog(true);
  };

  const handleTemplateSelected = (templateType: 'scratch' | 'postgres-docker') => {
    if (templateType === 'scratch') {
      setShowFormDialog(true);
    }
  };

  const handleDeleteRequest = async (id: number) => {
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return;
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
    try {
      setDeletionImpact(await backupProfileApi.getDeletionImpact(id));
    } catch (error) {
      console.error('Error loading backup profile deletion impact:', error);
      setDeletionImpact({ backup_profiles: 1, backup_runs: 0, backup_files: 0, total_size_bytes: 0 });
    }
  };

  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    try {
      await backupProfileApi.delete(profileToDelete.id);
      loadProfiles();
    } catch (error) {
      console.error('Error deleting backup profile:', error);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
      setDeletionImpact(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setProfileToDelete(null);
    setDeletionImpact(null);
  };

  const getDeleteActions = (): DestructiveAction[] => {
    if (!deletionImpact) return [];
    const actions: DestructiveAction[] = [];
    if (deletionImpact.backup_runs > 0) {
      actions.push({ type: 'delete', label: `Delete ${deletionImpact.backup_runs} backup run${deletionImpact.backup_runs !== 1 ? 's' : ''}` });
    }
    if (deletionImpact.backup_files > 0) {
      actions.push({ type: 'delete', label: `Delete ${deletionImpact.backup_files} backup file${deletionImpact.backup_files !== 1 ? 's' : ''} from disk` });
    }
    actions.push({ type: 'delete', label: `Delete backup profile "${profileToDelete?.name}"` });
    return actions;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={12}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Typography variant="h5" component="h3">
          Backup Profiles
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateForm}
          disabled={storageLocations.length === 0 || namingRules.length === 0}
          fullWidth
          sx={{ maxWidth: { sm: 'fit-content' } }}
        >
          Create Profile
        </Button>
      </Box>

      <PrerequisitesAlert storageLocationsCount={storageLocations.length} namingRulesCount={namingRules.length} />

      <BackupProfileList
        profiles={profiles}
        onRefresh={loadProfiles}
        onDeleteRequest={handleDeleteRequest}
      />

      <BackupProfileFormDialog
        open={showFormDialog}
        servers={servers}
        storageLocations={storageLocations}
        namingRules={namingRules}
        onClose={() => {
          setShowFormDialog(false);
        }}
        onSuccess={() => {
          setShowFormDialog(false);
          loadProfiles();
        }}
      />

      <TemplateSelectionDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        onTemplateSelected={handleTemplateSelected}
        onSuccess={() => {
          setShowTemplateDialog(false);
          loadProfiles();
        }}
      />

      <DestructiveActionDialog
        open={deleteDialogOpen}
        title={`Delete Backup Profile "${profileToDelete?.name || ''}"`}
        description="This will permanently delete the profile and its associated backup runs and files."
        actionType="delete"
        impact={{
          backupProfiles: deletionImpact?.backup_profiles,
          backupRuns: deletionImpact?.backup_runs,
          backupFiles: deletionImpact?.backup_files,
          totalSizeBytes: deletionImpact?.total_size_bytes,
          filePaths: deletionImpact?.file_paths,
        }}
        actions={getDeleteActions()}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete Backup Profile"
        loading={deleting}
      />
    </Box>
  );
}

export default BackupProfiles;
