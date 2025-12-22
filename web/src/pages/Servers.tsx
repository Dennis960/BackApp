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
import { ServerDialog, ServerList } from '../components/servers';
import type { Server } from '../types';

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

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const data = await serverApi.list();
      setServers(data || []);
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

  const handleDeleteServer = async (serverId: number) => {
    try {
      await serverApi.delete(serverId);
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
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h3" data-testid="servers-title">
          Servers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowDialog(true)}
          data-testid="add-server-btn"
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
        onDeleteServer={handleDeleteServer}
        onEditServer={handleEditServer}
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

export default Servers;
