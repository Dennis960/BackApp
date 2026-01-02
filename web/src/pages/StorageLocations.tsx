import { Add as AddIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { storageLocationApi } from '../api';
import { DestructiveActionDialog, type DestructiveAction } from '../components/common';
import { StorageLocationDialog, StorageLocationList } from '../components/storage-locations';
import type { StorageLocation, DeletionImpact, StorageLocationMoveImpact } from '../types';

function StorageLocations() {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Deletion confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<StorageLocation | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Move confirmation state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveImpact, setMoveImpact] = useState<StorageLocationMoveImpact | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: number; data: { name: string; base_path: string } } | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await storageLocationApi.list();
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading storage locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      base_path: formData.get('base_path') as string,
    };

    try {
      if (editingLocation) {
        // Check if path is changing
        if (data.base_path && data.base_path !== editingLocation.base_path) {
          // Get move impact
          setLoadingImpact(true);
          const impact = await storageLocationApi.getMoveImpact(editingLocation.id, data.base_path);
          setMoveImpact(impact);
          setPendingUpdate({ id: editingLocation.id, data });
          setLoadingImpact(false);
          setShowForm(false);
          setMoveDialogOpen(true);
          return;
        }
        
        await storageLocationApi.update(editingLocation.id, data);
        setEditingLocation(null);
      } else {
        await storageLocationApi.create(data);
      }
      setShowForm(false);
      setSnackbar({
        open: true,
        message: editingLocation ? 'Storage location updated successfully' : 'Storage location created successfully',
        severity: 'success',
      });
      loadLocations();
    } catch (error) {
      console.error('Error saving storage location:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save storage location',
        severity: 'error',
      });
    }
  };

  const handleConfirmMove = async () => {
    if (!pendingUpdate) return;

    setMoving(true);
    try {
      await storageLocationApi.update(pendingUpdate.id, pendingUpdate.data);
      setSnackbar({
        open: true,
        message: 'Storage location updated and files moved successfully',
        severity: 'success',
      });
      loadLocations();
    } catch (error) {
      console.error('Error updating storage location:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update storage location',
        severity: 'error',
      });
    } finally {
      setMoving(false);
      setMoveDialogOpen(false);
      setPendingUpdate(null);
      setMoveImpact(null);
      setEditingLocation(null);
    }
  };

  const handleCancelMove = () => {
    setMoveDialogOpen(false);
    setPendingUpdate(null);
    setMoveImpact(null);
  };

  const handleEdit = (location: StorageLocation) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingLocation(null);
    setShowForm(false);
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setShowForm(!showForm);
  };

  const handleDeleteRequest = async (id: number) => {
    const location = locations.find(l => l.id === id);
    if (!location) return;

    setLocationToDelete(location);
    setLoadingImpact(true);
    setDeleteDialogOpen(true);

    try {
      const impact = await storageLocationApi.getDeletionImpact(id);
      setDeletionImpact(impact);
    } catch (error) {
      console.error('Error loading deletion impact:', error);
      setDeletionImpact({ backup_profiles: 0, backup_runs: 0, backup_files: 0, total_size_bytes: 0 });
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;

    setDeleting(true);
    try {
      await storageLocationApi.delete(locationToDelete.id);
      setSnackbar({
        open: true,
        message: 'Storage location deleted successfully',
        severity: 'success',
      });
      loadLocations();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete storage location';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
      setDeletionImpact(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setLocationToDelete(null);
    setDeletionImpact(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getDeleteActions = (): DestructiveAction[] => {
    if (!deletionImpact) return [];
    const actions: DestructiveAction[] = [];

    if (deletionImpact.backup_profiles > 0) {
      actions.push({
        type: 'delete',
        label: `This location is used by ${deletionImpact.backup_profiles} backup profile${deletionImpact.backup_profiles !== 1 ? 's' : ''}`,
        details: 'You must reassign or delete these profiles before deleting this location',
      });
    }

    if (deletionImpact.backup_profiles === 0) {
      actions.push({
        type: 'delete',
        label: `Delete storage location "${locationToDelete?.name}"`,
      });
    }

    return actions;
  };

  const getMoveActions = (): DestructiveAction[] => {
    if (!moveImpact) return [];
    const actions: DestructiveAction[] = [];

    if (moveImpact.backup_files > 0) {
      actions.push({
        type: 'move',
        label: `Move ${moveImpact.backup_files} backup file${moveImpact.backup_files !== 1 ? 's' : ''}`,
        details: `Total size: ${formatSize(moveImpact.total_size_bytes)}`,
      });
    }

    actions.push({
      type: 'move',
      label: 'Update all backup file paths in database',
    });

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
          Storage Locations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          data-testid="add-storage-btn"
          fullWidth
          sx={{ maxWidth: { sm: 'fit-content' } }}
        >
          Add Location
        </Button>
      </Box>

      <Card>
        <CardContent>
          {showForm && (
            <StorageLocationDialog
              open={showForm}
              onSubmit={handleSubmit}
              onCancel={handleCancelEdit}
              initialData={editingLocation || undefined}
            />
          )}

          <StorageLocationList locations={locations} onDelete={handleDeleteRequest} onEdit={handleEdit} />
        </CardContent>
      </Card>

      <DestructiveActionDialog
        open={deleteDialogOpen}
        title={`Delete Storage Location "${locationToDelete?.name || ''}"`}
        description={
          deletionImpact && deletionImpact.backup_profiles > 0
            ? "This storage location cannot be deleted because it's still in use."
            : "Are you sure you want to delete this storage location?"
        }
        actionType="delete"
        impact={{
          backupProfiles: deletionImpact?.backup_profiles,
          backupRuns: deletionImpact?.backup_runs,
          backupFiles: deletionImpact?.backup_files,
          totalSizeBytes: deletionImpact?.total_size_bytes,
        }}
        actions={getDeleteActions()}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText={deletionImpact && deletionImpact.backup_profiles > 0 ? "OK" : "Delete Location"}
        loading={deleting || loadingImpact}
      />

      <DestructiveActionDialog
        open={moveDialogOpen}
        title="Move Storage Location Files?"
        description="Updating the path of a storage location will move all associated backup files to the new location."
        actionType="move"
        impact={{
          backupProfiles: moveImpact?.backup_profiles,
          backupRuns: moveImpact?.backup_runs,
          backupFiles: moveImpact?.backup_files,
          totalSizeBytes: moveImpact?.total_size_bytes,
          filePaths: moveImpact?.files_to_move,
          oldPath: moveImpact?.old_path,
          newPath: moveImpact?.new_path,
        }}
        actions={getMoveActions()}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
        confirmText="Move Files"
        cancelText="Cancel"
        loading={moving || loadingImpact}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export default StorageLocations;
