import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import type { BackupProfile } from '../../types';
import BackupProfileCard from './BackupProfileCard';

interface BackupProfileListProps {
  profiles: BackupProfile[];
  onRefresh?: () => void;
}

function BackupProfileList({ profiles, onRefresh }: BackupProfileListProps) {
  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={12}>
            <Typography variant="h1" sx={{ opacity: 0.5, mb: 2 }}>
              📋
            </Typography>
            <Typography variant="h6" gutterBottom>
              No backup profiles yet
            </Typography>
            <Typography color="text.secondary">
              Create a backup profile to get started
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {profiles.map((profile) => (
            <BackupProfileCard
              key={profile.id}
              profile={profile}
              onRefresh={onRefresh}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default BackupProfileList;
