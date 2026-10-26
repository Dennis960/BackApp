import { Close as CloseIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { backupProfileApi, namingRuleApi, serverApi, storageLocationApi } from '../../api';
import { stringify } from 'yaml';
import { getTemplateById } from '../../templates';
import type { Template, TemplateInput, TemplateStep, TemplateValues, UntypedTemplateContext } from '../../templates/types';
import type { NamingRule, Server, StorageLocation } from '../../types';
import PathPickerField from '../common/PathPickerField';
import { CronTextField, NamingRuleSelector, StorageLocationSelector } from '../forms';

interface GenericTemplateWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  templateId: string;
}

export default function GenericTemplateWizard({ open, onClose, onSuccess, templateId }: GenericTemplateWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [servers, setServers] = useState<Server[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [namingRules, setNamingRules] = useState<NamingRule[]>([]);

  const [selectedServer, setSelectedServer] = useState<Server | null>(null);

  // Collected variables across steps: { stepId: { inputId: value } }
  const [values, setValues] = useState<TemplateValues>({});
  const [touched, setTouched] = useState<Record<string, Record<string, boolean>>>({});

  // Get the template from the registry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const template: Template<any> | undefined = useMemo(() => getTemplateById(templateId), [templateId]);

  // Step IDs: server selection first, then template steps
  const stepIds = useMemo(() => {
    if (!template) return ['__server__'];
    return ['__server__', ...template.steps.map((s: TemplateStep) => s.id)];
  }, [template]);

  const stepLabels = useMemo(() => {
    if (!template) return ['Server'];
    return ['Server', ...template.steps.map((s: TemplateStep) => s.title)];
  }, [template]);

  useEffect(() => {
    if (open) {
      loadRefs();
      // Reset state
      setActiveStep(0);
      setValues({});
      setTouched({});
      setSelectedServer(null);
      setError(null);
    }
  }, [open, templateId]);

  const loadRefs = async () => {
    try {
      const [serversData, storageData, namingData] = await Promise.all([
        serverApi.list(),
        storageLocationApi.list(),
        namingRuleApi.list(),
      ]);
      setServers(serversData || []);
      setStorageLocations(storageData || []);
      setNamingRules(namingData || []);
    } catch (e) {
      console.error('Failed to load refs', e);
    }
  };

  const setValue = (stepId: string, inputId: string, value: any) => {
    setValues((v) => ({
      ...v,
      [stepId]: {
        ...(v[stepId] || {}),
        [inputId]: value,
      },
    }));
    setTouched((t) => ({
      ...t,
      [stepId]: {
        ...(t[stepId] || {}),
        [inputId]: true,
      },
    }));
  };

  const isTouched = (stepId: string, inputId: string) => !!touched?.[stepId]?.[inputId];

  const currentStepId = stepIds[activeStep];
  const currentTemplateStep = template?.steps.find((s: TemplateStep) => s.id === currentStepId);

  // Build values with defaults applied
  const buildValues = (): Record<string, Record<string, any>> => {
    if (!template) return values;

    const result = { ...values };

    // Apply static defaults from input configs
    for (const step of template.steps) {
      if (!result[step.id]) result[step.id] = {};
      for (const input of step.inputs) {
        const cfg = input.config;
        const existing = result[step.id]?.[input.id];
        const touchedHere = isTouched(step.id, input.id);
        const hasExisting = existing !== undefined && existing !== null && existing !== '';

        if (!touchedHere && !hasExisting && 'default' in cfg && cfg.default !== undefined) {
          result[step.id][input.id] = cfg.default;
        }
      }
    }

    return result;
  };

  const isRequiredMissing = (cfg: TemplateInput, value: any) => {
    if (!cfg.required) return false;
    if (cfg.type === 'number' || cfg.type === 'storage_location' || cfg.type === 'naming_rule') {
      return value === '' || value === undefined || value === null || Number.isNaN(Number(value));
    }
    return value === undefined || value === null || String(value).trim() === '';
  };

  const canNext = () => {
    if (!template || !currentStepId) return false;
    if (currentStepId === '__server__') {
      return !!selectedServer;
    }
    if (!currentTemplateStep) return false;
    const allValues = buildValues();
    for (const input of currentTemplateStep.inputs) {
      const value = allValues?.[currentStepId]?.[input.id];
      if (isRequiredMissing(input.config, value)) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!template || !selectedServer) {
      setError('Please select a server');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const allValues = buildValues();

      // Build result using the template's callback
      const ctx: UntypedTemplateContext = {
        server: selectedServer,
        values: allValues,
        storageLocations,
        namingRules,
      };
      const result = template.buildResult(ctx);

      const beforeBackup = result.commands.filter((command) => command.run_stage === 'pre').map((command) => ({
        command: command.command,
        ...(command.working_directory ? { working_directory: command.working_directory } : {}),
      }));
      const afterBackup = result.commands.filter((command) => command.run_stage === 'post').map((command) => ({
        command: command.command,
        ...(command.working_directory ? { working_directory: command.working_directory } : {}),
      }));
      const transfers = result.fileRules.map((rule) => ({
        source: rule.remote_path,
        recursive: rule.recursive ?? false,
        ...(rule.exclude_pattern ? { exclude: rule.exclude_pattern.split(',').map((pattern) => pattern.trim()).filter(Boolean) } : {}),
      }));
      await backupProfileApi.create({
        ...result.profile,
        configuration_yaml: stringify({ schema_version: 1, before_backup: beforeBackup, after_backup: afterBackup, transfers }),
      });

      onSuccess();
      onClose();
    } catch (e) {
      console.error('Template execution failed', e);
      setError('Failed to create backup profile from template');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (stepId: string, inputId: string, inputCfg: TemplateInput) => {
    const allValues = buildValues();
    const value = allValues?.[stepId]?.[inputId];
    const helperText = inputCfg.helperText || inputCfg.description;

    if (inputCfg.type === 'path') {
      const serverId = inputCfg.pathLocation === 'remote' ? selectedServer?.id : undefined;
      return (
        <PathPickerField
          label={inputCfg.title}
          title={inputCfg.title}
          value={value || ''}
          onChange={(v) => setValue(stepId, inputId, v)}
          placeholder={inputCfg.placeholder}
          helperText={helperText}
          serverId={inputCfg.pathLocation === 'remote' ? serverId : undefined}
          allowDirectories={inputCfg.directories ?? true}
        />
      );
    }

    if (inputCfg.type === 'storage_location') {
      return (
        <StorageLocationSelector
          value={value ?? ''}
          onChange={(v) => setValue(stepId, inputId, v)}
          storageLocations={storageLocations}
          required={!!inputCfg.required}
          label={inputCfg.title}
          placeholder={inputCfg.placeholder}
          helperText={helperText}
          showPath
        />
      );
    }

    if (inputCfg.type === 'naming_rule') {
      return (
        <NamingRuleSelector
          value={value ?? ''}
          onChange={(v) => setValue(stepId, inputId, v)}
          namingRules={namingRules}
          required={!!inputCfg.required}
          label={inputCfg.title}
          placeholder={inputCfg.placeholder}
          helperText={helperText}
          showPattern
          showPreview
        />
      );
    }

    if (inputCfg.type === 'cron') {
      return (
        <CronTextField
          value={value || ''}
          onChange={(v) => setValue(stepId, inputId, v)}
          required={!!inputCfg.required}
          label={inputCfg.title}
          placeholder={inputCfg.placeholder}
          helperText={helperText}
        />
      );
    }

    if (inputCfg.type === 'password') {
      return (
        <TextField
          key={`${stepId}.${inputId}`}
          label={inputCfg.title}
          type="password"
          required={!!inputCfg.required}
          value={value ?? ''}
          placeholder={inputCfg.placeholder}
          helperText={helperText}
          onChange={(e) => setValue(stepId, inputId, e.target.value)}
          fullWidth
        />
      );
    }

    if (inputCfg.type === 'number') {
      return (
        <TextField
          key={`${stepId}.${inputId}`}
          label={inputCfg.title}
          type="number"
          required={!!inputCfg.required}
          value={value ?? ''}
          placeholder={inputCfg.placeholder}
          helperText={helperText}
          onChange={(e) => {
            const raw = e.target.value;
            setValue(stepId, inputId, raw === '' ? '' : Number(raw));
          }}
          fullWidth
        />
      );
    }

    // Default: string input
    return (
      <TextField
        key={`${stepId}.${inputId}`}
        label={inputCfg.title}
        type="text"
        required={!!inputCfg.required}
        value={value ?? ''}
        placeholder={inputCfg.placeholder}
        helperText={helperText}
        onChange={(e) => setValue(stepId, inputId, e.target.value)}
        fullWidth
      />
    );
  };

  if (!template) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Template Not Found</DialogTitle>
        <DialogContent>
          <Alert severity="error">Template "{templateId}" not found.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {template.name}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
            {stepLabels.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error">{error}</Alert>}

          {currentTemplateStep && (
            <>
              <Box>
                {currentTemplateStep.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {currentTemplateStep.description}
                  </Typography>
                )}
              </Box>

              {currentTemplateStep.inputs.map((input) =>
                renderInput(currentStepId!, input.id, input.config)
              )}
            </>
          )}

          {currentStepId === '__server__' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Select the server this template will be used for.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {servers.map((s) => (
                  <Button
                    key={s.id}
                    variant={selectedServer?.id === s.id ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedServer(s);
                      setActiveStep(activeStep + 1);
                    }}
                    size="small"
                  >
                    {s.name}
                  </Button>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep(activeStep - 1)} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < stepIds.length - 1 && (
          <Button onClick={() => setActiveStep(activeStep + 1)} variant="contained" disabled={!canNext() || loading}>
            Next
          </Button>
        )}
        {activeStep === stepIds.length - 1 && (
          <Button onClick={handleSubmit} variant="contained" disabled={loading || !canNext()}>
            {loading ? <CircularProgress size={24} /> : 'Create Profile'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
