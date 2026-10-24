import { Add as AddIcon } from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { commandApi } from '../../api';
import type { Command, CommandUpdateInput } from '../../types';
import AddCommandForm from '../forms/AddCommandForm';
import CommandItem from './CommandItem';

interface CommandsDisplayProps {
  commands: Command[];
  profileId?: number;
  onCommandsChanged?: () => void;
  onPendingChangesChange?: (changes: Record<number, CommandUpdateInput>) => void;
}

function CommandsDisplay({ commands, profileId, onCommandsChanged, onPendingChangesChange }: CommandsDisplayProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const pendingEdits = useRef<Record<number, CommandUpdateInput>>({});
  const [formData, setFormData] = useState({
    command: '',
    working_directory: '',
    run_stage: 'pre' as 'pre' | 'post',
  });

  useEffect(() => {
    pendingEdits.current = {};
    onPendingChangesChange?.({});
  }, [profileId, onPendingChangesChange]);

  const handleAddCommand = async () => {
    if (!formData.command.trim() || !profileId) return;
    try {
      const stageCommands = commands.filter((c) => c.run_stage === formData.run_stage);
      const maxOrder = stageCommands.length > 0 ? Math.max(...stageCommands.map((c) => c.run_order)) : 0;

      await commandApi.create(profileId, {
        command: formData.command.trim(),
        working_directory: formData.working_directory || undefined,
        run_stage: formData.run_stage,
        run_order: maxOrder + 1,
      });
      setFormData({ command: '', working_directory: '', run_stage: 'pre' });
      setShowAddForm(false);
      onCommandsChanged?.();
    } catch (error) {
      console.error('Failed to create command:', error);
    }
  };

  const sortedCommands = commands.sort((a, b) => {
    if (a.run_stage !== b.run_stage) {
      return a.run_stage === 'pre' ? -1 : 1;
    }
    return a.run_order - b.run_order;
  });

  const updatePendingEdit = (commandId: number, draft: CommandUpdateInput | null) => {
    const next = { ...pendingEdits.current };
    if (draft) {
      next[commandId] = draft;
    } else {
      delete next[commandId];
    }
    pendingEdits.current = next;
    onPendingChangesChange?.(next);
  };

  return (
    <Stack spacing={1}>
      {commands.length === 0 ? (
        <Typography variant="body2" color="text.secondary" fontStyle="italic" mb={1}>
          No commands configured
        </Typography>
      ) : (
        sortedCommands.map((cmd) => {
          const stageCommands = sortedCommands.filter((c) => c.run_stage === cmd.run_stage);
          const currentIndex = stageCommands.findIndex((c) => c.id === cmd.id);
          const isFirst = currentIndex === 0;
          const isLast = currentIndex === stageCommands.length - 1;

          return (
            <CommandItem
              key={cmd.id}
              command={cmd}
              isFirst={isFirst}
              isLast={isLast}
              sortedCommands={sortedCommands}
              profileId={profileId}
              onCommandChanged={onCommandsChanged}
              onDraftChange={(draft) => updatePendingEdit(cmd.id, draft)}
            />
          );
        })
      )}

      {profileId && showAddForm && (
        <AddCommandForm
          formData={formData}
          onFormDataChange={setFormData}
          onAdd={handleAddCommand}
          onCancel={() => {
            setShowAddForm(false);
            setFormData({ command: '', working_directory: '', run_stage: 'pre' });
          }}
        />
      )}
      {profileId && !showAddForm && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowAddForm(true)}
          sx={{ mt: 1 }}
        >
          Add Command
        </Button>
      )}
    </Stack>
  );
}

export default CommandsDisplay;
