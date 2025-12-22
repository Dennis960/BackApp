import {
  Box,
  Button,
  Collapse,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useState } from 'react';
import type { BackupProfile } from '../../types';
import CommandsDisplay from './CommandsDisplay';
import FileRulesDisplay from './FileRulesDisplay';

interface BackupProfileCardDetailsProps {
  profile: BackupProfile;
  onRefresh?: () => void;
}

function BackupProfileCardDetails({ profile, onRefresh }: BackupProfileCardDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
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
                serverId={profile.server_id}
                onFileRulesChanged={() => {
                  onRefresh?.();
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
}

export default BackupProfileCardDetails;
