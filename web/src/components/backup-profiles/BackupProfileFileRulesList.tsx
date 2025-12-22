import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { fileRuleApi } from '../../api';
import type { FileRule } from '../../types';
import FileRulesDisplay from './FileRulesDisplay';

interface BackupProfileFileRulesListProps {
  profileId: number;
  serverId?: number;
}

function BackupProfileFileRulesList({
  profileId,
  serverId,
}: BackupProfileFileRulesListProps) {
  const [fileRules, setFileRules] = useState<FileRule[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    loadFileRules();
  }, [profileId]);

  const loadFileRules = async () => {
    setLoading(true);
    try {
      const data = await fileRuleApi.listByProfile(profileId);
      setFileRules(data || []);
    } catch (error) {
      console.error('Error loading file rules:', error);
      setFileRules([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          File Rules ({fileRules.length})
        </Typography>
      </Box>

      {!loading && (
        <FileRulesDisplay
          fileRules={fileRules || []}
          profileId={profileId}
          serverId={serverId}
          onFileRulesChanged={loadFileRules}
        />
      )}
    </Box>
  );
}

export default BackupProfileFileRulesList;
