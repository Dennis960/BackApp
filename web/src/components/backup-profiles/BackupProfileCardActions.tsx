import {
  ContentCopy,
  Delete,
  Edit,
  History as HistoryIcon,
  PlayArrow
} from '@mui/icons-material';
import {
  Button,
  Stack,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface BackupProfileCardActionsProps {
  profileId: number;
  onExecute: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function BackupProfileCardActions({
  profileId,
  onExecute,
  onEdit,
  onDuplicate,
  onDelete,
}: BackupProfileCardActionsProps) {
  const navigate = useNavigate();

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
      <Tooltip title="Execute Backup Now">
        <span>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={onExecute}
            fullWidth
            sx={{ minWidth: { sm: 100 } }}
          >
            Run
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="View files and runs">
        <Button
          variant="outlined"
          size="large"
          startIcon={<HistoryIcon />}
          onClick={() => navigate(`/backup-profiles/${profileId}`)}
          fullWidth
        >
          Details
        </Button>
      </Tooltip>
      <Tooltip title="Edit Profile">
        <Button
          variant="outlined"
          size="large"
          startIcon={<Edit />}
          onClick={onEdit}
          fullWidth
        >
          Edit
        </Button>
      </Tooltip>
      <Tooltip title="Duplicate Profile">
        <Button
          variant="outlined"
          size="large"
          startIcon={<ContentCopy />}
          onClick={onDuplicate}
          fullWidth
        >
          Duplicate
        </Button>
      </Tooltip>
      <Tooltip title="Delete Profile">
        <Button
          variant="outlined"
          size="large"
          color="error"
          startIcon={<Delete />}
          onClick={onDelete}
          fullWidth
        >
          Delete
        </Button>
      </Tooltip>
    </Stack>
  );
}

export default BackupProfileCardActions;
