import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { commandApi } from '../../api';
import type { Command, CommandUpdateInput } from '../../types';
import CommandsDisplay from './CommandsDisplay';

interface BackupProfileCommandsListProps {
  profileId: number;
  onPendingChangesChange?: (changes: Record<number, CommandUpdateInput>) => void;
}

function BackupProfileCommandsList({
  profileId,
  onPendingChangesChange,
}: BackupProfileCommandsListProps) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommands();
  }, [profileId]);

  const loadCommands = async () => {
    setLoading(true);
    try {
      const data = await commandApi.listByProfile(profileId);
      setCommands(data || []);
    } catch (error) {
      console.error('Error loading commands:', error);
      setCommands([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Commands ({commands.length})
        </Typography>
      </Box>

      {!loading && (
        <CommandsDisplay
          commands={commands || []}
          profileId={profileId}
          onCommandsChanged={loadCommands}
          onPendingChangesChange={onPendingChangesChange}
        />
      )}
    </Box>
  );
}

export default BackupProfileCommandsList;
