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
import { DestructiveActionDialog, type DestructiveAction } from '../components/common';
import { NamingRuleDialog, NamingRuleList, PlaceholderInfo } from '../components/naming-rules';
import type { DeletionImpact, NamingRule } from '../types';

function NamingRules() {
  const [rules, setRules] = useState<NamingRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<NamingRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<NamingRule | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteRequest = async (id: number) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
    try {
      setDeletionImpact(await namingRuleApi.getDeletionImpact(id));
    } catch (error) {
      console.error('Error loading naming rule deletion impact:', error);
      setDeletionImpact({ backup_profiles: 0, backup_runs: 0, backup_files: 0, total_size_bytes: 0 });
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    setDeleting(true);
    try {
      await namingRuleApi.delete(ruleToDelete.id);
      loadRules();
    } catch (error) {
      console.error('Error deleting naming rule:', error);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      setDeletionImpact(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
    setDeletionImpact(null);
  };

  const getDeleteActions = (): DestructiveAction[] => {
    if (!deletionImpact) return [];
    const actions: DestructiveAction[] = [];
    if (deletionImpact.backup_profiles > 0) {
      actions.push({
        type: 'delete',
        label: `Affects ${deletionImpact.backup_profiles} backup profile${deletionImpact.backup_profiles !== 1 ? 's' : ''}`,
        details: 'Reassign or delete these profiles before deleting this rule',
      });
    }
    actions.push({ type: 'delete', label: `Delete naming rule "${ruleToDelete?.name}"` });
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
          Naming Rules
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          data-testid="add-naming-rule-btn"
          fullWidth
          sx={{ maxWidth: { sm: 'fit-content' } }}
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

          <NamingRuleList rules={rules} onDelete={handleDeleteRequest} onEdit={handleEdit} />
        </CardContent>
      </Card>

      <DestructiveActionDialog
        open={deleteDialogOpen}
        title={`Delete Naming Rule "${ruleToDelete?.name || ''}"`}
        description="This naming rule is used by the following backup data."
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
        confirmText="Delete Naming Rule"
        loading={deleting}
      />
    </Box>
  );
}

export default NamingRules;
