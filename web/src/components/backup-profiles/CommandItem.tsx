import { ArrowDownward as ArrowDownIcon, ArrowUpward as ArrowUpIcon, Close as CloseIcon, Delete as DeleteIcon, Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';
import { Box, Chip, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { commandApi } from '../../api';
import type { Command, CommandUpdateInput } from '../../types';

interface CommandItemProps {
  command: Command;
  isFirst: boolean;
  isLast: boolean;
  sortedCommands: Command[];
  profileId?: number;
  onCommandChanged?: () => void;
  onDraftChange?: (draft: CommandUpdateInput | null) => void;
}

function CommandItem({
  command,
  isFirst,
  isLast,
  sortedCommands,
  profileId,
  onCommandChanged,
  onDraftChange,
}: CommandItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCommand, setEditedCommand] = useState('');
  const [editedWorkingDir, setEditedWorkingDir] = useState('');

  const handleEdit = () => {
    setIsEditing(true);
    setEditedCommand(command.command);
    setEditedWorkingDir(command.working_directory || '');
  };

  const handleSave = async () => {
    if (!editedCommand.trim()) return;
    try {
      await commandApi.update(command.id, {
        command: editedCommand.trim(),
        working_directory: editedWorkingDir || undefined,
        run_stage: command.run_stage,
        run_order: command.run_order,
      });
      setIsEditing(false);
      onDraftChange?.(null);
      onCommandChanged?.();
    } catch (error) {
      console.error('Failed to update command:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this command?')) return;
    try {
      await commandApi.delete(command.id);
      onCommandChanged?.();
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  };

  const handleMoveUp = async () => {
    const stageCommands = sortedCommands.filter((c) => c.run_stage === command.run_stage);
    const currentIndex = stageCommands.findIndex((c) => c.id === command.id);

    if (currentIndex <= 0) return;

    const prevCommand = stageCommands[currentIndex - 1];

    try {
      await Promise.all([
        commandApi.update(command.id, {
          command: command.command,
          working_directory: command.working_directory,
          run_stage: command.run_stage,
          run_order: prevCommand.run_order,
        }),
        commandApi.update(prevCommand.id, {
          command: prevCommand.command,
          working_directory: prevCommand.working_directory,
          run_stage: prevCommand.run_stage,
          run_order: command.run_order,
        }),
      ]);
      onCommandChanged?.();
    } catch (error) {
      console.error('Failed to move command up:', error);
    }
  };

  const handleMoveDown = async () => {
    const stageCommands = sortedCommands.filter((c) => c.run_stage === command.run_stage);
    const currentIndex = stageCommands.findIndex((c) => c.id === command.id);

    if (currentIndex >= stageCommands.length - 1) return;

    const nextCommand = stageCommands[currentIndex + 1];

    try {
      await Promise.all([
        commandApi.update(command.id, {
          command: command.command,
          working_directory: command.working_directory,
          run_stage: command.run_stage,
          run_order: nextCommand.run_order,
        }),
        commandApi.update(nextCommand.id, {
          command: nextCommand.command,
          working_directory: nextCommand.working_directory,
          run_stage: nextCommand.run_stage,
          run_order: command.run_order,
        }),
      ]);
      onCommandChanged?.();
    } catch (error) {
      console.error('Failed to move command down:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: isEditing ? 'flex-start' : 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: command.run_stage === 'pre' ? '#1976d2' : '#388e3c',
        backgroundColor: command.run_stage === 'pre' ? '#e3f2fd' : '#e8f5e9',
      }}
    >
      {profileId && !isEditing && (
        <Box display="flex" flexDirection="column" gap={0.25} flexShrink={0}>
          <Tooltip title="Move up">
            <span>
              <IconButton
                size="small"
                onClick={handleMoveUp}
                disabled={isFirst}
                sx={{ p: 0.25 }}
              >
                <ArrowUpIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move down">
            <span>
              <IconButton
                size="small"
                onClick={handleMoveDown}
                disabled={isLast}
                sx={{ p: 0.25 }}
              >
                <ArrowDownIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}
      <Box display="flex" gap={1} alignItems="center" minWidth={100} flexShrink={0}>
        <Chip
          label={command.run_stage.toUpperCase()}
          size="small"
          color={command.run_stage === 'pre' ? 'primary' : 'success'}
          sx={{ fontWeight: 600 }}
        />
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          #{command.run_order}
        </Typography>
      </Box>
      <Box flex={1} minWidth={0}>
        {isEditing ? (
          <Box display="flex" flexDirection="column" gap={1}>
            <TextField
              fullWidth
              size="small"
              label="Working Directory"
              value={editedWorkingDir}
              onChange={(e) => {
                const workingDirectory = e.target.value;
                setEditedWorkingDir(workingDirectory);
                onDraftChange?.({
                  command: editedCommand.trim(),
                  working_directory: workingDirectory || undefined,
                  run_stage: command.run_stage,
                  run_order: command.run_order,
                });
              }}
              placeholder="/"
              variant="outlined"
            />
            <TextField
              fullWidth
              size="small"
              label="Command"
              value={editedCommand}
              multiline
              rows={2}
              variant="outlined"
              onChange={(e) => {
                const nextCommand = e.target.value;
                setEditedCommand(nextCommand);
                onDraftChange?.({
                  command: nextCommand.trim(),
                  working_directory: editedWorkingDir || undefined,
                  run_stage: command.run_stage,
                  run_order: command.run_order,
                });
              }}
            />
          </Box>
        ) : (
          <Box>
            <Typography variant="caption" color="text.secondary">
              working directory: {command.working_directory || '/'}
            </Typography>
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{ wordBreak: 'break-all' }}
            >
              {command.command}
            </Typography>
          </Box>
        )}
      </Box>
      {profileId && (
        <Box display="flex" gap={0.5} flexShrink={0}>
          {isEditing ? (
            <>
              <Tooltip title="Save">
                <IconButton
                  size="small"
                  onClick={handleSave}
                  color="success"
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsEditing(false);
                    onDraftChange?.(null);
                  }}
                  color="default"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={handleEdit}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={handleDelete}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default CommandItem;
