import ImportExportIcon from '@mui/icons-material/ImportExport';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { configurationApi, type ConfigurationImportImpact, type ConfigurationImportResult } from '../api';
import DestructiveActionDialog from '../components/common/DestructiveActionDialog';

function Configuration() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfiguration, setPendingConfiguration] = useState<unknown | null>(null);
  const [importImpact, setImportImpact] = useState<ConfigurationImportImpact | null>(null);
  const [importMode, setImportMode] = useState<'overwrite' | 'add'>('overwrite');

  const handleExport = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const blob = await configurationApi.export();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'backapp-configuration.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ severity: 'success', text: 'Configuration exported successfully.' });
    } catch (error) {
      console.error('Failed to export configuration', error);
      setMessage({ severity: 'error', text: 'Failed to export configuration.' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setLoading(true);
      setMessage(null);
      const configuration = JSON.parse(await file.text());
      const impact = await configurationApi.importImpact(configuration, 'overwrite');
      setPendingConfiguration(configuration);
      setImportImpact(impact);
      setImportMode('overwrite');
    } catch (error) {
      console.error('Failed to import configuration', error);
      setMessage({ severity: 'error', text: error instanceof SyntaxError ? 'The selected file is not valid JSON.' : 'Failed to import configuration.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingConfiguration) return;

    try {
      setLoading(true);
      const result = await configurationApi.import(pendingConfiguration, importMode);
      setPendingConfiguration(null);
      setImportImpact(null);
      setImportMode('overwrite');
      setMessage({ severity: 'success', text: formatImportResult(result) });
    } catch (error) {
      console.error('Failed to import configuration', error);
      setMessage({ severity: 'error', text: 'Failed to import configuration.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelImport = () => {
    if (loading) return;
    setPendingConfiguration(null);
    setImportImpact(null);
    setImportMode('overwrite');
  };

  const handleImportModeChange = async (mode: 'overwrite' | 'add') => {
    if (!pendingConfiguration || mode === importMode) return;
    try {
      setLoading(true);
      const impact = await configurationApi.importImpact(pendingConfiguration, mode);
      setImportMode(mode);
      setImportImpact(impact);
    } catch (error) {
      console.error('Failed to calculate configuration import impact', error);
      setMessage({ severity: 'error', text: 'Failed to calculate import impact.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" fontWeight={700} mb={3}>
        Configuration Import & Export
      </Typography>

      {message && <Alert severity={message.severity} sx={{ mb: 3 }}>{message.text}</Alert>}

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <ImportExportIcon color="primary" />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Export configuration
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Download servers, SSH credentials, storage locations, naming rules, backup profiles,
                  commands, and file rules as a portable JSON file.
                </Typography>
                <Alert severity="warning">
                  The export contains passwords and private keys. Store it securely and delete it when it is no longer needed.
                </Alert>
                <Button
                  variant="contained"
                  startIcon={<ImportExportIcon />}
                  onClick={handleExport}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  Export configuration
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <UploadFileIcon color="primary" />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Import configuration
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Import a BackApp configuration JSON file. Overwrite deletes all current
                  configuration and replaces it with the imported configuration. Add keeps the
                  current configuration and adds the imported resources; only conflicting names
                  are changed.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={loading}
                >
                  Select configuration file
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="application/json,.json"
                    onChange={handleImportFile}
                  />
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {importImpact && (
        <DestructiveActionDialog
          open={Boolean(pendingConfiguration)}
          title="Import configuration?"
          description={importMode === 'overwrite'
            ? 'All current configuration, backup runs, and backup files shown below will be deleted and replaced with the imported configuration.'
            : 'The imported resources will be added to the existing configuration. Names are changed only when an imported name conflicts with an existing resource.'}
          actionType={importMode === 'overwrite' ? 'delete' : 'move'}
          impact={{
            servers: importImpact.servers,
            storageLocations: importImpact.storage_locations,
            namingRules: importImpact.naming_rules,
            backupProfiles: importImpact.backup_profiles,
            backupRuns: importImpact.backup_runs,
            backupFiles: importImpact.backup_files,
            totalSizeBytes: importImpact.total_size_bytes,
            filePaths: importImpact.file_paths,
          }}
          actions={[
            {
              type: importMode === 'overwrite' ? 'delete' : 'move',
              label: importMode === 'overwrite' ? 'Delete current configuration and import' : 'Add imported configuration',
              details: importMode === 'overwrite'
                ? 'All existing configuration, backup runs, and backup files will be deleted.'
                : 'Existing resources remain unchanged. Only imported resources with conflicting names will be renamed.',
            },
          ]}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
          confirmText="Import configuration"
          loading={loading}
        >
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Import mode
            </Typography>
            <RadioGroup
              value={importMode}
              onChange={(event) => {
                void handleImportModeChange(event.target.value as 'overwrite' | 'add');
              }}
            >
              <FormControlLabel
                value="overwrite"
                control={<Radio />}
                label="Overwrite all current configuration"
              />
              <FormControlLabel
                value="add"
                control={<Radio />}
                label="Add to current configuration"
              />
            </RadioGroup>
          </FormControl>
        </DestructiveActionDialog>
      )}
    </Box>
  );
}

function formatImportResult(result: ConfigurationImportResult): string {
  return `Configuration imported: ${result.servers} server(s), ${result.storage_locations} storage location(s), ${result.naming_rules} naming rule(s), and ${result.profiles} profile(s).`;
}

export default Configuration;
