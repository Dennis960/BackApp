import {
  Delete,
  Edit,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  PlayArrow
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Grid,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backupProfileApi } from '../../api';
import type { BackupProfile } from '../../types';
import BackupProfileInfoGrid from './BackupProfileInfoGrid';
import CommandsDisplay from './CommandsDisplay';
import BackupProfileFileRulesList from './BackupProfileFileRulesList';
import FileRulesDisplay from './FileRulesDisplay';

interface BackupProfileCardProps {
  profile: BackupProfile;
  onExecute: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (profile: BackupProfile) => void;
  onRefresh?: () => void;
}

function BackupProfileCard({ profile, onExecute, onDelete, onEdit, onRefresh }: BackupProfileCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile.name);

  const handleNameClick = () => {
    setIsEditingName(true);
    setEditedName(profile.name);
  };

  const handleNameSave = async () => {
    if (editedName.trim() && editedName !== profile.name) {
      try {
        await backupProfileApi.update(profile.id, {
          name: editedName.trim(),
          server_id: profile.server_id,
          storage_location_id: profile.storage_location_id,
          naming_rule_id: profile.naming_rule_id,
          schedule_cron: profile.schedule_cron,
          enabled: profile.enabled,
        });
        profile.name = editedName.trim(); // Update local state
      } catch (error) {
        console.error('Failed to update profile name:', error);
        setEditedName(profile.name); // Revert on error
      }
    } else {
      setEditedName(profile.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(profile.name);
      setIsEditingName(false);
    }
  };



  return (
    <Card variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={3} mb={2}>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              {isEditingName ? (
                <TextField
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
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
                <Typography
                  variant="h5"
                  component="h3"
                  fontWeight={600}
                  onClick={handleNameClick}
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
              )}
              <Chip
                label={profile.enabled ? 'Enabled' : 'Disabled'}
                color={profile.enabled ? 'success' : 'default'}
                size="medium"
              />
            </Box>

            {/* Info Grid */}
            <BackupProfileInfoGrid profile={profile} />
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Tooltip title="Execute Backup Now">
              <span>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrow />}
                  onClick={() => onExecute(profile.id)}
                  disabled={!profile.enabled}
                  sx={{ minWidth: 100 }}
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
                onClick={() => navigate(`/backup-profiles/${profile.id}`)}
              >
                Details
              </Button>
            </Tooltip>
            <Tooltip title="Edit Profile">
              <Button
                variant="outlined"
                size="large"
                startIcon={<Edit />}
                onClick={() => onEdit(profile)}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip title="Delete Profile">
              <Button
                variant="outlined"
                size="large"
                color="error"
                startIcon={<Delete />}
                onClick={() => onDelete(profile.id)}
              >
                Delete
              </Button>
            </Tooltip>
          </Stack>
        </Box>

        {/* Expandable Details Section */}
        <Box>
          <Divider sx={{ my: 2 }} />
          <Button
            fullWidth
            onClick={() => setExpanded(!expanded)}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              />
            }
            sx={{ textTransform: 'none', py: 1 }}
          >
            <Typography variant="body2" fontWeight={500}>
              {expanded ? 'Hide' : 'Show'} Commands & File Rules
            </Typography>
          </Button>

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box mt={3}>
              <Grid container spacing={3}>
                {/* Commands Section */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Commands ({(profile.commands || []).length})
                  </Typography>
                  <CommandsDisplay
                    commands={profile.commands || []}
                    profileId={profile.id}
                    onCommandsChanged={() => {
                      onRefresh?.();
                    }}
                  />
                </Grid>

                {/* File Rules Section */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    File Rules ({(profile.file_rules || []).length})
                  </Typography>
                  <FileRulesDisplay
                    fileRules={profile.file_rules || []}
                    profileId={profile.id}
                    onFileRulesChanged={() => {
                      onRefresh?.();
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
}

export default BackupProfileCard;
