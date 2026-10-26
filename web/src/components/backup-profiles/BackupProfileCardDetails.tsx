import {
  Box,
  Button,
  Collapse,
  Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useState } from 'react';
import type { BackupProfile } from '../../types';
import ConfigureProfileDialog from './ConfigureProfileDialog';
import { defaultProfileConfigurationYAML } from './default-profile-configuration';
import YamlProfileEditor from './YamlProfileEditor';

interface BackupProfileCardDetailsProps {
  profile: BackupProfile;
  onRefresh?: () => void;
}

function BackupProfileCardDetails({ profile, onRefresh }: BackupProfileCardDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);

  return (
    <Box>
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
          {expanded ? 'Hide' : 'Show'} YAML Configuration
        </Typography>
      </Button>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box mt={3}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Define commands and remote file paths in one versioned YAML document.
          </Typography>
          <YamlProfileEditor
            value={profile.configuration_yaml || defaultProfileConfigurationYAML}
            onChange={() => undefined}
            readOnly
            height="300px"
          />
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setConfigureOpen(true)}>
            Edit YAML configuration
          </Button>
        </Box>
      </Collapse>
      <ConfigureProfileDialog
        open={configureOpen}
        profileId={profile.id}
        onClose={() => {
          setConfigureOpen(false);
          onRefresh?.();
        }}
      />
    </Box>
  );
}

export default BackupProfileCardDetails;
