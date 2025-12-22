import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import type { Command } from '../../types';

type SortableCommandRowProps = {
  cmd: Command;
  editingId: number | null;
  editData: Command | null;
  startEditing: (cmd: Command) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  handleDeleteCommand: (id: number) => void;
  handleEditKeyDown: (e: React.KeyboardEvent) => void;
  handleEditFieldChange: (field: 'command' | 'run_stage', value: string) => void;
};

function SortableCommandRow({
  cmd,
  editingId,
  editData,
  startEditing,
  handleSaveEdit,
  handleCancelEdit,
  handleDeleteCommand,
  handleEditKeyDown,
  handleEditFieldChange,
}: SortableCommandRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cmd.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <Card ref={setNodeRef} style={style} variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
        {editingId === cmd.id && editData ? (
          <>
            <Box flex={1} display="flex" flexDirection="column" gap={1}>
              <TextField
                fullWidth
                size="small"
                label="Command"
                value={editData.command}
                onChange={(e) => handleEditFieldChange('command', e.target.value)}
                onKeyDown={handleEditKeyDown}
              />
              <Box display="flex" gap={1}>
                <TextField
                  select
                  label="Stage"
                  value={editData.run_stage}
                  onChange={(e) => handleEditFieldChange('run_stage', e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  size="small"
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value="pre">Pre-backup</MenuItem>
                  <MenuItem value="post">Post-backup</MenuItem>
                </TextField>
              </Box>
            </Box>
            <Box display="flex" gap={0.5}>
              <IconButton size="small" onClick={handleSaveEdit} color="success" title="Save">
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleCancelEdit} color="default" title="Cancel">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </>
        ) : (
          <>
            <Box
              flex={1}
              onClick={() => startEditing(cmd)}
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Box {...attributes} {...listeners} sx={{ display: 'flex', alignItems: 'center' }}>
                <DragIndicatorIcon fontSize="small" color="action" />
              </Box>
              <Typography variant="body2" fontWeight="bold">
                [{cmd.run_stage}]
              </Typography>
              <Typography
                variant="body2"
                fontFamily="monospace"
                fontSize="0.8rem"
                sx={{ wordBreak: 'break-all' }}
              >
                {cmd.command}
              </Typography>
            </Box>
            <Box display="flex" gap={0.5}>
              <IconButton size="small" onClick={() => startEditing(cmd)} color="primary" title="Edit">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleDeleteCommand(cmd.id)}
                color="error"
                title="Delete"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SortableCommandRow;
