import { Add as AddIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { storageLocationApi } from '../api';
import { StorageLocationDialog, StorageLocationList } from '../components/storage-locations';
import type { StorageLocation } from '../types';

function StorageLocations() {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);

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
        await storageLocationApi.update(editingLocation.id, data);
        setEditingLocation(null);
      } else {
        await storageLocationApi.create(data);
      }
      setShowForm(false);
      loadLocations();
    } catch (error) {
      console.error('Error saving storage location:', error);
    }
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this storage location?')) return;

    try {
      await storageLocationApi.delete(id);
      loadLocations();
    } catch (error) {
      console.error('Error deleting storage location:', error);
    }
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
          Storage Locations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
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

          <StorageLocationList locations={locations} onDelete={handleDelete} onEdit={handleEdit} />
        </CardContent>
      </Card>
    </Box>
  );
}

export default StorageLocations;
