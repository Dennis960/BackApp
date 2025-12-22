import { Add as AddIcon } from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { fileRuleApi } from '../../api';
import type { FileRule } from '../../types';
import AddFileRuleForm from '../forms/AddFileRuleForm';
import FileRuleItem from './FileRuleItem';

interface FileRulesDisplayProps {
  fileRules: FileRule[];
  profileId?: number;
  serverId?: number;
  onFileRulesChanged?: () => void;
  showAddFormExternally?: boolean;
  onCancelAdd?: () => void;
}

function FileRulesDisplay({ fileRules, profileId, serverId, onFileRulesChanged, showAddFormExternally, onCancelAdd }: FileRulesDisplayProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    remote_path: '',
    recursive: true,
    exclude_pattern: '',
  });

  const isExternalAdd = Boolean(showAddFormExternally);
  const showAdd = isExternalAdd || showAddForm;

  const handleAddRule = async () => {
    if (!formData.remote_path.trim() || !profileId) return;
    try {
      await fileRuleApi.create(profileId, {
        remote_path: formData.remote_path.trim(),
        recursive: formData.recursive,
        exclude_pattern: formData.exclude_pattern.trim() || undefined,
      });
      setFormData({
        remote_path: '',
        recursive: true,
        exclude_pattern: '',
      });
      setShowAddForm(false);
      onFileRulesChanged?.();
    } catch (error) {
      console.error('Failed to create file rule:', error);
    }
  };

  return (
    <Stack spacing={1}>
      {fileRules.length === 0 && !showAdd ? (
        <Typography variant="body2" color="text.secondary" fontStyle="italic" mb={1}>
          No file rules configured
        </Typography>
      ) : (
        fileRules.map((rule) => (
          <FileRuleItem
            key={rule.id}
            fileRule={rule}
            profileId={profileId}
            serverId={serverId}
            onFileRuleChanged={onFileRulesChanged}
          />
        ))
      )}

      {profileId && showAdd && (
        <AddFileRuleForm
          formData={formData}
          onFormDataChange={setFormData}
          onAdd={handleAddRule}
          serverId={serverId}
          onCancel={() => {
            if (isExternalAdd) {
              onCancelAdd?.();
            } else {
              setShowAddForm(false);
            }
            setFormData({
              remote_path: '',
              recursive: true,
              exclude_pattern: '',
            });
          }}
        />
      )}
      {profileId && !showAdd && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowAddForm(true)}
          sx={{ mt: 1 }}
        >
          Add File Rule
        </Button>
      )}
    </Stack>
  );
}

export default FileRulesDisplay;
