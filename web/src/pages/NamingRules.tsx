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
import { namingRuleApi } from '../api';
import { NamingRuleDialog, NamingRuleList, PlaceholderInfo } from '../components/naming-rules';
import type { NamingRule } from '../types';

function NamingRules() {
  const [rules, setRules] = useState<NamingRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<NamingRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await namingRuleApi.list();
      setRules(data || []);
    } catch (error) {
      console.error('Error loading naming rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      pattern: formData.get('pattern') as string,
    };

    try {
      if (editingRule) {
        await namingRuleApi.update(editingRule.id, data);
        setEditingRule(null);
      } else {
        await namingRuleApi.create(data);
      }
      setShowForm(false);
      loadRules();
    } catch (error) {
      console.error('Error saving naming rule:', error);
    }
  };

  const handleEdit = (rule: NamingRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setShowForm(false);
  };

  const handleAddNew = () => {
    setEditingRule(null);
    setShowForm(!showForm);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this naming rule?')) return;

    try {
      await namingRuleApi.delete(id);
      loadRules();
    } catch (error) {
      console.error('Error deleting naming rule:', error);
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
          Naming Rules
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add Rule
        </Button>
      </Box>

      <PlaceholderInfo />

      <Card>
        <CardContent>
          {showForm && (
            <NamingRuleDialog
              onSubmit={handleSubmit}
              onCancel={handleCancelEdit}
              initialData={editingRule || undefined}
            />
          )}

          <NamingRuleList rules={rules} onDelete={handleDelete} onEdit={handleEdit} />
        </CardContent>
      </Card>
    </Box>
  );
}

export default NamingRules;
