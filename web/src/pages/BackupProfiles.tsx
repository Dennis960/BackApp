import { Add as AddIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backupProfileApi, namingRuleApi, serverApi, storageLocationApi } from '../api';
import { BackupProfileFormDialog, BackupProfileList } from '../components/backup-profiles';
import { PrerequisitesAlert } from '../components/common';
import { TemplateSelectionDialog } from '../components/dialogs';
import type { BackupProfile, NamingRule, Server, StorageLocation } from '../types';

function BackupProfiles() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<BackupProfile[]>([]);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BackupProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<Server[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [namingRules, setNamingRules] = useState<NamingRule[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadProfiles();
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
    setEditingProfile(null);
    setShowTemplateDialog(true);
  };

  const handleTemplateSelected = (templateType: 'scratch' | 'postgres-docker') => {
    if (templateType === 'scratch') {
      setShowFormDialog(true);
      loadFormData();
    }
  };

  useEffect(() => {
    // Load form data initially to show alerts
    loadFormData();
  }, []);

  const handleEditProfile = (profile: BackupProfile) => {
    setEditingProfile(profile);
    setShowFormDialog(true);
    loadFormData();
  };

  const handleFormSuccess = () => {
    setSnackbar({
      open: true,
      message: editingProfile ? 'Profile updated successfully' : 'Profile created successfully',
      severity: 'success',
    });
    loadProfiles();
  };

  const handleExecute = async (id: number) => {
    try {
      const result = await backupProfileApi.execute(id);
      setSnackbar({
        open: true,
        message: result.message || 'Backup started successfully',
        severity: 'success',
      });
      loadProfiles(); // Refresh to show any status changes
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to execute backup',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this backup profile?')) return;

    try {
      await backupProfileApi.delete(id);
      setSnackbar({
        open: true,
        message: 'Profile deleted successfully',
        severity: 'success',
      });
      loadProfiles();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete profile',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h3">
          Backup Profiles
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateForm}
          disabled={storageLocations.length === 0 || namingRules.length === 0}
        >
          Create Profile
        </Button>
      </Box>

      <PrerequisitesAlert storageLocationsCount={storageLocations.length} namingRulesCount={namingRules.length} />

      <BackupProfileList
        profiles={profiles}
        onExecute={handleExecute}
        onDelete={handleDelete}
        onEdit={handleEditProfile}
        onRefresh={loadProfiles}
      />

      <BackupProfileFormDialog
        open={showFormDialog}
        profile={editingProfile || undefined}
        servers={servers}
        storageLocations={storageLocations}
        namingRules={namingRules}
        onClose={() => {
          setShowFormDialog(false);
          setEditingProfile(null);
        }}
        onSuccess={handleFormSuccess}
      />

      <TemplateSelectionDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        onTemplateSelected={handleTemplateSelected}
        onSuccess={() => {
          setShowTemplateDialog(false);
          loadProfiles();
          setSnackbar({
            open: true,
            message: 'Profile created successfully',
            severity: 'success',
          });
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default BackupProfiles;
