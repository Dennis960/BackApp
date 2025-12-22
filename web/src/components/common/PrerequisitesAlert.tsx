import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface PrerequisitesAlertProps {
  storageLocationsCount: number;
  namingRulesCount: number;
}

export function PrerequisitesAlert({ storageLocationsCount, namingRulesCount }: PrerequisitesAlertProps) {
  const navigate = useNavigate();

  if (storageLocationsCount > 0 && namingRulesCount > 0) {
    return null;
  }

  return (
    <>
      {storageLocationsCount === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>No Storage Locations</AlertTitle>
          You need to create at least one storage location to backup profiles or data.
          <Box mt={2}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/storage-locations')}
            >
              Go to Storage Locations
            </Button>
          </Box>
        </Alert>
      )}

      {namingRulesCount === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>No Naming Rules</AlertTitle>
          You need to create at least one naming rule to organize your backups.
          <Box mt={2}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/naming-rules')}
            >
              Go to Naming Rules
            </Button>
          </Box>
        </Alert>
      )}
    </>
  );
}
