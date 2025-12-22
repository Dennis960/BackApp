import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { BackupProfile } from '../../types';
import BackupProfileInfoGrid from './BackupProfileInfoGrid';

interface BackupProfileCardHeaderProps {
  profile: BackupProfile;
  isEditingName: boolean;
  editedName: string;
  enabled: boolean;
  onNameClick: () => void;
  onNameSave: () => void;
  onNameChange: (value: string) => void;
  onNameKeyDown: (e: React.KeyboardEvent) => void;
  onToggleEnabled: (checked: boolean) => void;
}

function BackupProfileCardHeader({
  profile,
  isEditingName,
  editedName,
  enabled,
  onNameClick,
  onNameSave,
  onNameChange,
  onNameKeyDown,
  onToggleEnabled,
}: BackupProfileCardHeaderProps) {
  return (
    <Box flex={1}>
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        {isEditingName ? (
          <TextField
            value={editedName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameSave}
            onKeyDown={onNameKeyDown}
            autoFocus
            variant="outlined"
            size="medium"
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '1.5rem',
                fontWeight: 600,
                py: 0.5,
              },
            }}
          />
        ) : (
          <Tooltip title="Click to edit name">
            <Typography
              variant="h5"
              component="h3"
              fontWeight={600}
              onClick={onNameClick}
              sx={{
                cursor: 'text',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  borderRadius: 1,
                  px: 1,
                  mx: -1,
                },
              }}
            >
              {profile.name}
            </Typography>
          </Tooltip>
        )}
        <FormControlLabel
          control={(
            <Checkbox
              checked={enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              color="success"
            />
          )}
          label={enabled ? 'Enabled' : 'Disabled'}
        />
      </Box>

      {/* Info Grid */}
      <BackupProfileInfoGrid profile={profile} />
    </Box>
  );
}

export default BackupProfileCardHeader;
