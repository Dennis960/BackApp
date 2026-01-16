import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { serverApi } from '../api';
import { DestructiveActionDialog, type DestructiveAction } from '../components/common';
import { ServerDialog, ServerList } from '../components/servers';
import type { Server, DeletionImpact } from '../types';

function Servers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Deletion confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<Server | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const data = await serverApi.list();
      const sorted = (data || []).slice().sort((a, b) => a.name.localeCompare(b.name));
      setServers(sorted);
    } catch (error) {
      console.error('Error loading servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    const isEditing = !!editingServer;
    try {
      if (isEditing) {
        // Convert FormData to object for update
        const updates: any = {
          name: formData.get('name') as string,
          host: formData.get('host') as string,
          port: parseInt(formData.get('port') as string),
          username: formData.get('username') as string,
          auth_type: formData.get('auth_type') as string,
        };

        // Only include password if provided
        const password = formData.get('password') as string;
        if (password) {
          updates.password = password;
        }

        await serverApi.update(editingServer.id, updates);
      } else {
        await serverApi.create(formData);
      }

      setShowDialog(false);
      setEditingServer(null);
      setSnackbar({
        open: true,
        message: isEditing ? 'Server updated successfully' : 'Server added successfully',
        severity: 'success',
      });
      loadServers();
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} server:`, error);
      setSnackbar({
        open: true,
        message: `Failed to ${isEditing ? 'update' : 'add'} server`,
        severity: 'error',
      });
    }
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    setShowDialog(true);
  };

  const handleTestConnection = async (serverId: number) => {
    setTestingConnection(serverId);
    try {
      const result = await serverApi.testConnection(serverId);
      setSnackbar({
        open: true,
        message: result.message || (result.success ? 'Connection successful!' : 'Connection failed'),
        severity: result.success ? 'success' : 'error',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to test connection',
        severity: 'error',
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const handleDeleteServerRequest = async (serverId: number) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    setServerToDelete(server);
    setLoadingImpact(true);
    setDeleteDialogOpen(true);

    try {
      const impact = await serverApi.getDeletionImpact(serverId);
      setDeletionImpact(impact);
    } catch (error) {
      console.error('Error loading deletion impact:', error);
      setDeletionImpact({ backup_profiles: 0, backup_runs: 0, backup_files: 0, total_size_bytes: 0 });
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!serverToDelete) return;

    setDeleting(true);
    try {
      await serverApi.delete(serverToDelete.id);
      setSnackbar({
        open: true,
        message: 'Server deleted successfully',
        severity: 'success',
      });
      loadServers();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete server',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setServerToDelete(null);
      setDeletionImpact(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setServerToDelete(null);
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
        label: `Delete ${deletionImpact.backup_profiles} backup profile${deletionImpact.backup_profiles !== 1 ? 's' : ''}`,
        details: 'Including all associated commands and file rules',
      });
    }

    if (deletionImpact.backup_runs > 0) {
      actions.push({
        type: 'delete',
        label: `Delete ${deletionImpact.backup_runs} backup run${deletionImpact.backup_runs !== 1 ? 's' : ''}`,
        details: 'Including all logs and metadata',
      });
    }

    if (deletionImpact.backup_files > 0) {
      actions.push({
        type: 'delete',
        label: `Delete ${deletionImpact.backup_files} backup file${deletionImpact.backup_files !== 1 ? 's' : ''} from disk`,
        details: `Total size: ${formatSize(deletionImpact.total_size_bytes)}`,
      });
    }

    actions.push({
      type: 'delete',
      label: `Delete server "${serverToDelete?.name}"`,
    });

    return actions;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box data-testid="servers-page">
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Typography variant="h5" component="h3" data-testid="servers-title">
          Servers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowDialog(true)}
          data-testid="add-server-btn"
          fullWidth
          sx={{ maxWidth: { sm: 'fit-content' } }}
        >
          Add Server
        </Button>
      </Box>

      <ServerDialog
        open={showDialog}
        onClose={() => {
          setShowDialog(false);
          setEditingServer(null);
        }}
        onSubmit={handleSubmit}
        server={editingServer || undefined}
      />

      <ServerList
        servers={servers}
        testingConnection={testingConnection}
        onTestConnection={handleTestConnection}
        onDeleteServer={handleDeleteServerRequest}
        onEditServer={handleEditServer}
      />

      <DestructiveActionDialog
        open={deleteDialogOpen}
        title={`Delete Server "${serverToDelete?.name || ''}"`}
        description="Are you sure you want to delete this server? This will permanently delete all associated backup data."
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
        confirmText="Delete Server"
        loading={deleting || loadingImpact}
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

export default Servers;
